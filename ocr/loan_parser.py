import re


def parse_loan_ocr(ocr_results):
    """
    Converts OCR extracted text into structured loan application data.
    """

    loan_data = {}

    for item in ocr_results:
        text = item["text"].strip()

        if text.startswith("Application ID:"):
            loan_data["application_id"] = text.split(":", 1)[1].strip()

        elif text.startswith("Applicant ID:"):
            loan_data["applicant_id"] = text.split(":", 1)[1].strip()

        elif text.startswith("Income:"):
            value = text.split(":", 1)[1].strip()
            loan_data["income"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Credit Score:"):
            value = text.split(":", 1)[1].strip()
            loan_data["credit_score"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Employment Status:"):
            loan_data["employment_status"] = text.split(":", 1)[1].strip()

        elif text.startswith("Existing Debt:"):
            value = text.split(":", 1)[1].strip()
            loan_data["existing_debt"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Monthly EMI:"):
            value = text.split(":", 1)[1].strip()
            loan_data["monthly_emi"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Loan Amount:"):
            value = text.split(":", 1)[1].strip()
            loan_data["loan_amount"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Loan Tenure:"):
            value = text.split(":", 1)[1].strip()
            loan_data["loan_tenure"] = int(re.sub(r"[^\d]", "", value))

        elif text.startswith("Repayment History:"):
            loan_data["repayment_history"] = text.split(":", 1)[1].strip()

    return loan_data


if __name__ == "__main__":
    from ocr_reader import extract_text_from_image

    image_path = "data/documents/loan_application.png"

    ocr_results = extract_text_from_image(image_path)

    parsed_data = parse_loan_ocr(ocr_results)

    print("\nSTRUCTURED LOAN DATA")
    print("====================")

    for key, value in parsed_data.items():
        print(f"{key}: {value}")