import sqlite3
import os

DB_PATH = "api/arari_pro.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables found:", tables)
except Exception as e:
    print(e)
finally:
    conn.close()
