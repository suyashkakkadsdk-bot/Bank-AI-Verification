import easyocr


def extract_text_from_image(image_path):
    reader = easyocr.Reader(["en"])

    results = reader.readtext(image_path)

    extracted_text = []

    for _, text, confidence in results:
        extracted_text.append({
            "text": text,
            "confidence": round(confidence, 2)
        })

    return extracted_text


if __name__ == "__main__":
    image_path = "data/documents/loan_application.png"

    results = extract_text_from_image(image_path)

    print("\nOCR EXTRACTED TEXT")
    print("==================")

    for item in results:
        print(
            f"{item['text']} "
            f"(confidence: {item['confidence']})"
        )