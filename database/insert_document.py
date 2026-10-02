from connection import get_connection

conn = get_connection()
cursor = conn.cursor()

with open(
    "data/documents/account_services.txt",
    encoding="utf-8"
) as file:
    content = file.read()

cursor.execute(
    """
    INSERT INTO documents (title, content, source)
    VALUES (%s, %s, %s)
    """,
    (
        "Account Services",
        content,
        "account_services.txt"
    )
)

conn.commit()

cursor.close()
conn.close()

print("DOCUMENT INSERTED SUCCESSFULLY")