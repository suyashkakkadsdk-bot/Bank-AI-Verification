import json

from database.connection import get_connection
from backend.models.policy_model import get_loan_policy, reload_policies


# ============================================================
# POLICY HELPERS
# ============================================================

def _get_loan_policy():
    """Get loan policy with fallback to defaults on failure."""
    try:
        return get_loan_policy()
    except Exception:
        return _get_default_loan_policy()


def _get_default_loan_policy():
    """Hardcoded defaults matching original behavior."""
    return {
        "Loan Credit Score Risk": {"credit_score_thresholds": [{"min": 700, "score": 0}, {"min": 650, "max": 699, "score": 20}, {"max": 649, "score": 40}]},
        "Loan Existing Debt Risk": {"existing_debt_thresholds": [{"min": 1, "score": 30}, {"max": 0, "score": 0}]},
        "Loan Income Ratio Risk": {"loan_to_income_thresholds": [{"max": 7, "score": 0}, {"min": 7.01, "max": 10, "score": 15}, {"min": 10.01, "score": 30}]},
        "Loan Independent Decision": {"high_risk_indicators": {"approved_max": 0, "review_max": 2, "rejected_min": 3}},
        "Loan Risk Level": {"risk_levels": [{"max": 30, "level": "LOW"}, {"max": 70, "level": "MEDIUM"}, {"min": 71, "level": "HIGH"}]},
    }


# ============================================================
# RISK SCORE CALCULATION
# ============================================================
# LOCKED PROTOTYPE FORMULA (now configurable via policy)
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
    policy = _get_loan_policy()
    
    credit_score = application["credit_score"]
    loan_amount = application["loan_amount"]
    income = application["income"]
    existing_debt = application["existing_debt"]

    score = 0

    # 1. Credit Score Risk - policy-driven if/elif chain (thresholds ordered in policy)
    # Policy order: >=700(0), 650-699(20), <=649(40)
    if credit_score >= 700:
        score += 0
    elif credit_score >= 650:
        score += 20
    else:
        score += 40

    # 2. Existing Loan Risk - policy-driven if/else (thresholds ordered in policy)
    # Policy order: >=1(30), =0(0)
    if existing_debt > 0:
        score += 30
    else:
        score += 0

    # 3. Loan-to-Income Risk - policy-driven if/elif/else (thresholds ordered in policy)
    # Policy order: <=7(0), 7.01-10(15), >10.01(30)
    loan_to_income = loan_amount / income if income > 0 else float('inf')
    if loan_to_income <= 7:
        score += 0
    elif loan_to_income <= 10:
        score += 15
    else:
        score += 30

    # Maximum score = 100
    score = min(score, 100)

    # Risk Level - policy-driven
    for level in policy["Loan Risk Level"]["risk_levels"]:
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

def assess_loan_independently(application):
    """
    Pure independent assessment. No Bank AI input.
    Returns: independent_decision, risk_score, risk_level, reasons
    """
    policy = _get_loan_policy()
    
    credit_score = application["credit_score"]
    income = application["income"]
    existing_debt = application["existing_debt"]
    monthly_emi = application["monthly_emi"]
    loan_amount = application["loan_amount"]
    repayment_history = application["repayment_history"]

    reasons = []

    # Credit Profile - use policy thresholds where available
    # Policy: credit_score_thresholds with min/max/score
    # Thresholds ordered: >=700(0), 650-699(20), <=649(40)
    # Weak credit score if score would be > 0 (i.e., < 700)
    # Strong credit score if score would be 0 (i.e., >= 700)
    cs_thresholds = policy["Loan Credit Score Risk"]["credit_score_thresholds"]
    # Find the threshold for score > 0 (weak credit)
    weak_credit_threshold = 650  # fallback
    strong_credit_threshold = 700  # fallback
    for t in cs_thresholds:
        if t.get("score", 0) > 0 and "max" in t:
            weak_credit_threshold = t["max"] + 1  # e.g., 649+1 = 650
        if t.get("score", 0) == 0 and "min" in t:
            strong_credit_threshold = t["min"]  # e.g., 700
    
    if credit_score < weak_credit_threshold:
        reasons.append("Weak credit score")
    elif credit_score >= strong_credit_threshold:
        reasons.append("Strong credit score")

    # Existing Debt - use policy thresholds
    # Policy: existing_debt_thresholds with min/max/score
    # Existing debt found if > 0 (policy: min=1 score=30)
    ed_thresholds = policy["Loan Existing Debt Risk"]["existing_debt_thresholds"]
    debt_threshold = 1  # fallback
    for t in ed_thresholds:
        if "min" in t and t.get("score", 0) > 0:
            debt_threshold = t["min"]
            break
    
    if existing_debt >= debt_threshold:
        reasons.append("Existing debt found")
    else:
        reasons.append("Low existing debt")

    # Loan-to-Income - use policy thresholds
    # Policy: loan_to_income_thresholds with min/max/score
    # Thresholds: <=7(0), 7.01-10(15), >10.01(30)
    lti_thresholds = policy["Loan Income Ratio Risk"]["loan_to_income_thresholds"]
    high_lti_threshold = 10  # fallback
    medium_lti_threshold = 7  # fallback
    for t in lti_thresholds:
        if "min" in t and t.get("score", 0) >= 30:
            high_lti_threshold = t["min"] - 0.01 if t["min"] > 0 else 10  # e.g., 10.01 - 0.01 = 10
        elif "max" in t and t.get("score", 0) > 0:
            medium_lti_threshold = t["max"]  # e.g., 10
    
    loan_to_income = loan_amount / income if income > 0 else float('inf')
    if loan_to_income > high_lti_threshold:
        reasons.append("Loan amount exceeds income-based limit")
    elif loan_to_income > medium_lti_threshold:
        reasons.append("Loan amount is high relative to income")

    # Monthly EMI - NOT in policy thresholds (hardcoded 0.40)
    # Limitation: Monthly EMI threshold not configurable via policy
    if monthly_emi > income * 0.40:
        reasons.append("Monthly EMI is high relative to income")

    # Repayment History - NOT in policy thresholds (hardcoded good/poor)
    # Limitation: Repayment history thresholds not configurable via policy
    if repayment_history.lower() == "good":
        reasons.append("Good repayment history")
    elif repayment_history.lower() == "poor":
        reasons.append("Poor repayment history")

    # Independent Decision (using policy thresholds)
    high_risk_indicators = 0
    if credit_score < weak_credit_threshold:
        high_risk_indicators += 1
    if existing_debt >= debt_threshold:
        high_risk_indicators += 1
    if loan_to_income > high_lti_threshold:
        high_risk_indicators += 1
    if monthly_emi > income * 0.40:
        high_risk_indicators += 1
    if repayment_history.lower() == "poor":
        high_risk_indicators += 1

    decision_policy = policy["Loan Independent Decision"]["high_risk_indicators"]
    if high_risk_indicators <= decision_policy["approved_max"]:
        independent_decision = "APPROVED"
    elif high_risk_indicators >= decision_policy["rejected_min"]:
        independent_decision = "REJECTED"
    else:
        independent_decision = "REVIEW"

    # Risk Score
    risk_score, risk_level = calculate_risk_score(application)

    return {
        "independent_decision": independent_decision,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
    }


