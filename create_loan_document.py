from PIL import Image, ImageDraw, ImageFont


image = Image.new("RGB", (1200, 800), "white")
draw = ImageDraw.Draw(image)

font = ImageFont.load_default(size=28)
title_font = ImageFont.load_default(size=40)

draw.text((80, 50), "LOAN APPLICATION", fill="black", font=title_font)

lines = [
    "Application ID: LN001",
    "Applicant ID: APP001",
    "Income: 60000",
    "Credit Score: 760",
    "Employment Status: Salaried",
    "Existing Debt: 0",
    "Monthly EMI: 5000",
    "Loan Amount: 300000",
    "Loan Tenure: 36",
    "Repayment History: Good"
]

y = 140

for line in lines:
    draw.text((100, y), line, fill="black", font=font)
    y += 55

output_path = "data/documents/loan_application.png"

image.save(output_path)

print(f"Loan document created: {output_path}")