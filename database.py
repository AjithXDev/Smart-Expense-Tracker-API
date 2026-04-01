import psycopg2
import os
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def get_db():
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
    finally:
        conn.close()

@contextmanager
def get_db_context():
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
    finally:
        conn.close()