from datetime import datetime
import json

from backend.models.fraud_model import predict_fraud_xgb


DATASET_PATH = "data/fraud/transactions.json"


def load_transactions():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def is_unusual_time(timestamp):
    transaction_time = datetime.fromisoformat(timestamp)
    return transaction_time.hour < 5


def generate_fraud_bank_response(transaction):
    """
    Generate fraud bank AI decision using XGBoost model with rule-based fallback.
    
    Returns dict with bank_ai_decision and metadata about which method was used.
    """
    decision, probability, used_fallback = predict_fraud_xgb(transaction)
    
    return {
        "transaction_id": transaction["transaction_id"],
        "customer_id": transaction["customer_id"],
        "bank_ai_decision": decision,
        "_model_probability": probability,
        "_used_fallback": used_fallback,
    }


def run_fraud_bank_ai():
    transactions = load_transactions()

    print("\nSIMULATED FRAUD BANK AI (XGBoost + Fallback)")
    print("=============================================")

    for transaction in transactions:
        response = generate_fraud_bank_response(transaction)

        print("\nTransaction:", response["transaction_id"])
        print("Customer:", response["customer_id"])
        print("Bank AI Decision:", response["bank_ai_decision"])
        if "_model_probability" in response:
            print("Model Probability:", response["_model_probability"])
        if "_used_fallback" in response:
            print("Used Fallback:", response["_used_fallback"])


if __name__ == "__main__":
    run_fraud_bank_ai()