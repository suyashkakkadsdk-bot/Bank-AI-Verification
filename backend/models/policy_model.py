# backend/models/policy_model.py
"""
Policy Management Model
Handles: verification rules loading, admin authentication, audit logging.
"""
import json
import bcrypt
import secrets
import string
from typing import Dict, List, Optional, Any
from pathlib import Path

from database.connection import get_connection


# ============================================================
# TEST MODE CONFIGURATION
# ============================================================
_TEST_MODE: bool = False


def set_test_mode(enabled: bool) -> None:
    """Enable or disable test mode for database connections.
    
    When enabled, database connections will use TEST_DATABASE_URL
    instead of DATABASE_URL. This must be called before any policy
    functions that access the database.
    """
    global _TEST_MODE
    _TEST_MODE = enabled


def is_test_mode() -> bool:
    return _TEST_MODE


# ============================================================
# GLOBAL POLICY CACHE
# ============================================================
_LOAN_POLICY: Optional[Dict[str, Any]] = None
_FRAUD_POLICY: Optional[Dict[str, Any]] = None
_POLICY_LOAD_ERROR: Optional[Exception] = None


# ============================================================
# POLICY LOADING
# ============================================================

def _get_connection():
    """Get database connection, using test mode if enabled."""
    return get_connection(test=_TEST_MODE)


def load_all_policies() -> tuple[Dict[str, Any], Dict[str, Any], Optional[Exception]]:
    """
    Load all active policies from database.
    Returns (loan_policy, fraud_policy, error).
    """
    global _LOAN_POLICY, _FRAUD_POLICY, _POLICY_LOAD_ERROR
    
    if _LOAN_POLICY is not None and _FRAUD_POLICY is not None:
        return _LOAN_POLICY, _FRAUD_POLICY, None
    
    if _POLICY_LOAD_ERROR is not None:
        return {}, {}, _POLICY_LOAD_ERROR
    
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Load loan policies
        cur.execute("""
            SELECT rule_name, parameters 
            FROM verification_rules 
            WHERE rule_type = 'LOAN' AND is_active = true
        """)
        loan_rules = cur.fetchall()
        
        loan_policy = {}
        for rule_name, params in loan_rules:
            loan_policy[rule_name] = params
        
        # Load fraud policies
        cur.execute("""
            SELECT rule_name, parameters 
            FROM verification_rules 
            WHERE rule_type = 'FRAUD' AND is_active = true
        """)
        fraud_rules = cur.fetchall()
        
        fraud_policy = {}
        for rule_name, params in fraud_rules:
            fraud_policy[rule_name] = params
        
        cur.close()
        conn.close()
        
        _LOAN_POLICY = loan_policy
        _FRAUD_POLICY = fraud_policy
        
        return loan_policy, fraud_policy, None
        
    except Exception as e:
        _POLICY_LOAD_ERROR = e
        return {}, {}, e


def get_loan_policy() -> Dict[str, Any]:
    """Get cached loan policy, loading if necessary."""
    loan, _, err = load_all_policies()
    if err:
        # Return hardcoded defaults on failure
        return _get_default_loan_policy()
    return loan


def get_fraud_policy() -> Dict[str, Any]:
    """Get cached fraud policy, loading if necessary."""
    _, fraud, err = load_all_policies()
    if err:
        return _get_default_fraud_policy()
    return fraud


def reload_policies() -> Optional[Exception]:
    """Force reload policies from database."""
    global _LOAN_POLICY, _FRAUD_POLICY, _POLICY_LOAD_ERROR
    _LOAN_POLICY = None
    _FRAUD_POLICY = None
    _POLICY_LOAD_ERROR = None
    _, _, err = load_all_policies()
    return err


# ============================================================
# HARDCODED DEFAULTS (fallback when DB unavailable)
# ============================================================

