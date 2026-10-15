# backend/models/loan_model.py
"""
XGBoost loan model integration.
Loads model from project-relative path, prepares features, handles prediction.
Falls back to rule-based logic on any failure.
"""
from pathlib import Path
import numpy as np

MODEL_PATH = Path(__file__).parent / "loan_xgb_model.json"
_MODEL = None
_MODEL_LOAD_ERROR = None


def _load_model():
    """Load XGBoost model. Returns (model, error)."""
    global _MODEL, _MODEL_LOAD_ERROR
    if _MODEL is not None:
        return _MODEL, None
    if _MODEL_LOAD_ERROR is not None:
        return None, _MODEL_LOAD_ERROR
    try:
        import xgboost as xgb
        _MODEL = xgb.Booster()
        _MODEL.load_model(str(MODEL_PATH))
        return _MODEL, None
    except Exception as e:
        _MODEL_LOAD_ERROR = e
        return None, e


FEATURE_NAMES = [
    "credit_score",
    "income",
    "existing_debt",
    "monthly_emi",
    "loan_amount",
    "loan_tenure",
    "emp_salaried",
    "emp_self_employed",
    "repay_good",
    "repay_poor",
]


def prepare_features(application: dict) -> np.ndarray:
    """
    Map application dict to 10-feature array in model's exact order.
    
    Missing fields use explicit defaults (not real data).
    All mappings are documented and auditable.
    
    Features (in order):
    0. credit_score (float) - applicant credit score
    1. income (float) - annual income
    2. existing_debt (float) - current debt amount
    3. monthly_emi (float) - monthly EMI payment
    4. loan_amount (float) - requested loan amount
    5. loan_tenure (float) - loan tenure in months
    6. emp_salaried (float 0/1) - one-hot for Salaried
    7. emp_self_employed (float 0/1) - one-hot for Self-Employed
    8. repay_good (float 0/1) - one-hot for Good repayment history
    9. repay_poor (float 0/1) - one-hot for Poor repayment history
    """
    # Numeric features (0-5)
    credit_score = float(application.get("credit_score", 0))
    income = float(application.get("income", 0))
    existing_debt = float(application.get("existing_debt", 0))
    monthly_emi = float(application.get("monthly_emi", 0))
    loan_amount = float(application.get("loan_amount", 0))
    loan_tenure = float(application.get("loan_tenure", 0))
    
    # Employment status one-hot (6-7)
    emp = application.get("employment_status", "").lower()
    emp_salaried = 1.0 if emp == "salaried" else 0.0
    emp_self_employed = 1.0 if emp == "self-employed" else 0.0
    
    # Repayment history one-hot (8-9)
    repay = application.get("repayment_history", "").lower()
    repay_good = 1.0 if repay == "good" else 0.0
    repay_poor = 1.0 if repay == "poor" else 0.0
    
    features = np.array([[
        credit_score, income, existing_debt, monthly_emi,
        loan_amount, loan_tenure,
        emp_salaried, emp_self_employed,
        repay_good, repay_poor
    ]], dtype=float)
    
    return features


def predict_loan_xgb(application: dict) -> tuple[str, float, bool]:
    """
    Predict loan decision using XGBoost model.
    
    Returns:
        (decision, probability, used_fallback)
        - decision: "APPROVED" or "REJECTED"
        - probability: float 0-1 (approval probability)
        - used_fallback: True if rule-based fallback was used
    """
    model, error = _load_model()
    if model is None:
        # Model failed to load - use fallback
        return _fallback_predict(application), 0.0, True
    
    try:
        features = prepare_features(application)
        import xgboost as xgb
        dmatrix = xgb.DMatrix(features, feature_names=FEATURE_NAMES)
        prob = float(model.predict(dmatrix)[0])
        decision = "APPROVED" if prob >= 0.5 else "REJECTED"
        return decision, prob, False
    except Exception:
        # Prediction failed - use fallback
        return _fallback_predict(application), 0.0, True


def _fallback_predict(application: dict) -> str:
    """
    Rule-based fallback (original generate_bank_response logic).
    Credit score >= 700 -> APPROVED, else REJECTED.
    """
    credit_score = application.get("credit_score", 0)
    return "APPROVED" if credit_score >= 700 else "REJECTED"