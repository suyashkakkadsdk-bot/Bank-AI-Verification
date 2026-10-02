from connection import get_connection


def split_into_chunks(text, chunk_size=500):
    words = text.split()
    chunks = []

    current_chunk = []
    current_length = 0

    for word in words:
        word_length = len(word) + 1

        if current_length + word_length > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_length = 0

        current_chunk.append(word)
        current_length += word_length

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


conn = get_connection()
cursor = conn.cursor()

# Get our document
cursor.execute(
    """
    SELECT id, content
    FROM documents
    WHERE title = %s
    """,
    ("Account Services",)
)

document = cursor.fetchone()

if document is None:
    print("DOCUMENT NOT FOUND")
    cursor.close()
    conn.close()
    exit()

document_id = document[0]
content = document[1]

# Split document into chunks
chunks = split_into_chunks(content)

# Remove old chunks if script is run again
cursor.execute(
    """
    DELETE FROM chunks
    WHERE document_id = %s
    """,
    (document_id,)
)

# Insert new chunks
for index, chunk in enumerate(chunks):
    cursor.execute(
        """
        INSERT INTO chunks (document_id, chunk_text, chunk_index)
        VALUES (%s, %s, %s)
        """,
        (document_id, chunk, index)
    )

conn.commit()

cursor.close()
conn.close()

print("DOCUMENT CHUNKING SUCCESSFUL")
print("Total chunks created:", len(chunks))