def _get_default_loan_policy() -> Dict[str, Any]:
    return {
        "Loan Credit Score Risk": {"credit_score_thresholds": [{"min": 700, "score": 0}, {"min": 650, "max": 699, "score": 20}, {"max": 649, "score": 40}]},
        "Loan Existing Debt Risk": {"existing_debt_thresholds": [{"min": 1, "score": 30}, {"max": 0, "score": 0}]},
        "Loan Income Ratio Risk": {"loan_to_income_thresholds": [{"max": 7, "score": 0}, {"min": 7.01, "max": 10, "score": 15}, {"min": 10.01, "score": 30}]},
        "Loan Independent Decision": {"high_risk_indicators": {"approved_max": 0, "review_max": 2, "rejected_min": 3}},
        "Loan Risk Level": {"risk_levels": [{"max": 30, "level": "LOW"}, {"max": 70, "level": "MEDIUM"}, {"min": 71, "level": "HIGH"}]},
    }


def _get_default_fraud_policy() -> Dict[str, Any]:
    return {
        "Fraud Amount Risk": {"amount_thresholds": [{"min": 50000, "score": 30}, {"min": 20000, "max": 49999, "score": 15}, {"max": 19999, "score": 0}]},
        "Fraud Location Risk": {"location_unusual_score": 20},
        "Fraud Device Risk": {"suspicious_device_prefixes": ["DEV4", "DEV099"], "device_score": 25},
        "Fraud Behaviour Risk": {"abnormal_behaviour_score": 20},
        "Fraud Frequency Risk": {"frequency_threshold": 10, "frequency_score": 15},
        "Fraud Timing Risk": {"unusual_hours_start": 0, "unusual_hours_end": 4, "timing_score": 15},
        "Fraud Independent Decision": {"suspicious_indicators": {"genuine_max": 0, "review_max": 2, "fraud_min": 3}},
        "Fraud Risk Level": {"risk_levels": [{"max": 30, "level": "LOW"}, {"max": 70, "level": "MEDIUM"}, {"min": 71, "level": "HIGH"}]},
    }


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def verify_admin(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Verify admin credentials. Returns admin dict or None."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, username, password_hash, role, is_active, password_change_required
            FROM admins 
            WHERE username = %s AND is_active = true
        """, (username,))
        row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not row:
            print("verify_admin: ADMIN_RECORD_NOT_FOUND_OR_INACTIVE")
            return None
        
        admin_id, username, password_hash, role, is_active, password_change_required = row
        
        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            print("verify_admin: BCRYPT_PASSWORD_MISMATCH")
            return None
        
        return {"id": admin_id, "username": username, "role": role, "password_change_required": password_change_required}
        
    except Exception as e:
        print(f"verify_admin: EXCEPTION_OCCURRED {type(e).__name__}")
        return None


def create_admin(username: str, password: str, role: str = "admin") -> Optional[Dict[str, Any]]:
    """Create new admin user. Returns admin dict or None on failure."""
    try:
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO admins (username, password_hash, role, password_change_required)
            VALUES (%s, %s, %s, true)
            RETURNING id, username, role, created_at
        """, (username, password_hash, role))
        
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if row:
            return {"id": row[0], "username": row[1], "role": row[2], "created_at": row[3]}
        return None
        
    except Exception as e:
        if conn:
            conn.rollback()
        return None


