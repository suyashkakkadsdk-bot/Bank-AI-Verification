# backend/models/fraud_model.py
"""
XGBoost fraud model integration.
Loads model from project-relative path, prepares features, handles prediction.
Falls back to rule-based logic on any failure.
"""
from pathlib import Path
import numpy as np

MODEL_PATH = Path(__file__).parent / "xgb_model.json"
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
    "amount",
    "transaction_hour",
    "foreign_transaction",
    "location_mismatch",
    "device_trust_score",
    "velocity_last_24h",
    "cardholder_age",
    "merchant_category_Electronics",
    "merchant_category_Food",
    "merchant_category_Grocery",
    "merchant_category_Travel",
]


DEVICE_TRUST_MAP = {
    "DEV099": 10,  # Explicitly suspicious (check first)
    "DEV0": 80,    # Known/trusted devices
    "DEV1": 70,
    "DEV2": 60,
    "DEV3": 50,
    "DEV4": 20,    # Suspicious/new devices
}

MERCHANT_CATEGORY_KEYWORDS = {
    "electronics": 0,  # Electronics
    "travel": 3,       # Travel
    "grocery": 2,      # Grocery (check before food)
    "food": 1,         # Food
}


def prepare_features(transaction: dict) -> np.ndarray:
    """
    Map transaction dict to 11-feature array in model's exact order.
    
    Missing customer information uses explicit defaults (not real data).
    All mappings are documented and auditable.
    
    Features (in order):
    0. amount (float) - transaction amount
    1. transaction_hour (int 0-23) - extracted from timestamp
    2. foreign_transaction (int 0/1) - default 0 (no customer country data)
    3. location_mismatch (int 0/1) - default 0 (no customer usual location data)
    4. device_trust_score (int 0-100) - mapped from device ID prefix
    5. velocity_last_24h (int) - approximated from transaction_frequency
    6. cardholder_age (int) - default 35 (no customer age data)
    7-10. merchant_category_* (one-hot) - mapped from merchant name
    """
    # 0. amount
    amount = float(transaction.get("amount", 0.0))
    
    # 1. transaction_hour from timestamp
    timestamp = transaction.get("timestamp", "")
    if "T" in timestamp:
        try:
            hour = int(timestamp[11:13])
        except (ValueError, IndexError):
            hour = 12
    else:
        hour = 12
    transaction_hour = hour
    
    # 2. foreign_transaction - NO customer country data available
    foreign_transaction = 0
    
    # 3. location_mismatch - NO customer usual location data available
    location_mismatch = 0
    
    # 4. device_trust_score from device ID
    device = transaction.get("device", "")
    device_trust_score = 50  # default for unknown devices
    for prefix, score in DEVICE_TRUST_MAP.items():
        if device.startswith(prefix):
            device_trust_score = score
            break
    
    # 5. velocity_last_24h - approximated from transaction_frequency
    velocity_last_24h = int(transaction.get("transaction_frequency", 1))
    
    # 6. cardholder_age - NO customer age data available
    cardholder_age = 35
    
    # 7-10. merchant_category one-hot from merchant name
    merchant = transaction.get("merchant", "").lower()
    merchant_cats = [0, 0, 0, 0]
    for keyword, idx in MERCHANT_CATEGORY_KEYWORDS.items():
        if keyword in merchant:
            merchant_cats[idx] = 1
            break
    
    features = np.array([[
        amount,
        transaction_hour,
        foreign_transaction,
        location_mismatch,
        device_trust_score,
        velocity_last_24h,
        cardholder_age,
        *merchant_cats
    ]], dtype=float)
    
    return features


def predict_fraud_xgb(transaction: dict) -> tuple[str, float, bool]:
    """
    Predict fraud using XGBoost model.
    
    Returns:
        (decision, probability, used_fallback)
        - decision: "FRAUD" or "GENUINE"
        - probability: float 0-1 (fraud probability)
        - used_fallback: True if rule-based fallback was used
    """
    model, error = _load_model()
    if model is None:
        # Model failed to load - use fallback
        return _fallback_predict(transaction), 0.0, True
    
    try:
        features = prepare_features(transaction)
        import xgboost as xgb
        dmatrix = xgb.DMatrix(features, feature_names=FEATURE_NAMES)
        prob = float(model.predict(dmatrix)[0])
        decision = "FRAUD" if prob >= 0.5 else "GENUINE"
        return decision, prob, False
    except Exception as e:
        # Prediction failed - use fallback
        return _fallback_predict(transaction), 0.0, True


def _fallback_predict(transaction: dict) -> str:
    """
    Rule-based fallback (original generate_fraud_bank_response logic).
    """
    amount = transaction.get("amount", 0)
    device = transaction.get("device", "")
    behaviour = transaction.get("previous_transaction_behaviour", "Normal")
    frequency = transaction.get("transaction_frequency", 0)
    timestamp = transaction.get("timestamp", "")
    
    suspicious_indicators = 0
    
    if amount >= 50000:
        suspicious_indicators += 1
    if device.startswith("DEV4") or device == "DEV099":
        suspicious_indicators += 1
    if behaviour != "Normal":
        suspicious_indicators += 1
    if frequency >= 10:
        suspicious_indicators += 1
    if timestamp and "T" in timestamp:
        try:
            if int(timestamp[11:13]) < 5:
                suspicious_indicators += 1
        except (ValueError, IndexError):
            pass
    
    return "FRAUD" if suspicious_indicators >= 3 else "GENUINE"