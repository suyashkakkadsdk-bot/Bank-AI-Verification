from datetime import datetime
import json


DATASET_PATH = "data/fraud/transactions.json"


def load_transactions():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def is_unusual_time(timestamp):
    transaction_time = datetime.fromisoformat(timestamp)

    # 12 AM to 5 AM
    return transaction_time.hour < 5


def generate_fraud_bank_response(transaction):
    amount = transaction["amount"]
    device = transaction["device"]
    behaviour = transaction["previous_transaction_behaviour"]
    frequency = transaction["transaction_frequency"]
    timestamp = transaction["timestamp"]

    suspicious_indicators = 0

    # 1. High transaction amount
    if amount >= 50000:
        suspicious_indicators += 1

    # 2. Suspicious/new device
    if device.startswith("DEV4") or device == "DEV099":
        suspicious_indicators += 1

    # 3. Abnormal previous behaviour
    if behaviour != "Normal":
        suspicious_indicators += 1

    # 4. High transaction frequency
    if frequency >= 10:
        suspicious_indicators += 1

    # 5. Unusual transaction timing
    if is_unusual_time(timestamp):
        suspicious_indicators += 1

    # Location is NOT independently treated as fraud.
    # Without reliable customer history, location alone
    # cannot establish that a transaction is fraudulent.

    if suspicious_indicators >= 3:
        decision = "FRAUD"
    else:
        decision = "GENUINE"

    return {
        "transaction_id": transaction["transaction_id"],
        "customer_id": transaction["customer_id"],
        "bank_ai_decision": decision
    }


def run_fraud_bank_ai():
    transactions = load_transactions()

    print("\nSIMULATED FRAUD BANK AI")
    print("========================")

    for transaction in transactions:
        response = generate_fraud_bank_response(transaction)

        print("\nTransaction:", response["transaction_id"])
        print("Customer:", response["customer_id"])
        print("Bank AI Decision:", response["bank_ai_decision"])


if __name__ == "__main__":
    run_fraud_bank_ai()