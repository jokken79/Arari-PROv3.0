#!/usr/bin/env python3
"""
Migration Script: SQLite → PostgreSQL

Usage:
  # Export from SQLite
  python migrate_to_postgres.py --export

  # Import to PostgreSQL (set DATABASE_URL first)
  export DATABASE_URL="postgresql://user:pass@host:5432/db"
  python migrate_to_postgres.py --import data_export.json
"""

import json
import sqlite3
import sys
import os
from pathlib import Path
from datetime import datetime

# Tables to migrate (in order for foreign key constraints)
TABLES = [
    "employees",
    "payroll_records",
    "settings",
    "factory_templates",
    "users",
    "alerts",
]


def export_sqlite(output_file: str = "data_export.json"):
    """Export all data from SQLite to JSON"""
    db_path = Path(__file__).parent / "arari_pro.db"

    if not db_path.exists():
        print(f"[ERROR] SQLite database not found: {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    export_data = {
        "exported_at": datetime.now().isoformat(),
        "source": "sqlite",
        "tables": {},
    }

    for table in TABLES:
        try:
            cursor = conn.execute(f"SELECT * FROM {table}")
            rows = [dict(row) for row in cursor.fetchall()]
            export_data["tables"][table] = rows
            print(f"[OK] {table}: {len(rows)} rows")
        except sqlite3.OperationalError as e:
            print(f"[SKIP] {table}: {e}")

    conn.close()

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n[SUCCESS] Exported to {output_file}")
    return output_file


def import_postgres(input_file: str):
    """Import JSON data to PostgreSQL"""
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        print("[ERROR] DATABASE_URL environment variable not set")
        print("  export DATABASE_URL='postgresql://user:pass@host:5432/db'")
        sys.exit(1)

    # Fix Railway's postgres:// prefix
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    import psycopg2
    from psycopg2.extras import execute_values

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    print(f"[INFO] Importing from {input_file}")
    print(f"[INFO] Exported at: {data.get('exported_at')}")

    # Initialize tables first
    from database import init_db

    init_db(conn)

    for table, rows in data.get("tables", {}).items():
        if not rows:
            print(f"[SKIP] {table}: no data")
            continue

        # Get column names from first row
        columns = list(rows[0].keys())

        # Build INSERT query
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)

        # Clear existing data
        cursor.execute(f"DELETE FROM {table}")

        # Insert rows
        for row in rows:
            values = [row.get(col) for col in columns]
            try:
                cursor.execute(
                    f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})",
                    values,
                )
            except Exception as e:
                print(f"[WARN] {table} row error: {e}")

        print(f"[OK] {table}: {len(rows)} rows imported")

    conn.commit()
    conn.close()

    print(f"\n[SUCCESS] Import complete")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "--export":
        output = sys.argv[2] if len(sys.argv) > 2 else "data_export.json"
        export_sqlite(output)

    elif command == "--import":
        if len(sys.argv) < 3:
            print("[ERROR] Specify input file: --import data_export.json")
            sys.exit(1)
        import_postgres(sys.argv[2])

    else:
        print(f"[ERROR] Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
