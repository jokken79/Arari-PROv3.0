import os
import sqlite3
from pathlib import Path
from urllib.parse import urlparse

# Detect database type from environment
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Railway uses postgres:// but psycopg2 needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = DATABASE_URL.startswith("postgresql://")

if USE_POSTGRES:
    print(f"[DB] [PostgreSQL] Using PostgreSQL: {urlparse(DATABASE_URL).hostname}")
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("[DB] [WARN] psycopg2 not installed, PostgreSQL will not work.")
else:
    print("[DB] [SQLite] Using SQLite (local mode)")

# Database file path (SQLite only) - Adjusted for package structure
# Was: Path(__file__).parent / "arari_pro.db"
# Now: Path(__file__).parent.parent / "arari_pro.db"
DB_PATH = Path(__file__).parent.parent / "arari_pro.db"


def get_connection(db_path=None):
    """Create a new database connection (SQLite or PostgreSQL)"""
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = False
        return conn
    else:
        path = db_path if db_path else str(DB_PATH)
        conn = sqlite3.connect(path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        # Enable foreign key constraints (disabled by default in SQLite)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


def get_db():
    """Dependency for FastAPI to get database connection"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def adapt_query(query: str) -> str:
    """
    Adapt SQLite query syntax to PostgreSQL if needed.

    Handles common differences:
    - ? placeholders -> %s (PostgreSQL)
    """
    if not USE_POSTGRES:
        return query

    # Replace SQLite placeholders with PostgreSQL
    adapted = query.replace("?", "%s")
    return adapted
