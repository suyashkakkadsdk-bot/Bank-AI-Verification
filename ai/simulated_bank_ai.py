import json

from backend.models.loan_model import predict_loan_xgb


DATASET_PATH = "data/loan/loan_applications.json"


def load_applications():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def generate_bank_response(application):
    """
    Generate loan bank AI decision using XGBoost model with rule-based fallback.
    
    Returns dict with bank_ai_decision and metadata about which method was used.
    """
    decision, probability, used_fallback = predict_loan_xgb(application)
    
    return {
        "application_id": application["application_id"],
        "applicant_id": application["applicant_id"],
        "bank_ai_decision": decision,
        "_model_probability": probability,
        "_used_fallback": used_fallback,
    }


def run_bank_ai():
    applications = load_applications()

    print("\nSIMULATED BANK AI (XGBoost + Fallback)")
    print("=======================================")

    for application in applications:
        response = generate_bank_response(application)

        print("\nApplication:", response["application_id"])
        print("Applicant:", response["applicant_id"])
        print("Bank AI Decision:", response["bank_ai_decision"])
        if "_model_probability" in response:
            print("Model Probability:", response["_model_probability"])
        if "_used_fallback" in response:
            print("Used Fallback:", response["_used_fallback"])


if __name__ == "__main__":
    run_bank_ai()