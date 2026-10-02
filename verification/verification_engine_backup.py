import json
from database.connection import get_connection


# ============================================================
# RISK SCORE CALCULATION
# ============================================================

def calculate_risk_score(application):
    credit_score = application["credit_score"]
    loan_amount = application["loan_amount"]
    monthly_income = application["monthly_income"]
    existing_loan = application["existing_loan"]

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
    if existing_loan:
        score += 30

    # --------------------------------------------------------
    # 3. Loan-to-Income Risk
    # --------------------------------------------------------
    if loan_amount > monthly_income * 10:
        score += 30
    elif loan_amount > monthly_income * 7:
        score += 15

    # Maximum score = 100
    score = min(score, 100)

    # --------------------------------------------------------
    # Risk Level - Blueprint Thresholds
    # --------------------------------------------------------
    if score <= 30:
        risk_level = "LOW"
    elif score <= 70:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return score, risk_level


# ============================================================
# LOAN VERIFICATION
# ============================================================

def verify_application(application):

    credit_score = application["credit_score"]
    loan_amount = application["loan_amount"]
    monthly_income = application["monthly_income"]
    existing_loan = application["existing_loan"]
    bank_decision = application["bank_ai_decision"]

    reasons = []

    # --------------------------------------------------------
    # Rule 1: Credit Score
    # --------------------------------------------------------
    if credit_score < 700:
        reasons.append("Credit score below 700")

    # --------------------------------------------------------
    # Rule 2: Existing Loan
    # --------------------------------------------------------
    if existing_loan:
        reasons.append("Existing loan found")

    # --------------------------------------------------------
    # Rule 3: Loan Amount vs Monthly Income
    # --------------------------------------------------------
    if loan_amount > monthly_income * 10:
        reasons.append("Loan amount exceeds income-based limit")

    # --------------------------------------------------------
    # Independent Verification Decision
    # --------------------------------------------------------
    if reasons:
        verified_decision = "Review Required"
    else:
        verified_decision = "Eligible"

    # --------------------------------------------------------
    # Compare Bank AI Decision with Verification Decision
    # --------------------------------------------------------
    if bank_decision == verified_decision:
        verification_status = "VERIFIED"
    else:
        verification_status = "FLAGGED"

    # --------------------------------------------------------
    # Calculate Risk Score
    # --------------------------------------------------------
    risk_score, risk_level = calculate_risk_score(application)

    # --------------------------------------------------------
    # Recommendation
    # --------------------------------------------------------
    if verification_status == "FLAGGED":
        recommendation = "Human Review"
    elif risk_level == "HIGH":
        recommendation = "Immediate Human Review"
    elif risk_level == "MEDIUM":
        recommendation = "Human Review"
    else:
        recommendation = "Proceed"

    # --------------------------------------------------------
    # Final Verification Result
    # --------------------------------------------------------
    return {
        "application_id": application["application_id"],
        "bank_ai_decision": bank_decision,
        "verified_decision": verified_decision,
        "verification_status": verification_status,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation
    }


# ============================================================
# SAVE VERIFICATION RESULT TO DATABASE
# ============================================================

def save_verification_result(result):

    conn = get_connection()
    cur = conn.cursor()

    # Create verification results table if it does not exist
    cur.execute("""
        CREATE TABLE IF NOT EXISTS verification_results (
            id SERIAL PRIMARY KEY,
            application_id VARCHAR(50) UNIQUE NOT NULL,
            bank_ai_decision VARCHAR(100) NOT NULL,
            verified_decision VARCHAR(100) NOT NULL,
            verification_status VARCHAR(50) NOT NULL,
            risk_score INTEGER,
            risk_level VARCHAR(20),
            reasons TEXT,
            recommendation VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add columns if the table already existed before risk-score update
    cur.execute("""
        ALTER TABLE verification_results
        ADD COLUMN IF NOT EXISTS risk_score INTEGER
    """)

    cur.execute("""
        ALTER TABLE verification_results
        ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20)
    """)

    cur.execute("""
        ALTER TABLE verification_results
        ADD COLUMN IF NOT EXISTS recommendation VARCHAR(100)
    """)

    # Insert / Update result
    cur.execute("""
        INSERT INTO verification_results
        (
            application_id,
            bank_ai_decision,
            verified_decision,
            verification_status,
            risk_score,
            risk_level,
            reasons,
            recommendation
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)

        ON CONFLICT (application_id)
        DO UPDATE SET
            bank_ai_decision = EXCLUDED.bank_ai_decision,
            verified_decision = EXCLUDED.verified_decision,
            verification_status = EXCLUDED.verification_status,
            risk_score = EXCLUDED.risk_score,
            risk_level = EXCLUDED.risk_level,
            reasons = EXCLUDED.reasons,
            recommendation = EXCLUDED.recommendation
    """, (
        result["application_id"],
        result["bank_ai_decision"],
        result["verified_decision"],
        result["verification_status"],
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

    applications = [

        {
            "application_id": "LN001",
            "credit_score": 760,
            "loan_amount": 500000,
            "monthly_income": 60000,
            "existing_loan": False,
            "bank_ai_decision": "Eligible"
        },

        {
            "application_id": "LN002",
            "credit_score": 610,
            "loan_amount": 800000,
            "monthly_income": 35000,
            "existing_loan": True,
            "bank_ai_decision": "Review Required"
        },

        {
            "application_id": "LN003",
            "credit_score": 720,
            "loan_amount": 300000,
            "monthly_income": 45000,
            "existing_loan": False,
            "bank_ai_decision": "Eligible"
        }
    ]

    print("\nBANK AI VERIFICATION")
    print("====================")

    for application in applications:

        result = verify_application(application)

        # Save result to database
        save_verification_result(result)

        print("\nApplication:", result["application_id"])
        print("Bank AI Decision:", result["bank_ai_decision"])
        print("Verified Decision:", result["verified_decision"])
        print("Status:", result["verification_status"])
        print("Risk Score:", result["risk_score"], "/ 100")
        print("Risk Level:", result["risk_level"])
        print("Recommendation:", result["recommendation"])

        if result["reasons"]:
            print("Reasons:")

            for reason in result["reasons"]:
                print("-", reason)
        else:
            print("Reasons: No major risk factors detected")

        print("Saved to database: YES")