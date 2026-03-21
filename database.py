import sqlite3

def get_db():
    conn=sqlite3.connect("expense.db",check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn