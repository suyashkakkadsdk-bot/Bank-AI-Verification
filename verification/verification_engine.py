import json

from database.connection import get_connection
from ai.simulated_bank_ai import generate_bank_response


# ============================================================
# RISK SCORE CALCULATION
# ============================================================
# LOCKED PROTOTYPE FORMULA
#
# Credit Score Risk:
#   >= 700       -> 0
#   650 - 699    -> 20
#   < 650        -> 40
#
# Existing Loan Risk:
#   existing_debt > 0 -> 30
#   existing_debt = 0 -> 0
#
# Loan-to-Income Risk:
#   loan <= 7 x income        -> 0
#   loan > 7 x income
#   and <= 10 x income       -> 15
#   loan > 10 x income       -> 30
#
# Risk Level:
#   0 - 30    -> LOW
#   31 - 70   -> MEDIUM
#   71 - 100  -> HIGH
# ============================================================

def calculate_risk_score(application):

    credit_score = application["credit_score"]
    loan_amount = application["loan_amount"]
    income = application["income"]
    existing_debt = application["existing_debt"]

    score = 0

    # --------------------------------------------------------
    # 1. Credit Score Risk
    # --------------------------------------------------------
    if credit_score >= 700:
        score += 0
    elif credit_score >= 650:
        score += 20
    else:
        score += 40

    # --------------------------------------------------------
    # 2. Existing Loan Risk
    # --------------------------------------------------------
    # Locked formula:
    # existing_debt > 0 means existing loan/debt is present.
    # --------------------------------------------------------
    if existing_debt > 0:
        score += 30

    # --------------------------------------------------------
    # 3. Loan-to-Income Risk
    # --------------------------------------------------------
    if loan_amount > income * 10:
        score += 30
    elif loan_amount > income * 7:
        score += 15

    # Maximum score = 100
    score = min(score, 100)

    # --------------------------------------------------------
    # Risk Level
    # --------------------------------------------------------
    if score <= 30:
        risk_level = "LOW"
    elif score <= 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return score, risk_level


# ============================================================
# INDEPENDENT VERIFICATION
# ============================================================

def verify_application(application):

    credit_score = application["credit_score"]
    income = application["income"]
    existing_debt = application["existing_debt"]
    monthly_emi = application["monthly_emi"]
    loan_amount = application["loan_amount"]
    repayment_history = application["repayment_history"]

    # --------------------------------------------------------
    # Existing Bank AI Decision
    # --------------------------------------------------------
    bank_response = generate_bank_response(application)

    bank_decision = bank_response["bank_ai_decision"]

    reasons = []

    # --------------------------------------------------------
    # Credit Profile
    # --------------------------------------------------------
    if credit_score < 650:
        reasons.append("Weak credit score")
    elif credit_score >= 700:
        reasons.append("Strong credit score")

    # --------------------------------------------------------
    # Existing Debt
    # --------------------------------------------------------
    if existing_debt > 0:
        reasons.append("Existing debt found")
    else:
        reasons.append("Low existing debt")

    # --------------------------------------------------------
    # Loan-to-Income Relationship
    # --------------------------------------------------------
    if loan_amount > income * 10:
        reasons.append("Loan amount exceeds income-based limit")
    elif loan_amount > income * 7:
        reasons.append("Loan amount is high relative to income")

    # --------------------------------------------------------
    # Monthly EMI
    # --------------------------------------------------------
    if monthly_emi > income * 0.40:
        reasons.append("Monthly EMI is high relative to income")

    # --------------------------------------------------------
    # Repayment History
    # --------------------------------------------------------
    if repayment_history.lower() == "good":
        reasons.append("Good repayment history")
    elif repayment_history.lower() == "poor":
        reasons.append("Poor repayment history")

    # --------------------------------------------------------
    # Independent Verification Assessment
    # --------------------------------------------------------
    high_risk_indicators = 0

    if credit_score < 650:
        high_risk_indicators += 1

    if existing_debt > 0:
        high_risk_indicators += 1

    if loan_amount > income * 10:
        high_risk_indicators += 1

    if monthly_emi > income * 0.40:
        high_risk_indicators += 1

    if repayment_history.lower() == "poor":
        high_risk_indicators += 1

    # --------------------------------------------------------
    # Independent Decision
    # --------------------------------------------------------
    if high_risk_indicators == 0:
        independent_decision = "APPROVED"

    elif high_risk_indicators >= 3:
        independent_decision = "REJECTED"

    else:
        independent_decision = "REVIEW"

    # --------------------------------------------------------
    # Verification Result
    #
    # Blueprint terminology:
    # VERIFIED
    # NEEDS REVIEW
    # CONTRADICTED
    # --------------------------------------------------------
    if independent_decision == "APPROVED":

        if bank_decision == "APPROVED":
            verification_result = "VERIFIED"
        else:
            verification_result = "CONTRADICTED"

    elif independent_decision == "REJECTED":

        if bank_decision == "REJECTED":
            verification_result = "VERIFIED"
        else:
            verification_result = "CONTRADICTED"

    else:
        verification_result = "NEEDS REVIEW"

    # --------------------------------------------------------
    # Risk Score
    # --------------------------------------------------------
    risk_score, risk_level = calculate_risk_score(application)

    # --------------------------------------------------------
    # Recommendation
    # --------------------------------------------------------
    if verification_result == "VERIFIED" and risk_level == "LOW":
        recommendation = "Proceed"

    else:
        recommendation = "Human review recommended"

    # --------------------------------------------------------
    # Final Result
    # --------------------------------------------------------
    return {
        "application_id": application["application_id"],
        "applicant_id": application["applicant_id"],
        "bank_ai_decision": bank_decision,
        "verification_result": verification_result,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation
    }


