import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

try:
    if not DB_URL:
        print("DATABASE_URL not found in .env")
        exit(1)

    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    print("Deleting all data...")
    # CASCADE simplifies things by deleting rows in child tables that reference wiped rows
    # RESTART IDENTITY resets the auto-increment counters back to 1
    cursor.execute("TRUNCATE TABLE recurring_expenses, expenses, users RESTART IDENTITY CASCADE;")
    
    conn.commit()
    print("✅ All data, expenses, and users have been deleted successfully! Database is fresh.")
except Exception as e:
    print(f"❌ Error clearing database: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
