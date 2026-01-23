#!/usr/bin/env python3
"""
Database Seed Script for Arari PRO v3.0

Creates test data in the database for development and testing.
Run from: python scripts/seed_db.py

Usage:
  python scripts/seed_db.py              # Seed with default data
  python scripts/seed_db.py --reset      # Reset DB first, then seed
  python scripts/seed_db.py --clear      # Clear existing seeds only
"""

import os
import sys
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db, init_db

# Test data constants
TEST_EMPLOYEES = [
    {
        "employee_id": "EMP001",
        "name": "山田太郎",
        "name_kana": "ヤマダタロウ",
        "dispatch_company": "Kato Mokuzai",
        "hourly_rate": 1500,  # 時給
        "billing_rate": 2500,  # 単価
        "nationality": "Japan",
        "status": "active",
        "hire_date": "2023-01-15",
        "department": "Manufacturing"
    },
    {
        "employee_id": "EMP002",
        "name": "田中花子",
        "name_kana": "タナカハナコ",
        "dispatch_company": "Kato Mokuzai",
        "hourly_rate": 1400,
        "billing_rate": 2300,
        "nationality": "Vietnam",
        "status": "active",
        "hire_date": "2023-02-20",
        "department": "Manufacturing"
    },
    {
        "employee_id": "EMP003",
        "name": "佐藤次郎",
        "name_kana": "サトウジロウ",
        "dispatch_company": "Kato Mokuzai",
        "hourly_rate": 1600,
        "billing_rate": 2700,
        "nationality": "Japan",
        "status": "active",
        "hire_date": "2023-03-10",
        "department": "Maintenance"
    },
    {
        "employee_id": "EMP004",
        "name": "グエン・トゥアン",
        "name_kana": "グエントゥアン",
        "dispatch_company": "Kato Mokuzai",
        "hourly_rate": 1350,
        "billing_rate": 2200,
        "nationality": "Vietnam",
        "status": "active",
        "hire_date": "2023-04-05",
        "department": "Manufacturing"
    },
]

TEST_PAYROLL_RECORDS = [
    {
        "employee_id": "EMP001",
        "period": "2025年1月",
        "work_hours": 160,
        "overtime_hours": 10,
        "night_hours": 5,
        "holiday_hours": 0,
        "work_days": 20,
        "paid_leave_days": 0,
        "absence_days": 0,
        "base_salary": 240000,
        "gross_salary": 265000,
        "net_salary": 240000,
        "social_insurance": 18000,
        "welfare_pension": 18000,
        "employment_insurance": 2385,
        "billing_amount": 445000,
    },
    {
        "employee_id": "EMP002",
        "period": "2025年1月",
        "work_hours": 160,
        "overtime_hours": 5,
        "night_hours": 2,
        "holiday_hours": 0,
        "work_days": 20,
        "paid_leave_days": 0,
        "absence_days": 0,
        "base_salary": 224000,
        "gross_salary": 237000,
        "net_salary": 215000,
        "social_insurance": 16800,
        "welfare_pension": 16800,
        "employment_insurance": 2133,
        "billing_amount": 408000,
    },
    {
        "employee_id": "EMP003",
        "period": "2025年1月",
        "work_hours": 160,
        "overtime_hours": 15,
        "night_hours": 8,
        "holiday_hours": 0,
        "work_days": 20,
        "paid_leave_days": 0,
        "absence_days": 0,
        "base_salary": 256000,
        "gross_salary": 285000,
        "net_salary": 260000,
        "social_insurance": 20250,
        "welfare_pension": 20250,
        "employment_insurance": 2565,
        "billing_amount": 486000,
    },
]

TEST_ADDITIONAL_COSTS = [
    {
        "dispatch_company": "Kato Mokuzai",
        "period": "2025年1月",
        "cost_type": "transport_bus",
        "amount": 50000,
        "notes": "送迎バス - 月間費用",
    },
    {
        "dispatch_company": "Kato Mokuzai",
        "period": "2025年1月",
        "cost_type": "uniform",
        "amount": 10000,
        "notes": "ユニフォーム交換",
    },
]

TEST_USERS = [
    {
        "username": "admin",
        "email": "admin@arari-pro.local",
        "full_name": "System Administrator",
        "is_admin": True,
        "is_active": True,
    },
    {
        "username": "manager",
        "email": "manager@arari-pro.local",
        "full_name": "Store Manager",
        "is_admin": False,
        "is_active": True,
    },
    {
        "username": "accountant",
        "email": "accountant@arari-pro.local",
        "full_name": "Accountant",
        "is_admin": False,
        "is_active": True,
    },
]


def clear_seeds(db: sqlite3.Connection) -> None:
    """Clear existing seed data from tables."""
    cursor = db.cursor()
    print("🗑️  Clearing existing seed data...")

    try:
        # Delete in reverse order of dependencies
        cursor.execute("DELETE FROM payroll_records WHERE employee_id LIKE 'EMP%'")
        cursor.execute("DELETE FROM employees WHERE employee_id LIKE 'EMP%'")
        cursor.execute("DELETE FROM additional_costs WHERE dispatch_company = 'Kato Mokuzai'")
        print("✓ Cleared employees, payroll records, and additional costs")
        db.commit()
    except Exception as e:
        print(f"⚠️  Warning while clearing data: {e}")
        db.rollback()