# ============================================================
# SAVE RESULT TO BLUEPRINT DATABASE TABLES
# ============================================================

def save_verification_result(application, result):

    conn = get_connection()
    cur = conn.cursor()

    # ========================================================
    # 1. Save / Update Loan Application
    # ========================================================

    cur.execute("""
        INSERT INTO loan_applications
        (
            application_id,
            applicant_id,
            income,
            credit_score,
            employment_status,
            existing_debt,
            monthly_emi,
            loan_amount,
            loan_tenure,
            repayment_history,
            bank_ai_decision,
            verification_result,
            risk_score,
            risk_level
        )
        VALUES
        (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s
        )

        ON CONFLICT (application_id)
        DO UPDATE SET
            applicant_id = EXCLUDED.applicant_id,
            income = EXCLUDED.income,
            credit_score = EXCLUDED.credit_score,
            employment_status = EXCLUDED.employment_status,
            existing_debt = EXCLUDED.existing_debt,
            monthly_emi = EXCLUDED.monthly_emi,
            loan_amount = EXCLUDED.loan_amount,
            loan_tenure = EXCLUDED.loan_tenure,
            repayment_history = EXCLUDED.repayment_history,
            bank_ai_decision = EXCLUDED.bank_ai_decision,
            verification_result = EXCLUDED.verification_result,
            risk_score = EXCLUDED.risk_score,
            risk_level = EXCLUDED.risk_level
    """, (
        application["application_id"],
        application["applicant_id"],
        application["income"],
        application["credit_score"],
        application["employment_status"],
        application["existing_debt"],
        application["monthly_emi"],
        application["loan_amount"],
        application["loan_tenure"],
        application["repayment_history"],
        result["bank_ai_decision"],
        result["verification_result"],
        result["risk_score"],
        result["risk_level"]
    ))

    # ========================================================
    # 2. Save Verification Log
    # ========================================================

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
            recommendation
        )
        VALUES
        (
            %s, %s, %s, %s,
            %s, %s, %s, %s
        )
    """, (
        "LOAN",
        result["application_id"],
        result["bank_ai_decision"],
        result["verification_result"],
        result["risk_score"],
        result["risk_level"],
        json.dumps(result["reasons"]),
        result["recommendation"]
    ))

    conn.commit()

    cur.close()
    conn.close()


# ============================================================
# MAIN PROGRAM
# ============================================================

if __name__ == "__main__":

    # Load blueprint-aligned loan dataset
    from ai.simulated_bank_ai import load_applications

    applications = load_applications()

    print("\nBANK AI VERIFICATION")
    print("====================")

    for application in applications:

        result = verify_application(application)

        # Save into blueprint database tables
        save_verification_result(application, result)

        print("\nApplication:", result["application_id"])
        print("Applicant ID:", result["applicant_id"])
        print("Bank AI Decision:", result["bank_ai_decision"])
        print("Verification Result:", result["verification_result"])
        print("Risk Score:", result["risk_score"], "/ 100")
        print("Risk Level:", result["risk_level"])
        print("Recommendation:", result["recommendation"])

        print("Key Reasons:")

        for reason in result["reasons"]:
            print("-", reason)

        print("Saved to database: YES")