import sqlite3
from .connection import USE_POSTGRES

def add_column_if_not_exists(cursor, table: str, col_name: str, col_type: str):
    """Add column if it doesn't exist (works with both SQLite and PostgreSQL)"""
    if USE_POSTGRES:
        # PostgreSQL: Check if column exists first
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        """, (table, col_name))
        if cursor.fetchone() is None:
            try:
                cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}')
            except Exception:
                pass  # Column might already exist
    else:
        # SQLite: Just try to add, ignore error if exists
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists
