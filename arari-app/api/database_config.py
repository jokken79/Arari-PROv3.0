"""
Database Configuration - Dual Support for SQLite and PostgreSQL

This module provides a unified interface that works with both:
- SQLite (local development)
- PostgreSQL (Railway/Render production)

Detection is automatic based on DATABASE_URL environment variable.
"""

import os
from urllib.parse import urlparse

# Detect database type from environment
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Railway uses postgresql:// but psycopg2 needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = DATABASE_URL.startswith("postgresql://")

if USE_POSTGRES:
    print(f"[DB] Using PostgreSQL: {urlparse(DATABASE_URL).hostname}")
else:
    print("[DB] Using SQLite (local mode)")


def get_db_type() -> str:
    """Return current database type"""
    return "postgresql" if USE_POSTGRES else "sqlite"


# SQL dialect differences
SQL_DIALECTS = {
    "sqlite": {
        "autoincrement": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "json_type": "JSON",
        "current_timestamp": "CURRENT_TIMESTAMP",
        "text_type": "TEXT",
        "real_type": "REAL",
        "integer_type": "INTEGER",
        "boolean_type": "INTEGER",  # SQLite uses 0/1
        "conflict_update": "INSERT OR REPLACE INTO",
        "returning": "",  # SQLite < 3.35 doesn't support RETURNING
    },
    "postgresql": {
        "autoincrement": "SERIAL PRIMARY KEY",
        "json_type": "JSONB",
        "current_timestamp": "CURRENT_TIMESTAMP",
        "text_type": "TEXT",
        "real_type": "DOUBLE PRECISION",
        "integer_type": "INTEGER",
        "boolean_type": "BOOLEAN",
        "conflict_update": "INSERT INTO",
        "returning": "RETURNING id",
    },
}


def get_dialect():
    """Get SQL dialect for current database"""
    return SQL_DIALECTS["postgresql" if USE_POSTGRES else "sqlite"]


def adapt_query(query: str) -> str:
    """
    Adapt SQLite query syntax to PostgreSQL if needed.

    Handles common differences:
    - ? placeholders -> %s (PostgreSQL)
    - AUTOINCREMENT -> SERIAL
    - INTEGER PRIMARY KEY -> SERIAL PRIMARY KEY
    """
    if not USE_POSTGRES:
        return query

    # Replace SQLite placeholders with PostgreSQL
    # Note: This is a simple replacement, complex queries may need manual handling
    adapted = query.replace("?", "%s")

    # Replace SQLite-specific syntax
    adapted = adapted.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    adapted = adapted.replace("AUTOINCREMENT", "")
    adapted = adapted.replace("INSERT OR REPLACE", "INSERT")
    adapted = adapted.replace("INSERT OR IGNORE", "INSERT")

    return adapted


# Connection factory
if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    def get_connection():
        """Create PostgreSQL connection"""
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = False
        return conn

    def dict_row_factory(cursor, row):
        """Convert row to dict (psycopg2 RealDictCursor handles this)"""
        return dict(row) if row else None

else:
    import sqlite3
    from pathlib import Path

    DB_PATH = Path(__file__).parent / "arari_pro.db"

    def get_connection():
        """Create SQLite connection"""
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def dict_row_factory(cursor, row):
        """Convert sqlite3.Row to dict"""
        return dict(row) if row else None


def get_db():
    """FastAPI dependency for database connection"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def execute_query(conn, query: str, params: tuple = ()):
    """Execute query with automatic dialect adaptation"""
    adapted_query = adapt_query(query)
    cursor = conn.cursor()
    cursor.execute(adapted_query, params)
    return cursor


def fetch_one(conn, query: str, params: tuple = ()):
    """Fetch single row as dict"""
    cursor = execute_query(conn, query, params)
    row = cursor.fetchone()
    if USE_POSTGRES:
        return dict(row) if row else None
    return dict(row) if row else None


def fetch_all(conn, query: str, params: tuple = ()):
    """Fetch all rows as list of dicts"""
    cursor = execute_query(conn, query, params)
    rows = cursor.fetchall()
    if USE_POSTGRES:
        return [dict(row) for row in rows]
    return [dict(row) for row in rows]
