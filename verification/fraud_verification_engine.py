from datetime import datetime
import json

from database.connection import get_connection
from backend.models.policy_model import get_fraud_policy, reload_policies


def is_unusual_time(timestamp):
    """Check if transaction time is unusual (12 AM - 5 AM)."""
    transaction_time = datetime.fromisoformat(timestamp)
    return transaction_time.hour < 5


# ============================================================
# POLICY HELPERS
# ============================================================

def _get_fraud_policy():
    """Get fraud policy with fallback to defaults on failure."""
    try:
        return get_fraud_policy()
    except Exception:
        return _get_default_fraud_policy()


def _get_default_fraud_policy():
    """Hardcoded defaults matching original behavior."""
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
# RISK SCORE CALCULATION
# ============================================================
# LOCKED PROTOTYPE FORMULA (now configurable via policy)
# ============================================================

def calculate_fraud_risk(transaction, suspicious_indicators):
    policy = _get_fraud_policy()
    score = 0

    # Transaction amount
    amount = transaction["amount"]
    for threshold in policy["Fraud Amount Risk"]["amount_thresholds"]:
        if "min" in threshold and "max" in threshold:
            if threshold["min"] <= amount <= threshold["max"]:
                score += threshold["score"]
                break
        elif "min" in threshold:
            if amount >= threshold["min"]:
                score += threshold["score"]
                break
        elif "max" in threshold:
            if amount <= threshold["max"]:
                score += threshold["score"]
                break

    # Unusual location
    if transaction.get("location_unusual", False):
        score += policy["Fraud Location Risk"]["location_unusual_score"]

    # Suspicious device
    device = transaction["device"]
    device_policy = policy["Fraud Device Risk"]
    for prefix in device_policy["suspicious_device_prefixes"]:
        if device.startswith(prefix):
            score += device_policy["device_score"]
            break

    # Abnormal previous behaviour
    behaviour = transaction["previous_transaction_behaviour"]
    if behaviour != "Normal":
        score += policy["Fraud Behaviour Risk"]["abnormal_behaviour_score"]

    # High transaction frequency
    frequency = transaction["transaction_frequency"]
    freq_policy = policy["Fraud Frequency Risk"]
    if frequency >= freq_policy["frequency_threshold"]:
        score += freq_policy["frequency_score"]

    # Unusual transaction timing
    if is_unusual_time(transaction["timestamp"]):
        score += policy["Fraud Timing Risk"]["timing_score"]

    score = min(score, 100)

    # Risk Level
    for level in policy["Fraud Risk Level"]["risk_levels"]:
        if "max" in level and score <= level["max"]:
            risk_level = level["level"]
            break
        elif "min" in level and score >= level["min"]:
            risk_level = level["level"]
            break
    else:
        risk_level = "HIGH"

    return score, risk_level


# ============================================================
# INDEPENDENT ASSESSMENT
# ============================================================

def assess_fraud_independently(transaction):
    """Pure independent fraud assessment. No Bank AI input."""
    policy = _get_fraud_policy()
    
    amount = transaction["amount"]
    device = transaction["device"]
    behaviour = transaction["previous_transaction_behaviour"]
    frequency = transaction["transaction_frequency"]
    location_unusual = transaction.get("location_unusual", False)

    reasons = []
    suspicious_indicators = 0

    # Amount signal - use policy thresholds
    # Policy: amount_thresholds with min/max/score
    # Thresholds: >=50000(30), 20000-49999(15), <=19999(0)
    amt_thresholds = policy["Fraud Amount Risk"]["amount_thresholds"]
    high_amt_threshold = 50000  # fallback
    med_amt_threshold = 20000   # fallback
    for t in amt_thresholds:
        if "min" in t and t.get("score", 0) >= 30:
            high_amt_threshold = t["min"]
        elif "min" in t and t.get("score", 0) > 0:
            med_amt_threshold = t["min"]
    
    if amount >= high_amt_threshold:
        reasons.append("Unusually high transaction amount")
        suspicious_indicators += 1
    elif amount >= med_amt_threshold:
        reasons.append("Transaction amount is relatively high")
        suspicious_indicators += 1

    # Location signal - use policy
    if location_unusual:
        reasons.append("Unusual transaction location")
        suspicious_indicators += 1

    # Device signal - use policy
    device_policy = policy["Fraud Device Risk"]
    suspicious_prefixes = device_policy.get("suspicious_device_prefixes", ["DEV4", "DEV099"])
    is_suspicious_device = any(device.startswith(prefix) for prefix in suspicious_prefixes)
    if is_suspicious_device:
        reasons.append("New or suspicious device detected")
        suspicious_indicators += 1

    # Behaviour signal - use policy
    if behaviour != "Normal":
        reasons.append("Abnormal previous transaction behaviour")
        suspicious_indicators += 1

    # Frequency signal - use policy
    freq_policy = policy["Fraud Frequency Risk"]
    freq_threshold = freq_policy.get("frequency_threshold", 10)
    if frequency >= freq_threshold:
        reasons.append("High transaction frequency")
        suspicious_indicators += 1

    # Timing signal - use policy
    timing_policy = policy["Fraud Timing Risk"]
    unusual_start = timing_policy.get("unusual_hours_start", 0)
    unusual_end = timing_policy.get("unusual_hours_end", 4)
    if is_unusual_time(transaction["timestamp"]):
        reasons.append("Unusual transaction time")
        suspicious_indicators += 1

    # Independent Decision (using policy thresholds)
    decision_policy = policy["Fraud Independent Decision"]["suspicious_indicators"]
    if suspicious_indicators <= decision_policy["genuine_max"]:
        independent_decision = "GENUINE"
    elif suspicious_indicators >= decision_policy["fraud_min"]:
        independent_decision = "FRAUD"
    else:
        independent_decision = "REVIEW"

    # Risk Score
    risk_score, risk_level = calculate_fraud_risk(transaction, suspicious_indicators)

    return {
        "independent_decision": independent_decision,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
    }


