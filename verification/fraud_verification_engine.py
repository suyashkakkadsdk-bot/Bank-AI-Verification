from datetime import datetime

from database.connection import get_connection
from ai.simulated_fraud_ai import (
    load_transactions,
    generate_fraud_bank_response
)


def is_unusual_time(timestamp):
    transaction_time = datetime.fromisoformat(timestamp)

    # 12 AM to 5 AM is treated as an unusual transaction period
    return transaction_time.hour < 5


def calculate_fraud_risk(transaction, suspicious_indicators):
    score = 0

    # Transaction amount
    amount = transaction["amount"]

    if amount >= 50000:
        score += 30
    elif amount >= 20000:
        score += 15

    # Unusual location
    if transaction.get("location_unusual", False):
        score += 20

    # Suspicious device
    device = transaction["device"]

    if device.startswith("DEV4") or device == "DEV099":
        score += 25

    # Abnormal previous behaviour
    behaviour = transaction["previous_transaction_behaviour"]

    if behaviour != "Normal":
        score += 20

    # High transaction frequency
    frequency = transaction["transaction_frequency"]

    if frequency >= 10:
        score += 15

    # Unusual transaction timing
    if is_unusual_time(transaction["timestamp"]):
        score += 15

    score = min(score, 100)

    if score <= 30:
        risk_level = "LOW"
    elif score <= 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return score, risk_level


def verify_transaction(transaction):
    amount = transaction["amount"]
    device = transaction["device"]
    behaviour = transaction["previous_transaction_behaviour"]
    frequency = transaction["transaction_frequency"]

    bank_response = generate_fraud_bank_response(transaction)
    bank_decision = bank_response["bank_ai_decision"]

    reasons = []
    suspicious_indicators = 0

    # 1. Amount signal
    if amount >= 50000:
        reasons.append("Unusually high transaction amount")
        suspicious_indicators += 1

    elif amount >= 20000:
        reasons.append("Transaction amount is relatively high")
        suspicious_indicators += 1

    # 2. Location signal
    #
    # Location is treated only as an additional signal.
    # It does not independently decide fraud.
    if transaction.get("location_unusual", False):
        reasons.append("Unusual transaction location")
        suspicious_indicators += 1

    # 3. Device signal
    if device.startswith("DEV4") or device == "DEV099":
        reasons.append("New or suspicious device detected")
        suspicious_indicators += 1

    # 4. Historical behaviour signal
    if behaviour != "Normal":
        reasons.append("Abnormal previous transaction behaviour")
        suspicious_indicators += 1

    # 5. Frequency signal
    if frequency >= 10:
        reasons.append("High transaction frequency")
        suspicious_indicators += 1

    # 6. Timing signal
    if is_unusual_time(transaction["timestamp"]):
        reasons.append("Unusual transaction time")
        suspicious_indicators += 1

    # Independent verification decision
    if suspicious_indicators == 0:
        independent_decision = "GENUINE"

    elif suspicious_indicators >= 3:
        independent_decision = "FRAUD"

    else:
        independent_decision = "REVIEW"

    # Compare Bank AI with independent verification
    if independent_decision == "GENUINE":

        if bank_decision == "GENUINE":
            verification_result = "VERIFIED"
        else:
            verification_result = "CONTRADICTED"

    elif independent_decision == "FRAUD":

        if bank_decision == "FRAUD":
            verification_result = "VERIFIED"
        else:
            verification_result = "CONTRADICTED"

    else:
        verification_result = "NEEDS REVIEW"

    risk_score, risk_level = calculate_fraud_risk(
        transaction,
        suspicious_indicators
    )

    if verification_result == "VERIFIED" and risk_level == "LOW":
        recommendation = "Proceed"
    else:
        recommendation = "Human review recommended"

    return {
        "transaction_id": transaction["transaction_id"],
        "customer_id": transaction["customer_id"],
        "bank_ai_decision": bank_decision,
        "verification_result": verification_result,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation
    }


def save_transaction_result(transaction, result):
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
            risk_level
        )
        VALUES
        (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
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
            risk_level = EXCLUDED.risk_level
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
            result["risk_level"]
        )
    )

    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    transactions = load_transactions()

    print("\nFRAUD TRANSACTION VERIFICATION")
    print("==============================")

    for transaction in transactions:
        result = verify_transaction(transaction)

        save_transaction_result(transaction, result)

        print("\nTransaction:", result["transaction_id"])
        print("Customer ID:", result["customer_id"])
        print("Bank AI Decision:", result["bank_ai_decision"])
        print("Verification Result:", result["verification_result"])
        print("Risk Score:", result["risk_score"], "/ 100")
        print("Risk Level:", result["risk_level"])
        print("Recommendation:", result["recommendation"])

        print("Key Reasons:")

        for reason in result["reasons"]:
            print("-", reason)

        print("Saved to database: YES")