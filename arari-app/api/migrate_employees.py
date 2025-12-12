"""
migrate_employees.py - Sync employees from ChinginGenerator database

This module provides functionality to migrate/sync employees from
the ChinginGenerator database to the Arari PRO database.
"""

import sqlite3
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import os


def get_chingin_db_path() -> Optional[Path]:
    """
    Find the ChinginGenerator database path.
    Looks in common locations.
    """
    possible_paths = [
        Path.home() / "ChinginGenerator" / "data" / "employees.db",
        Path.home() / "Documents" / "ChinginGenerator" / "employees.db",
        Path("/app/chingin/employees.db"),
        Path("../ChinginGenerator/data/employees.db"),
    ]

    for path in possible_paths:
        if path.exists():
            return path

    return None


def migrate_employees_sync(db: sqlite3.Connection) -> Tuple[bool, Dict[str, Any]]:
    """
    Sync employees from ChinginGenerator database to Arari PRO.

    Args:
        db: SQLite connection to Arari PRO database

    Returns:
        Tuple of (success: bool, stats: dict)
    """
    stats = {
        'total_added': 0,
        'total_updated': 0,
        'total_skipped': 0,
        'errors': [],
        'error': None
    }

    try:
        # Find ChinginGenerator database
        chingin_db_path = get_chingin_db_path()

        if not chingin_db_path:
            # If no external database, return success with 0 records
            stats['error'] = "ChinginGenerator database not found. No employees to sync."
            return False, stats

        # Connect to ChinginGenerator database
        chingin_conn = sqlite3.connect(str(chingin_db_path))
        chingin_conn.row_factory = sqlite3.Row
        chingin_cursor = chingin_conn.cursor()

        # Get employees from ChinginGenerator
        chingin_cursor.execute("""
            SELECT
                employee_id,
                name,
                name_kana,
                company as dispatch_company,
                department,
                hourly_rate,
                billing_rate,
                status,
                hire_date,
                employee_type,
                gender,
                birth_date,
                termination_date
            FROM employees
            WHERE employee_id IS NOT NULL AND employee_id != ''
        """)

        employees = chingin_cursor.fetchall()

        if not employees:
            stats['error'] = "No employees found in ChinginGenerator database"
            chingin_conn.close()
            return False, stats

        # Sync to Arari PRO
        cursor = db.cursor()

        for emp in employees:
            try:
                # Check if employee exists
                cursor.execute(
                    "SELECT id FROM employees WHERE employee_id = ?",
                    (emp['employee_id'],)
                )
                existing = cursor.fetchone()

                # Insert or update
                cursor.execute("""
                    INSERT OR REPLACE INTO employees
                    (employee_id, name, name_kana, dispatch_company, department,
                     hourly_rate, billing_rate, status, hire_date, employee_type,
                     gender, birth_date, termination_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (
                    emp['employee_id'],
                    emp['name'],
                    emp['name_kana'],
                    emp['dispatch_company'] or 'Unknown',
                    emp['department'],
                    emp['hourly_rate'] or 0,
                    emp['billing_rate'] or 0,
                    emp['status'] or 'active',
                    emp['hire_date'],
                    emp['employee_type'] or 'haken',
                    emp['gender'],
                    emp['birth_date'],
                    emp['termination_date']
                ))

                if existing:
                    stats['total_updated'] += 1
                else:
                    stats['total_added'] += 1

            except Exception as e:
                stats['errors'].append(f"Error with {emp['employee_id']}: {str(e)}")
                stats['total_skipped'] += 1

        db.commit()
        chingin_conn.close()

        return True, stats

    except Exception as e:
        stats['error'] = str(e)
        return False, stats


def migrate_from_excel(db: sqlite3.Connection, excel_path: str) -> Tuple[bool, Dict[str, Any]]:
    """
    Alternative: Migrate employees from Excel file.

    Args:
        db: SQLite connection to Arari PRO database
        excel_path: Path to Excel file with employee data

    Returns:
        Tuple of (success: bool, stats: dict)
    """
    from employee_parser import DBGenzaiXParser

    stats = {
        'total_added': 0,
        'total_updated': 0,
        'total_skipped': 0,
        'errors': [],
        'error': None
    }

    try:
        parser = DBGenzaiXParser()
        employees, parse_stats = parser.parse_employees(excel_path)

        if parser.errors:
            stats['errors'] = parser.errors
            stats['error'] = parser.errors[0]
            return False, stats

        cursor = db.cursor()

        for emp in employees:
            try:
                cursor.execute(
                    "SELECT id FROM employees WHERE employee_id = ?",
                    (emp.employee_id,)
                )
                existing = cursor.fetchone()

                cursor.execute("""
                    INSERT OR REPLACE INTO employees
                    (employee_id, name, name_kana, dispatch_company, department,
                     hourly_rate, billing_rate, status, hire_date, employee_type,
                     gender, birth_date, termination_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (
                    emp.employee_id,
                    emp.name,
                    emp.name_kana,
                    emp.dispatch_company or 'Unknown',
                    emp.department,
                    emp.hourly_rate or 0,
                    emp.billing_rate or 0,
                    emp.status or 'active',
                    emp.hire_date,
                    emp.employee_type or 'haken',
                    emp.gender,
                    emp.birth_date,
                    emp.termination_date
                ))

                if existing:
                    stats['total_updated'] += 1
                else:
                    stats['total_added'] += 1

            except Exception as e:
                stats['errors'].append(f"Error with {emp.employee_id}: {str(e)}")
                stats['total_skipped'] += 1

        db.commit()
        stats['total_skipped'] = parse_stats.get('rows_skipped', 0)

        return True, stats

    except Exception as e:
        stats['error'] = str(e)
        return False, stats