def seed_employees(db: sqlite3.Connection) -> None:
    """Seed test employees into database."""
    cursor = db.cursor()
    print("\n👥 Seeding employees...")

    for emp in TEST_EMPLOYEES:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate,
                 billing_rate, nationality, status, hire_date, department)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                emp["employee_id"],
                emp["name"],
                emp["name_kana"],
                emp["dispatch_company"],
                emp["hourly_rate"],
                emp["billing_rate"],
                emp["nationality"],
                emp["status"],
                emp["hire_date"],
                emp["department"],
            ))
            print(f"  ✓ {emp['employee_id']}: {emp['name']}")
        except Exception as e:
            print(f"  ✗ Failed to seed {emp['employee_id']}: {e}")

    db.commit()


def seed_payroll(db: sqlite3.Connection) -> None:
    """Seed test payroll records into database."""
    cursor = db.cursor()
    print("\n💰 Seeding payroll records...")

    for record in TEST_PAYROLL_RECORDS:
        try:
            # Calculate derived values
            company_social_insurance = record["social_insurance"]
            company_employment_insurance = record["gross_salary"] * 0.0090
            company_workers_comp = record["gross_salary"] * 0.0030
            total_company_cost = (
                record["gross_salary"]
                + company_social_insurance
                + company_employment_insurance
                + company_workers_comp
            )
            gross_profit = record["billing_amount"] - total_company_cost
            profit_margin = (gross_profit / record["billing_amount"] * 100) if record["billing_amount"] > 0 else 0

            cursor.execute("""
                INSERT OR REPLACE INTO payroll_records
                (employee_id, period, work_hours, overtime_hours, overtime_over_60h,
                 night_hours, holiday_hours, work_days, paid_leave_days, absence_days,
                 base_salary, gross_salary, net_salary, social_insurance, welfare_pension,
                 employment_insurance, company_social_insurance, company_employment_insurance,
                 company_workers_comp, billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["employee_id"],
                record["period"],
                record["work_hours"],
                record["overtime_hours"],
                max(0, record["overtime_hours"] - 60),
                record["night_hours"],
                record["holiday_hours"],
                record["work_days"],
                record["paid_leave_days"],
                record["absence_days"],
                record["base_salary"],
                record["gross_salary"],
                record["net_salary"],
                record["social_insurance"],
                record["welfare_pension"],
                record["employment_insurance"],
                company_social_insurance,
                company_employment_insurance,
                company_workers_comp,
                record["billing_amount"],
                total_company_cost,
                gross_profit,
                profit_margin,
            ))
            print(f"  ✓ {record['employee_id']} - {record['period']}")
        except Exception as e:
            print(f"  ✗ Failed to seed {record['employee_id']}: {e}")

    db.commit()


def seed_additional_costs(db: sqlite3.Connection) -> None:
    """Seed test additional costs into database."""
    cursor = db.cursor()
    print("\n📊 Seeding additional costs...")

    for cost in TEST_ADDITIONAL_COSTS:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO additional_costs
                (dispatch_company, period, cost_type, amount, notes, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cost["dispatch_company"],
                cost["period"],
                cost["cost_type"],
                cost["amount"],
                cost["notes"],
                "seed_script",
                datetime.now().isoformat(),
                datetime.now().isoformat(),
            ))
            print(f"  ✓ {cost['cost_type']}: ¥{cost['amount']:,}")
        except Exception as e:
            print(f"  ✗ Failed to seed {cost['cost_type']}: {e}")

    db.commit()


def seed_companies(db: sqlite3.Connection) -> None:
    """Seed test companies into database."""
    cursor = db.cursor()
    print("\n🏢 Seeding companies...")

    companies = [
        ("Kato Mokuzai", True, "加藤木材 - 製造派遣"),
    ]

    for company_name, is_active, description in companies:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO companies (name, is_active, description)
                VALUES (?, ?, ?)
            """, (company_name, is_active, description))
            print(f"  ✓ {company_name}")
        except Exception as e:
            print(f"  ✗ Failed to seed {company_name}: {e}")

    db.commit()


def main():
    """Main seed function."""
    import argparse

    parser = argparse.ArgumentParser(description="Seed database with test data")
    parser.add_argument("--reset", action="store_true", help="Reset database before seeding")
    parser.add_argument("--clear", action="store_true", help="Clear only seeds, don't re-seed")
    args = parser.parse_args()

    print("🌱 Arari PRO Database Seed Script")
    print("=" * 50)

    # Get database connection
    try:
        db = next(get_db())
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)

    try:
        # Reset database if requested
        if args.reset:
            print("⚠️  Resetting database...")
            try:
                cursor = db.cursor()
                cursor.execute("DROP TABLE IF EXISTS payroll_records")
                cursor.execute("DROP TABLE IF EXISTS employees")
                cursor.execute("DROP TABLE IF EXISTS additional_costs")
                cursor.execute("DROP TABLE IF EXISTS companies")
                db.commit()
                print("✓ Database reset complete")
            except Exception as e:
                print(f"❌ Failed to reset database: {e}")
                sys.exit(1)

            # Re-initialize database
            print("Initializing database...")
            init_db()
            db = next(get_db())

        # Clear existing seeds
        clear_seeds(db)

        # Exit if only clearing
        if args.clear:
            print("✓ Seed data cleared")
            return

        # Seed new data
        seed_companies(db)
        seed_employees(db)
        seed_payroll(db)
        seed_additional_costs(db)

        print("\n" + "=" * 50)
        print("✅ Database seeding complete!")
        print("\n📝 Test Accounts:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\n🔍 Quick Start:")
        print("  Frontend: http://localhost:3000")
        print("  Backend:  http://localhost:8000")
        print("  API Docs: http://localhost:8000/docs")
        print("  Health:   http://localhost:8000/api/health")

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
