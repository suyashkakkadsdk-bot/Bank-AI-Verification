from connection import get_connection


conn = get_connection()
cursor = conn.cursor()

cursor.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")

tables = cursor.fetchall()

print("DATABASE TABLES:")

for table in tables:
    print("-", table[0])

cursor.close()
conn.close()