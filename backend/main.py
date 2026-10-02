from fastapi import FastAPI
from pydantic import BaseModel

from verification.verification_engine import (
    verify_application,
    save_verification_result
)

from verification.fraud_verification_engine import (
    verify_transaction,
    save_transaction_result
)


app = FastAPI(
    title="Bank AI Verification API",
    description="Loan and Fraud Decision Verification System",
    version="1.0.0"
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
# RESPONSE MODELS
# =========================

class VerificationResponse(BaseModel):
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
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "message": "Bank AI Verification API is running"
    }


# =========================
# LOAN VERIFICATION
# =========================

@app.post(
    "/verify/loan",
    response_model=LoanVerificationResponse
)
def verify_loan(application: LoanApplication):

    application_data = application.model_dump()

    result = verify_application(application_data)

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

    result = verify_transaction(transaction_data)

    save_transaction_result(
        transaction_data,
        result
    )

    return result