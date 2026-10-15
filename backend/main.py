from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import Optional
import time
import threading
import os

# =========================
# RATE LIMITER FOR ADMIN LOGIN
# =========================

class AdminLoginRateLimiter:
    """
    In-memory rate limiter for admin login attempts.
    
    Uses a composite key (IP + username) to prevent bypass by changing username.
    Thread-safe with per-process in-memory storage.
    Counters reset on process restart.
    
    Configurable via environment variables:
    - ADMIN_LOGIN_MAX_ATTEMPTS: Max failed attempts before lockout (default: 5)
    - ADMIN_LOGIN_COOLDOWN_SECONDS: Cooldown period in seconds (default: 900 = 15 minutes)
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._attempts: dict[str, list[float]] = {}  # key -> list of attempt timestamps
        self._max_attempts = int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5"))
        self._cooldown_seconds = int(os.getenv("ADMIN_LOGIN_COOLDOWN_SECONDS", "900"))
    
    def _get_key(self, ip: str, username: str) -> str:
        """Generate rate limit key from IP and username."""
        return f"{ip}:{username.lower()}"
    
    def _cleanup_old_attempts(self, key: str, current_time: float) -> None:
        """Remove attempts older than cooldown period."""
        if key in self._attempts:
            cutoff = current_time - self._cooldown_seconds
            self._attempts[key] = [t for t in self._attempts[key] if t > cutoff]
            if not self._attempts[key]:
                del self._attempts[key]
    
    def check_rate_limit(self, ip: str, username: str) -> tuple[bool, int]:
        """
        Check if the login attempt is allowed.
        
        Returns:
            (allowed, remaining_attempts): 
                - allowed: True if login attempt is permitted
                - remaining_attempts: Number of attempts remaining before lockout
        """
        key = self._get_key(ip, username)
        current_time = time.time()
        
        with self._lock:
            self._cleanup_old_attempts(key, current_time)
            
            current_attempts = len(self._attempts.get(key, []))
            remaining = max(0, self._max_attempts - current_attempts)
            
            if current_attempts >= self._max_attempts:
                return False, 0
            
            return True, remaining
    
    def record_failed_attempt(self, ip: str, username: str) -> int:
        """
        Record a failed login attempt.
        
        Returns:
            Number of attempts remaining before lockout (0 if locked out).
        """
        key = self._get_key(ip, username)
        current_time = time.time()
        
        with self._lock:
            self._cleanup_old_attempts(key, current_time)
            
            if key not in self._attempts:
                self._attempts[key] = []
            
            self._attempts[key].append(current_time)
            
            current_attempts = len(self._attempts[key])
            remaining = max(0, self._max_attempts - current_attempts)
            
            return remaining
    
    def record_successful_login(self, ip: str, username: str) -> None:
        """Clear failed attempts on successful login."""
        key = self._get_key(ip, username)
        
        with self._lock:
            if key in self._attempts:
                del self._attempts[key]

    def reset_all(self) -> None:
        """Clear all rate limit attempts (for testing)."""
        with self._lock:
            self._attempts.clear()


# Global rate limiter instance
_login_rate_limiter = AdminLoginRateLimiter()


def get_login_rate_limiter() -> AdminLoginRateLimiter:
    """Get the global rate limiter instance."""
    return _login_rate_limiter


# =========================
# APPLICATION SETUP
# =========================

from verification.verification_engine import (
    save_verification_result
)

from verification.fraud_verification_engine import (
    save_transaction_result
)

from services.orchestrator import verify_parallel

from backend.models.policy_model import (
    verify_admin,
    create_token,
    verify_token,
    list_rules,
    get_rule,
    create_rule,
    update_rule,
    delete_rule,
    change_admin_password,
    update_admin_login,
)


app = FastAPI(
    title="Bank AI Verification API",
    description="Loan and Fraud Decision Verification System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# REQUEST MODELS
# =========================

class LoanApplication(BaseModel):
    application_id: str
    applicant_id: str
    income: float
    credit_score: int
    employment_status: str
    existing_debt: float
    monthly_emi: float
    loan_amount: float
    loan_tenure: int
    repayment_history: str


class FraudTransaction(BaseModel):
    transaction_id: str
    customer_id: str
    amount: float
    timestamp: str
    device: str
    location: str
    merchant: str
    location_unusual: bool
    previous_transaction_behaviour: str
    transaction_frequency: int


# =========================
# ADMIN REQUEST MODELS
# =========================

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    password_change_required: bool


class AdminRuleRequest(BaseModel):
    rule_name: str
    rule_description: str
    severity: str
    rule_type: str
    parameters: dict


class AdminRuleUpdateRequest(BaseModel):
    rule_name: Optional[str] = None
    rule_description: Optional[str] = None
    severity: Optional[str] = None
    parameters: Optional[dict] = None
    is_active: Optional[bool] = None


class AdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AdminRuleResponse(BaseModel):
    id: int
    rule_name: str
    rule_description: str
    severity: str
    rule_type: str
    parameters: dict
    is_active: bool
    version: int
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminRulesListResponse(BaseModel):
    rules: list[AdminRuleResponse]


# =========================
# RESPONSE MODELS
# =========================

class VerificationResponse(BaseModel):
    model_config = ConfigDict(extra='allow')

    bank_ai_decision: str
    verification_result: str
    risk_score: int
    risk_level: str
    reasons: list[str]
    recommendation: str


class LoanVerificationResponse(VerificationResponse):
    application_id: str
    applicant_id: str


class FraudVerificationResponse(VerificationResponse):
    transaction_id: str
    customer_id: str


# =========================
# AUTHENTICATION DEPENDENCY
# =========================

def get_admin_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract and verify admin token from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = parts[1]
    admin_info = verify_token(token)
    if not admin_info:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return admin_info


def require_full_access(admin: dict = Depends(get_admin_user)) -> dict:
    """Require admin with no password change restriction."""
    if admin.get("password_change_required", False):
        raise HTTPException(
            status_code=403, 
            detail="Password change required before accessing policy management"
        )
    return admin


# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "message": "Bank AI Verification API is running"
    }


# =========================
# ADMIN AUTHENTICATION
# =========================

@app.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(request: AdminLoginRequest, request_obj: Request):
    """Authenticate admin and return token."""
    # Get client IP for rate limiting
    client_ip = request_obj.client.host if request_obj.client else "unknown"
    
    # Authenticate admin first
    admin = verify_admin(request.username, request.password)
    if not admin:
        # Check rate limit for failed attempts
        rate_limiter = get_login_rate_limiter()
        allowed, remaining = rate_limiter.check_rate_limit(client_ip, request.username)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts. Please try again later."
            )
        
        # Record failed attempt
        rate_limiter.record_failed_attempt(client_ip, request.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Successful login - clear failed attempts
    rate_limiter = get_login_rate_limiter()
    rate_limiter.record_successful_login(client_ip, request.username)
    
    token = create_token(admin["id"], admin["username"], admin.get("password_change_required", False))
    update_admin_login(admin["id"])
    
    return AdminLoginResponse(
        token=token,
        password_change_required=admin.get("password_change_required", False)
    )


@app.post("/admin/change-password")
def admin_change_password(request: AdminChangePasswordRequest, admin: dict = Depends(get_admin_user)):
    """Change admin password."""
    success, message = change_admin_password(admin["admin_id"], request.current_password, request.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message}


# =========================
# ADMIN POLICY MANAGEMENT
# =========================

@app.get("/admin/rules", response_model=AdminRulesListResponse)
def admin_list_rules(rule_type: Optional[str] = None, admin: dict = Depends(require_full_access)):
    """List all policy rules."""
    rules = list_rules(rule_type)
    return AdminRulesListResponse(rules=[AdminRuleResponse(**r) for r in rules])


@app.post("/admin/rules", response_model=AdminRuleResponse)
def admin_create_rule(request: AdminRuleRequest, admin: dict = Depends(require_full_access)):
    """Create a new policy rule."""
    success, message, rule_id = create_rule(
        admin["admin_id"],
        request.rule_name,
        request.rule_description,
        request.severity,
        request.rule_type,
        request.parameters
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    rule = get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=500, detail="Rule created but not retrievable")
    
    return AdminRuleResponse(**rule)


@app.put("/admin/rules/{rule_id}", response_model=AdminRuleResponse)
def admin_update_rule(rule_id: int, request: AdminRuleUpdateRequest, admin: dict = Depends(require_full_access)):
    """Update an existing policy rule."""
    updates = {}
    if request.rule_name is not None:
        updates["rule_name"] = request.rule_name
    if request.rule_description is not None:
        updates["rule_description"] = request.rule_description
    if request.severity is not None:
        updates["severity"] = request.severity
    if request.parameters is not None:
        updates["parameters"] = request.parameters
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    success, message = update_rule(admin["admin_id"], rule_id, updates)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    rule = get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=500, detail="Rule updated but not retrievable")
    
    return AdminRuleResponse(**rule)


@app.delete("/admin/rules/{rule_id}")
def admin_delete_rule(rule_id: int, admin: dict = Depends(require_full_access)):
    """Soft delete a policy rule."""
    success, message = delete_rule(admin["admin_id"], rule_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {"message": message}


# =========================
# LOAN VERIFICATION
# =========================

@app.post(
    "/verify/loan",
    response_model=LoanVerificationResponse
)
def verify_loan(application: LoanApplication):

    application_data = application.model_dump()

    result = verify_parallel(application_data)

    save_verification_result(
        application_data,
        result
    )

    return result


# =========================
# FRAUD VERIFICATION
# =========================

@app.post(
    "/verify/fraud",
    response_model=FraudVerificationResponse
)
def verify_fraud(transaction: FraudTransaction):

    transaction_data = transaction.model_dump()

    result = verify_parallel(transaction_data)

    save_transaction_result(
        transaction_data,
        result
    )

    return result