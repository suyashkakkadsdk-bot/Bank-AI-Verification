import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

# Application database name extracted from DATABASE_URL for safety guard
APP_DB_NAME = None
if DATABASE_URL:
    try:
        # Extract database name from URL: postgresql://user:pass@host:port/dbname
        APP_DB_NAME = DATABASE_URL.split("/")[-1].split("?")[0]
    except Exception:
        pass


def get_connection(test: bool = False):
    """
    Get a database connection.
    
    Args:
        test: If True, use TEST_DATABASE_URL. If False, use DATABASE_URL.
    
    Returns:
        psycopg connection
    
    Raises:
        RuntimeError: If test=True but TEST_DATABASE_URL is not set, or if the
                     test database URL matches the application database URL.
    """
    if test:
        if not TEST_DATABASE_URL:
            raise RuntimeError(
                "TEST_DATABASE_URL environment variable is not set. "
                "Database-writing tests require a dedicated test database. "
                "Set TEST_DATABASE_URL in your environment."
            )
        
        # Safety guard: verify test database is not the application database
        test_db_name = None
        try:
            test_db_name = TEST_DATABASE_URL.split("/")[-1].split("?")[0]
        except Exception:
            pass
        
        if APP_DB_NAME and test_db_name and test_db_name == APP_DB_NAME:
            raise RuntimeError(
                f"TEST_DATABASE_URL points to the application database ('{APP_DB_NAME}'). "
                "Tests must use a dedicated test database. "
                "Set TEST_DATABASE_URL to a different database name."
            )
        
        return psycopg.connect(TEST_DATABASE_URL)
    
    return psycopg.connect(DATABASE_URL)