def change_admin_password(admin_id: int, current_password: str, new_password: str) -> tuple[bool, str]:
    """Change admin password. Returns (success, message)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Verify current password
        cur.execute("SELECT password_hash FROM admins WHERE id = %s", (admin_id,))
        row = cur.fetchone()
        
        if not row:
            return False, "Admin not found"
        
        stored_hash = row[0]
        if not bcrypt.checkpw(current_password.encode('utf-8'), stored_hash.encode('utf-8')):
            return False, "Current password is incorrect"
        
        # Hash new password
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("UPDATE admins SET password_hash = %s, password_change_required = false WHERE id = %s", (new_hash, admin_id))
        
        if cur.rowcount == 0:
            return False, "Admin not found"
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'PASSWORD_CHANGE', NULL, %s, %s)
        """, (admin_id, json.dumps({}), json.dumps({})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return True, "Password changed successfully"
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Password change failed: {e}"


def update_admin_login(admin_id: int) -> bool:
    """Update last_login timestamp."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE admins SET last_login = NOW() WHERE id = %s", (admin_id,))
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception:
        return False


def get_admin_by_id(admin_id: int) -> Optional[Dict[str, Any]]:
    """Get admin by ID with fresh role and status check. Returns admin dict or None."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, username, password_hash, role, is_active, password_change_required
            FROM admins 
            WHERE id = %s
        """, (admin_id,))
        row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not row:
            return None
        
        admin_id, username, password_hash, role, is_active, password_change_required = row
        
        if not is_active:
            return None
        
        return {"id": admin_id, "username": username, "role": role, "password_change_required": password_change_required}
        
    except Exception:
        return None


# ============================================================
# EMPLOYEE MANAGEMENT
# ============================================================


def list_employees() -> List[Dict[str, Any]]:
    """List all employee accounts (role='employee')."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, username, role, is_active, password_change_required, created_at, created_by_admin_id, last_login
            FROM admins 
            WHERE role = 'employee'
            ORDER BY id
        """)
        
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        return [
            {
                "id": r[0],
                "username": r[1],
                "role": r[2],
                "is_active": r[3],
                "password_change_required": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "created_by_admin_id": r[6],
                "last_login": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
    except Exception:
        return []


def get_employee_by_id(employee_id: int) -> Optional[Dict[str, Any]]:
    """Get employee by ID. Only returns employees (role='employee')."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, username, password_hash, role, is_active, password_change_required, created_at, created_by_admin_id, last_login
            FROM admins 
            WHERE id = %s AND role = 'employee'
        """, (employee_id,))
        row = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not row:
            return None
        
        emp_id, username, password_hash, role, is_active, password_change_required, created_at, created_by_admin_id, last_login = row
        
        return {
            "id": emp_id,
            "username": username,
            "role": role,
            "is_active": is_active,
            "password_change_required": password_change_required,
            "created_at": created_at.isoformat() if created_at else None,
            "created_by_admin_id": created_by_admin_id,
            "last_login": last_login.isoformat() if last_login else None,
        }
    except Exception:
        return None


def create_employee(admin_id: int, username: str, password: str) -> tuple[bool, str, Optional[Dict[str, Any]]]:
    """Create a new employee account. Returns (success, message, employee_data)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Check if username already exists
        cur.execute("SELECT id FROM admins WHERE username = %s", (username,))
        if cur.fetchone():
            return False, "Username already exists", None
        
        # Generate a secure temporary password
        temp_password = _generate_secure_password()
        password_hash = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            INSERT INTO admins (username, password_hash, role, password_change_required, created_by_admin_id)
            VALUES (%s, %s, 'employee', true, %s)
            RETURNING id, username, role, created_at, created_by_admin_id, last_login
        """, (username, password_hash, admin_id))
        
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return False, "Failed to create employee", None
        
        emp_id, username, role, created_at, created_by_admin_id, last_login = row
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'EMPLOYEE_CREATE', NULL, %s, %s)
        """, (admin_id, json.dumps({}), json.dumps({"username": username, "role": "employee"})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        employee_data = {
            "id": row[0],
            "username": row[1],
            "role": row[2],
            "created_at": row[3].isoformat() if row[3] else None,
            "created_by_admin_id": row[4],
            "last_login": row[5].isoformat() if row[5] else None,
        }
        
        return True, "Employee created successfully", employee_data
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Employee creation failed: {e}", None


def update_employee_status(admin_id: int, employee_id: int, is_active: bool) -> tuple[bool, str]:
    """Activate or deactivate an employee account."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Verify employee exists and is an employee (not admin/manager)
        cur.execute("SELECT id, username, is_active FROM admins WHERE id = %s AND role = 'employee'", (employee_id,))
        row = cur.fetchone()
        
        if not row:
            return False, "Employee not found"
        
        current_active = row[2]
        if current_active == is_active:
            return False, f"Employee is already {'active' if is_active else 'inactive'}"
        
        cur.execute("UPDATE admins SET is_active = %s WHERE id = %s AND role = 'employee'", (is_active, employee_id))
        
        if cur.rowcount == 0:
            return False, "Employee not found"
        
        # Audit log
        action = 'EMPLOYEE_ACTIVATE' if is_active else 'EMPLOYEE_DEACTIVATE'
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, %s, NULL, %s, %s)
        """, (admin_id, action, json.dumps({"is_active": not is_active}), json.dumps({"is_active": is_active})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return True, f"Employee {'activated' if is_active else 'deactivated'} successfully"
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Status update failed: {e}"


def reset_employee_password(admin_id: int, employee_id: int) -> tuple[bool, str, Optional[str]]:
    """Reset employee password to a new temporary password. Returns (success, message, temporary_password)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Verify employee exists
        cur.execute("SELECT id, username FROM admins WHERE id = %s AND role = 'employee'", (employee_id,))
        row = cur.fetchone()
        
        if not row:
            return False, "Employee not found", None
        
        emp_id, username = row
        
        # Generate new temporary password
        temp_password = _generate_secure_password()
        password_hash = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            UPDATE admins 
            SET password_hash = %s, password_change_required = true 
            WHERE id = %s AND role = 'employee'
        """, (password_hash, employee_id))
        
        if cur.rowcount == 0:
            return False, "Employee not found", None
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'EMPLOYEE_PASSWORD_RESET', NULL, %s, %s)
        """, (admin_id, json.dumps({}), json.dumps({"username": username})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return True, "Password reset successfully", temp_password
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Password reset failed: {e}", None


def delete_employee(admin_id: int, employee_id: int) -> tuple[bool, str]:
    """Soft delete an employee account (deactivate and mark for deletion). 
    Hard delete is not supported to preserve audit history."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Verify employee exists and is an employee (not admin/manager)
        cur.execute("SELECT id, username, role FROM admins WHERE id = %s AND role = 'employee'", (employee_id,))
        row = cur.fetchone()
        
        if not row:
            return False, "Employee not found"
        
        # Soft delete: deactivate the account
        cur.execute("UPDATE admins SET is_active = false WHERE id = %s AND role = 'employee'", (employee_id,))
        
        if cur.rowcount == 0:
            return False, "Employee not found"
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'EMPLOYEE_DELETE', NULL, %s, %s)
        """, (admin_id, json.dumps({}), json.dumps({"employee_id": employee_id})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return True, "Employee deleted (deactivated) successfully"
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Delete failed: {e}"


def _generate_secure_password(length: int = 12) -> str:
    """Generate a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ============================================================