# ============================================================
# COMPARISON AND FINAL DECISION
# ============================================================

def compare_and_decide_fraud(transaction, bank_decision, assessment, model_probability=0.0, used_fallback=False):
    independent_decision = assessment["independent_decision"]
    risk_score = assessment["risk_score"]
    risk_level = assessment["risk_level"]
    reasons = assessment["reasons"]

    if independent_decision == "GENUINE":
        verification_result = "VERIFIED" if bank_decision == "GENUINE" else "CONTRADICTED"
    elif independent_decision == "FRAUD":
        verification_result = "VERIFIED" if bank_decision == "FRAUD" else "CONTRADICTED"
    else:
        verification_result = "NEEDS REVIEW"

    if verification_result == "VERIFIED" and risk_level == "LOW":
        recommendation = "Proceed"
    else:
        recommendation = "Human review recommended"

    if verification_result == "VERIFIED" and risk_level == "LOW":
        final_status = "VERIFIED"
    else:
        final_status = "HUMAN_REVIEW"

    return {
        "transaction_id": transaction["transaction_id"],
        "customer_id": transaction["customer_id"],
        "bank_ai_decision": bank_decision,
        "verification_result": verification_result,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation,
        "final_status": final_status,
        "model_probability": model_probability,
        "used_fallback": used_fallback,
        "independent_decision": independent_decision,
    }


# ============================================================
# PUBLIC API (backward compatible for direct callers)
# ============================================================

def verify_transaction(transaction, bank_decision: str, model_probability=0.0, used_fallback=False):
    assessment = assess_fraud_independently(transaction)
    return compare_and_decide_fraud(transaction, bank_decision, assessment, model_probability, used_fallback)


def save_transaction_result(transaction, result):
    """
    Save transaction result to database with error handling and rollback.
    Raises exception if persistence fails (no silent failure).
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO transactions
            (
                transaction_id,
                customer_id,
                amount,
                timestamp,
                device,
                location,
                merchant,
                bank_ai_decision,
                verification_result,
                risk_score,
                risk_level,
                reasons,
                final_status,
                model_probability,
                used_fallback
            )
            VALUES
            (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (transaction_id)
            DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                amount = EXCLUDED.amount,
                timestamp = EXCLUDED.timestamp,
                device = EXCLUDED.device,
                location = EXCLUDED.location,
                merchant = EXCLUDED.merchant,
                bank_ai_decision = EXCLUDED.bank_ai_decision,
                verification_result = EXCLUDED.verification_result,
                risk_score = EXCLUDED.risk_score,
                risk_level = EXCLUDED.risk_level,
                reasons = EXCLUDED.reasons,
                final_status = EXCLUDED.final_status,
                model_probability = EXCLUDED.model_probability,
                used_fallback = EXCLUDED.used_fallback
            """,
            (
                transaction["transaction_id"],
                transaction["customer_id"],
                transaction["amount"],
                transaction["timestamp"],
                transaction["device"],
                transaction["location"],
                transaction["merchant"],
                result["bank_ai_decision"],
                result["verification_result"],
                result["risk_score"],
                result["risk_level"],
                json.dumps(result["reasons"]),
                result["final_status"],
                result.get("model_probability", 0.0),
                result.get("used_fallback", False)
            )
        )

        # Save Verification Log
        cur.execute("""
            INSERT INTO verification_logs
            (
                case_type,
                case_id,
                existing_decision,
                verification_result,
                risk_score,
                risk_level,
                reasons,
                recommendation,
                final_status
            )
            VALUES
            (
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
        """, (
            "FRAUD",
            result["transaction_id"],
            result["bank_ai_decision"],
            result["verification_result"],
            result["risk_score"],
            result["risk_level"],
            json.dumps(result["reasons"]),
            result["recommendation"],
            result["final_status"]
        ))

        conn.commit()

    except Exception as e:
        if conn:
            conn.rollback()
        raise RuntimeError(f"Database save failed: {e}") from e
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    from ai.simulated_fraud_ai import load_transactions, generate_fraud_bank_response

    transactions = load_transactions()

    print("\nFRAUD TRANSACTION VERIFICATION")
    print("==============================")

    for transaction in transactions:
        bank_decision = generate_fraud_bank_response(transaction)["bank_ai_decision"]
        result = verify_transaction(transaction, bank_decision)

        save_transaction_result(transaction, result)

        print("\nTransaction:", result["transaction_id"])
        print("Customer ID:", result["customer_id"])
        print("Bank AI Decision:", result["bank_ai_decision"])
        print("Verification Result:", result["verification_result"])
        print("Risk Score:", result["risk_score"], "/ 100")
        print("Risk Level:", result["risk_level"])
        print("Recommendation:", result["recommendation"])
        print("Final Status:", result["final_status"])

        print("Key Reasons:")

        for reason in result["reasons"]:
            print("-", reason)

        print("Saved to database: YES")