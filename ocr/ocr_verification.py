from ocr.ocr_reader import extract_text_from_image
from ocr.loan_parser import parse_loan_ocr
from verification.verification_engine import verify_application


def verify_loan_document(image_path):
    # Step 1: OCR
    ocr_results = extract_text_from_image(image_path)

    # Step 2: Convert OCR text into structured loan data
    application_data = parse_loan_ocr(ocr_results)

    # Step 3: Verification Engine
    verification_result = verify_application(application_data)

    return verification_result


if __name__ == "__main__":
    image_path = "data/documents/loan_application.png"

    result = verify_loan_document(image_path)

    print("\nOCR → VERIFICATION RESULT")
    print("=========================")

    for key, value in result.items():
        print(f"{key}: {value}")