# POLICY CRUD
# ============================================================

def list_rules(rule_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all active rules, optionally filtered by type."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        if rule_type:
            cur.execute("""
                SELECT id, rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by, created_at, updated_at
                FROM verification_rules 
                WHERE rule_type = %s AND is_active = true
                ORDER BY id
            """, (rule_type,))
        else:
            cur.execute("""
                SELECT id, rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by, created_at, updated_at
                FROM verification_rules 
                WHERE is_active = true
                ORDER BY id
            """)
        
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        return [
            {
                "id": r[0], "rule_name": r[1], "rule_description": r[2],
                "severity": r[3], "rule_type": r[4], "parameters": r[5],
                "is_active": r[6], "version": r[7], "created_by": r[8],
                "created_at": r[9].isoformat() if r[9] else None,
                "updated_at": r[10].isoformat() if r[10] else None,
            }
            for r in rows
        ]
    except Exception:
        return []


def get_rule(rule_id: int) -> Optional[Dict[str, Any]]:
    """Get single rule by ID."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by, created_at, updated_at
            FROM verification_rules 
            WHERE id = %s
        """, (rule_id,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return None
        
        return {
            "id": row[0], "rule_name": row[1], "rule_description": row[2],
            "severity": row[3], "rule_type": row[4], "parameters": row[5],
            "is_active": row[6], "version": row[7], "created_by": row[8],
            "created_at": row[9].isoformat() if row[9] else None,
            "updated_at": row[10].isoformat() if row[10] else None,
        }
    except Exception:
        return None


def create_rule(admin_id: int, rule_name: str, rule_description: str, severity: str, 
                rule_type: str, parameters: Dict[str, Any]) -> tuple[bool, str, Optional[int]]:
    """Create new verification rule. Returns (success, message, rule_id)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO verification_rules 
            (rule_name, rule_description, severity, rule_type, parameters, is_active, version, created_by, created_at)
            VALUES (%s, %s, %s, %s, %s, true, 1, %s, NOW())
            RETURNING id
        """, (rule_name, rule_description, severity, rule_type, json.dumps(parameters), f"admin:{admin_id}"))
        
        row = cur.fetchone()
        rule_id = row[0] if row else None
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'CREATE', %s, %s, %s)
        """, (admin_id, rule_id, json.dumps({}), json.dumps(parameters)))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Invalidate cache
        reload_policies()
        
        return True, "Rule created successfully", rule_id
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Create failed: {e}", None


def update_rule(admin_id: int, rule_id: int, updates: Dict[str, Any]) -> tuple[bool, str]:
    """Update existing rule. Returns (success, message)."""
    try:
        # Get current rule for audit
        current = get_rule(rule_id)
        if not current:
            return False, "Rule not found"
        
        # Build dynamic update
        allowed_fields = {"rule_name", "rule_description", "severity", "parameters", "is_active"}
        update_parts = []
        values = []
        
        for key, value in updates.items():
            if key in allowed_fields:
                update_parts.append(f"{key} = %s")
                if key == "parameters":
                    values.append(json.dumps(value))
                else:
                    values.append(value)
        
        if not update_parts:
            return False, "No valid fields to update"
        
        update_parts.append("version = version + 1")
        update_parts.append("updated_at = NOW()")
        update_parts.append("updated_by = %s")
        values.append(f"admin:{admin_id}")
        values.append(rule_id)
        
        conn = _get_connection()
        cur = conn.cursor()
        
        query = f"UPDATE verification_rules SET {', '.join(update_parts)} WHERE id = %s"
        cur.execute(query, tuple(values))
        
        if cur.rowcount == 0:
            return False, "Rule not found"
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'UPDATE', %s, %s, %s)
        """, (admin_id, rule_id, json.dumps(current.get("parameters", {})), json.dumps(updates.get("parameters", current.get("parameters", {})))))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Invalidate cache
        reload_policies()
        
        return True, "Rule updated successfully"
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Update failed: {e}"