# ============================================================
# COMPARISON AND FINAL DECISION
# ============================================================

def compare_and_decide(application, bank_decision, assessment, model_probability=0.0, used_fallback=False):
    """Comparison step: takes completed assessment + bank decision + metadata."""
    independent_decision = assessment["independent_decision"]
    risk_score = assessment["risk_score"]
    risk_level = assessment["risk_level"]
    reasons = assessment["reasons"]

    # Verification Result
    if independent_decision == "APPROVED":
        verification_result = "VERIFIED" if bank_decision == "APPROVED" else "CONTRADICTED"
    elif independent_decision == "REJECTED":
        verification_result = "VERIFIED" if bank_decision == "REJECTED" else "CONTRADICTED"
    else:
        verification_result = "NEEDS REVIEW"

    # Recommendation
    if verification_result == "VERIFIED" and risk_level == "LOW":
        recommendation = "Proceed"
    else:
        recommendation = "Human review recommended"

    # Final Status
    if verification_result == "VERIFIED" and risk_level == "LOW":
        final_status = "VERIFIED"
    else:
        final_status = "HUMAN_REVIEW"

    return {
        "application_id": application["application_id"],
        "applicant_id": application["applicant_id"],
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

def verify_application(application, bank_decision: str, model_probability=0.0, used_fallback=False):
    assessment = assess_loan_independently(application)
    return compare_and_decide(application, bank_decision, assessment, model_probability, used_fallback)


# ============================================================
# SAVE RESULT TO BLUEPRINT DATABASE TABLES
# ============================================================

def save_verification_result(application, result):
    """
    Save verification result to database with error handling and rollback.
    Raises exception if persistence fails (no silent failure).
    """
    conn = None
    cur = None
    try:
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
                risk_level,
                reasons,
                final_status,
                model_probability,
                used_fallback
            )
            VALUES
            (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
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
                risk_level = EXCLUDED.risk_level,
                reasons = EXCLUDED.reasons,
                final_status = EXCLUDED.final_status,
                model_probability = EXCLUDED.model_probability,
                used_fallback = EXCLUDED.used_fallback
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
            result["risk_level"],
            json.dumps(result["reasons"]),
            result["final_status"],
            result.get("model_probability", 0.0),
            result.get("used_fallback", False)
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
                recommendation,
                final_status
            )
            VALUES
            (
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
        """, (
            "LOAN",
            result["application_id"],
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


# ============================================================
# MAIN PROGRAM
# ============================================================

if __name__ == "__main__":

    # Load blueprint-aligned loan dataset
    from ai.simulated_bank_ai import load_applications, generate_bank_response

    applications = load_applications()

    print("\nBANK AI VERIFICATION")
    print("====================")

    for application in applications:

        bank_decision = generate_bank_response(application)["bank_ai_decision"]
        result = verify_application(application, bank_decision)

        # Save into blueprint database tables
        save_verification_result(application, result)

        print("\nApplication:", result["application_id"])
        print("Applicant ID:", result["applicant_id"])
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