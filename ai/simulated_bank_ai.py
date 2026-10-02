import json


DATASET_PATH = "data/loan/loan_applications.json"


def load_applications():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def generate_bank_response(application):

    if application["credit_score"] >= 700:
        decision = "APPROVED"
    else:
        decision = "REJECTED"

    return {
        "application_id": application["application_id"],
        "applicant_id": application["applicant_id"],
        "bank_ai_decision": decision
    }


def run_bank_ai():

    applications = load_applications()

    print("\nSIMULATED BANK AI")
    print("=================")

    for application in applications:

        response = generate_bank_response(application)

        print("\nApplication:", response["application_id"])
        print("Applicant:", response["applicant_id"])
        print("Bank AI Decision:", response["bank_ai_decision"])


if __name__ == "__main__":
    run_bank_ai()