def delete_rule(admin_id: int, rule_id: int) -> tuple[bool, str]:
    """Soft delete rule (set is_active = false)."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        # Get current for audit
        current = get_rule(rule_id)
        if not current:
            return False, "Rule not found"
        
        cur.execute("""
            UPDATE verification_rules 
            SET is_active = false, version = version + 1, updated_at = NOW(), updated_by = %s
            WHERE id = %s
        """, (f"admin:{admin_id}", rule_id))
        
        if cur.rowcount == 0:
            return False, "Rule not found"
        
        # Audit log
        cur.execute("""
            INSERT INTO policy_audit_log (admin_id, action, rule_id, old_parameters, new_parameters)
            VALUES (%s, 'DELETE', %s, %s, %s)
        """, (admin_id, rule_id, json.dumps(current.get("parameters", {})), json.dumps({})))
        
        conn.commit()
        cur.close()
        conn.close()
        
        reload_policies()
        
        return True, "Rule deactivated successfully"
        
    except Exception as e:
        if conn:
            conn.rollback()
        return False, f"Delete failed: {e}"


# ============================================================
# AUDIT LOG
# ============================================================

def get_audit_log(limit: int = 100) -> List[Dict[str, Any]]:
    """Get recent audit log entries."""
    try:
        conn = _get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT al.id, al.admin_id, a.username, al.action, al.rule_id, 
                   al.old_parameters, al.new_parameters, al.timestamp
            FROM policy_audit_log al
            LEFT JOIN admins a ON al.admin_id = a.id
            ORDER BY al.timestamp DESC
            LIMIT %s
        """, (limit,))
        
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        return [
            {
                "id": r[0], "admin_id": r[1], "admin_username": r[2],
                "action": r[3], "rule_id": r[4],
                "old_parameters": r[5], "new_parameters": r[6],
                "timestamp": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
    except Exception:
        return []


# ============================================================
# TOKEN GENERATION (simple signed token for hackathon)
# ============================================================

import hmac
import hashlib
import time
import base64
import os

# Token signing secret - MUST be set via environment variable
# Never use the hardcoded default in production!
_DEFAULT_TOKEN_SECRET = "bank-ai-verification-secret-change-in-production"

def _get_token_secret() -> str:
    """Get token signing secret from environment with validation.
    
    Raises:
        RuntimeError: If secret is missing, uses known default, or is too weak.
    """
    secret = os.getenv("TOKEN_SECRET")
    
    if not secret:
        raise RuntimeError(
            "TOKEN_SECRET environment variable is not set. "
            "Set TOKEN_SECRET to a secure random string (min 32 chars recommended)."
        )
    
    if secret == _DEFAULT_TOKEN_SECRET:
        raise RuntimeError(
            "TOKEN_SECRET is set to the known default value. "
            "Change it to a secure random string before running in production."
        )
    
    if len(secret) < 32:
        raise RuntimeError(
            "TOKEN_SECRET is too weak (minimum 32 characters required). "
            "Generate a secure random string: openssl rand -base64 32"
        )
    
    return secret


# Token signing secret - loaded from environment with validation
TOKEN_SECRET = _get_token_secret()
TOKEN_EXPIRY_SECONDS = 3600  # 1 hour


def create_token(admin_id: int, username: str, role: str, password_change_required: bool = False) -> str:
    """Create simple HMAC-signed token with expiry."""
    payload = f"{admin_id}:{username}:{role}:{int(password_change_required)}:{int(time.time()) + TOKEN_EXPIRY_SECONDS}"
    signature = hmac.new(
        TOKEN_SECRET.encode(), 
        payload.encode(), 
        hashlib.sha256
    ).hexdigest()
    token = base64.b64encode(f"{payload}:{signature}".encode()).decode()
    return token


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify token and return admin info if valid. Only accepts new 5-part token format.
    Old 4-part tokens are rejected to enforce re-login and ensure database role is authoritative.
    """
    try:
        decoded = base64.b64decode(token).decode()
        parts = decoded.rsplit(":", 1)
        if len(parts) != 2:
            return None
        
        payload, signature = parts
        expected_sig = hmac.new(
            TOKEN_SECRET.encode(), 
            payload.encode(), 
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        payload_parts = payload.split(":")
        if len(payload_parts) != 5:
            # Reject old 4-part tokens (admin_id:username:pcr:expiry) to enforce re-login
            # and ensure database role is always authoritative.
            return None
        
        # New format: admin_id:username:role:pcr:expiry
        admin_id_str, username, role, pcr_str, expiry_str = payload_parts
        
        if int(time.time()) > int(expiry_str):
            return None  # Expired
        
        return {"admin_id": int(admin_id_str), "username": username, "role": role, "password_change_required": pcr_str == "1"}
    except Exception:
        return None