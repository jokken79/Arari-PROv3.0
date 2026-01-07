"""
Database configuration and initialization
Supports both SQLite (local) and PostgreSQL (Railway production)

Detection is automatic based on DATABASE_URL environment variable.
"""

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
    print(f"[DB] 🐘 Using PostgreSQL: {urlparse(DATABASE_URL).hostname}")
    import psycopg2
    from psycopg2.extras import RealDictCursor
else:
    print("[DB] 📁 Using SQLite (local mode)")

# Database file path (SQLite only)
DB_PATH = Path(__file__).parent / "arari_pro.db"


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
    - INSERT OR REPLACE -> INSERT ... ON CONFLICT DO UPDATE
    - INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
    """
    if not USE_POSTGRES:
        return query

    # Replace SQLite placeholders with PostgreSQL
    adapted = query.replace("?", "%s")

    # Note: INSERT OR REPLACE/IGNORE need manual handling per query
    # These simple replacements won't work for all cases

    return adapted


def _add_column_if_not_exists(cursor, table: str, col_name: str, col_type: str):
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


def init_db(conn=None):
    """Initialize the database with tables (SQLite or PostgreSQL)"""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    cursor = conn.cursor()

    # SQL type mappings for cross-database compatibility
    if USE_POSTGRES:
        PK_TYPE = "SERIAL PRIMARY KEY"
        REAL_TYPE = "DOUBLE PRECISION"
        TEXT_TYPE = "TEXT"
    else:
        PK_TYPE = "INTEGER PRIMARY KEY AUTOINCREMENT"
        REAL_TYPE = "REAL"
        TEXT_TYPE = "TEXT"

    # Create employees table
    employees_sql = f"""
        CREATE TABLE IF NOT EXISTS employees (
            id {PK_TYPE},
            employee_id {TEXT_TYPE} UNIQUE NOT NULL,
            name {TEXT_TYPE} NOT NULL,
            name_kana {TEXT_TYPE},
            dispatch_company {TEXT_TYPE} NOT NULL,
            department {TEXT_TYPE},
            hourly_rate {REAL_TYPE} NOT NULL DEFAULT 0,
            billing_rate {REAL_TYPE} NOT NULL DEFAULT 0,
            status {TEXT_TYPE} DEFAULT 'active',
            hire_date {TEXT_TYPE},
            created_at {TEXT_TYPE} DEFAULT CURRENT_TIMESTAMP,
            updated_at {TEXT_TYPE} DEFAULT CURRENT_TIMESTAMP
        )
    """
    cursor.execute(employees_sql)

    # Create payroll_records table
    payroll_sql = f"""
        CREATE TABLE IF NOT EXISTS payroll_records (
            id {PK_TYPE},
            employee_id {TEXT_TYPE} NOT NULL,
            period {TEXT_TYPE} NOT NULL,
            work_days INTEGER DEFAULT 0,
            work_hours {REAL_TYPE} DEFAULT 0,
            overtime_hours {REAL_TYPE} DEFAULT 0,
            night_hours {REAL_TYPE} DEFAULT 0,
            holiday_hours {REAL_TYPE} DEFAULT 0,
            overtime_over_60h {REAL_TYPE} DEFAULT 0,
            paid_leave_hours {REAL_TYPE} DEFAULT 0,
            paid_leave_days {REAL_TYPE} DEFAULT 0,
            paid_leave_amount {REAL_TYPE} DEFAULT 0,
            base_salary {REAL_TYPE} DEFAULT 0,
            overtime_pay {REAL_TYPE} DEFAULT 0,
            night_pay {REAL_TYPE} DEFAULT 0,
            holiday_pay {REAL_TYPE} DEFAULT 0,
            overtime_over_60h_pay {REAL_TYPE} DEFAULT 0,
            transport_allowance {REAL_TYPE} DEFAULT 0,
            other_allowances {REAL_TYPE} DEFAULT 0,
            gross_salary {REAL_TYPE} DEFAULT 0,
            social_insurance {REAL_TYPE} DEFAULT 0,
            welfare_pension {REAL_TYPE} DEFAULT 0,
            employment_insurance {REAL_TYPE} DEFAULT 0,
            income_tax {REAL_TYPE} DEFAULT 0,
            resident_tax {REAL_TYPE} DEFAULT 0,
            other_deductions {REAL_TYPE} DEFAULT 0,
            net_salary {REAL_TYPE} DEFAULT 0,
            billing_amount {REAL_TYPE} DEFAULT 0,
            company_social_insurance {REAL_TYPE} DEFAULT 0,
            company_employment_insurance {REAL_TYPE} DEFAULT 0,
            company_workers_comp {REAL_TYPE} DEFAULT 0,
            total_company_cost {REAL_TYPE} DEFAULT 0,
            gross_profit {REAL_TYPE} DEFAULT 0,
            profit_margin {REAL_TYPE} DEFAULT 0,
            created_at {TEXT_TYPE} DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period)
        )
    """
    cursor.execute(payroll_sql)

    # Add columns if not exists (for existing databases)
    # Use DOUBLE PRECISION for PostgreSQL, REAL for SQLite
    real_type = "DOUBLE PRECISION" if USE_POSTGRES else "REAL"

    new_columns = [
        ("company_workers_comp", f"{real_type} DEFAULT 0"),
        ("paid_leave_amount", f"{real_type} DEFAULT 0"),
        ("night_hours", f"{real_type} DEFAULT 0"),
        ("holiday_hours", f"{real_type} DEFAULT 0"),
        ("overtime_over_60h", f"{real_type} DEFAULT 0"),
        ("night_pay", f"{real_type} DEFAULT 0"),
        ("holiday_pay", f"{real_type} DEFAULT 0"),
        ("overtime_over_60h_pay", f"{real_type} DEFAULT 0"),
        ("non_billable_allowances", f"{real_type} DEFAULT 0"),  # 通勤手当（非）、業務手当等
        ("welfare_pension", f"{real_type} DEFAULT 0"),
        ("rent_deduction", f"{real_type} DEFAULT 0"),  # 家賃、寮費
        ("utilities_deduction", f"{real_type} DEFAULT 0"),  # 水道光熱、光熱費
        ("meal_deduction", f"{real_type} DEFAULT 0"),  # 弁当、弁当代
        ("advance_payment", f"{real_type} DEFAULT 0"),  # 前貸、前借
        ("year_end_adjustment", f"{real_type} DEFAULT 0"),  # 年調過不足
        ("absence_days", "INTEGER DEFAULT 0"),  # 欠勤日数
    ]

    for col_name, col_type in new_columns:
        _add_column_if_not_exists(cursor, "payroll_records", col_name, col_type)

    # NEW COLUMNS FOR EMPLOYEES TABLE
    employee_new_columns = [
        ("gender", "TEXT"),  # 性別: M/F
        ("birth_date", "TEXT"),  # 生年月日: YYYY-MM-DD
        ("employee_type", "TEXT DEFAULT 'haken'"),  # 従業員タイプ: haken/ukeoi
        ("termination_date", "TEXT"),  # 退社日: YYYY-MM-DD
    ]

    for col_name, col_type in employee_new_columns:
        _add_column_if_not_exists(cursor, "employees", col_name, col_type)

    # Create indexes for performance
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_payroll_period
        ON payroll_records(period)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_payroll_employee
        ON payroll_records(employee_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_employees_company
        ON employees(dispatch_company)
    """
    )

    # Composite indexes for frequently used query patterns
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_payroll_emp_period
        ON payroll_records(employee_id, period DESC)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_payroll_period_margin
        ON payroll_records(period, profit_margin)
    """
    )

    # ================================================================
    # SETTINGS TABLE - For configurable rates like 雇用保険
    # ================================================================
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Insert default settings if not exist
    default_settings = [
        (
            "employment_insurance_rate",
            "0.0090",
            "雇用保険（会社負担）- 2025年度: 0.90%",
        ),
        ("workers_comp_rate", "0.003", "労災保険 - 製造業: 0.3%"),
        ("fiscal_year", "2025", "適用年度"),
        ("target_margin", "15", "目標マージン率 (%) - 製造派遣"),
    ]

    if USE_POSTGRES:
        for key, value, description in default_settings:
            cursor.execute(
                """
                INSERT INTO settings (key, value, description)
                VALUES (%s, %s, %s)
                ON CONFLICT (key) DO NOTHING
            """,
                (key, value, description),
            )
    else:
        for key, value, description in default_settings:
            cursor.execute(
                """
                INSERT OR IGNORE INTO settings (key, value, description)
                VALUES (?, ?, ?)
            """,
                (key, value, description),
            )

    # ================================================================
    # FACTORY TEMPLATES TABLE - For Excel parser templates per factory
    # ================================================================
    if USE_POSTGRES:
        factory_templates_sql = f"""
            CREATE TABLE IF NOT EXISTS factory_templates (
                id SERIAL PRIMARY KEY,
                factory_identifier TEXT UNIQUE NOT NULL,
                template_name TEXT,
                field_positions JSONB NOT NULL,
                column_offsets JSONB NOT NULL,
                detected_allowances JSONB DEFAULT '{{}}'::jsonb,
                non_billable_allowances JSONB DEFAULT '[]'::jsonb,
                employee_column_width INTEGER DEFAULT 14,
                detection_confidence DOUBLE PRECISION DEFAULT 0.0,
                sample_employee_id TEXT,
                sample_period TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        """
    else:
        factory_templates_sql = """
            CREATE TABLE IF NOT EXISTS factory_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                factory_identifier TEXT UNIQUE NOT NULL,
                template_name TEXT,
                field_positions JSON NOT NULL,
                column_offsets JSON NOT NULL,
                detected_allowances JSON DEFAULT '{}',
                non_billable_allowances JSON DEFAULT '[]',
                employee_column_width INTEGER DEFAULT 14,
                detection_confidence REAL DEFAULT 0.0,
                sample_employee_id TEXT,
                sample_period TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        """
    cursor.execute(factory_templates_sql)

    # Create index for faster template lookups
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_factory_templates_identifier
        ON factory_templates(factory_identifier)
    """
    )

    conn.commit()

    # ================================================================
    # INITIALIZE AGENT TABLES
    # ================================================================

    # Import and initialize all agent tables
    try:
        from auth import init_auth_tables

        init_auth_tables(conn)
        print("[OK] Auth tables initialized")
    except Exception as e:
        print(f"[WARN] Auth tables: {e}")

    try:
        from alerts import init_alerts_tables

        init_alerts_tables(conn)
        print("[OK] Alerts tables initialized")
    except Exception as e:
        print(f"[WARN] Alerts tables: {e}")

    try:
        from audit import init_audit_tables

        init_audit_tables(conn)
        print("[OK] Audit tables initialized")
    except Exception as e:
        print(f"[WARN] Audit tables: {e}")

    try:
        from reports import init_reports_tables

        init_reports_tables(conn)
        print("[OK] Reports tables initialized")
    except Exception as e:
        print(f"[WARN] Reports tables: {e}")

    try:
        from budget import init_budget_tables

        init_budget_tables(conn)
        print("[OK] Budget tables initialized")
    except Exception as e:
        print(f"[WARN] Budget tables: {e}")

    try:
        from notifications import init_notification_tables

        init_notification_tables(conn)
        print("[OK] Notifications tables initialized")
    except Exception as e:
        print(f"[WARN] Notifications tables: {e}")

    try:
        from cache import init_cache_tables

        init_cache_tables(conn)
        print("[OK] Cache tables initialized")
    except Exception as e:
        print(f"[WARN] Cache tables: {e}")

    try:
        from backup import init_backup_system

        init_backup_system()
        print("[OK] Backup system initialized")
    except Exception as e:
        print(f"[WARN] Backup system: {e}")

    try:
        from additional_costs import init_additional_costs_tables

        init_additional_costs_tables(conn)
    except Exception as e:
        print(f"[WARN] Additional costs tables: {e}")

    # NO sample data - start with clean database
    # Users will upload their own payroll files
    if close_conn:
        conn.close()


def insert_sample_data(conn):
    """Insert sample data for demonstration"""
    cursor = conn.cursor()

    # Sample employees
    employees = [
        (
            "EMP001",
            "田中 太郎",
            "タナカ タロウ",
            "ABC株式会社",
            "製造部",
            1200,
            1800,
            "active",
            "2023-04-01",
        ),
        (
            "EMP002",
            "鈴木 花子",
            "スズキ ハナコ",
            "XYZ工業",
            "品質管理",
            1350,
            2100,
            "active",
            "2023-06-15",
        ),
        (
            "EMP003",
            "佐藤 次郎",
            "サトウ ジロウ",
            "ABC株式会社",
            "物流部",
            1150,
            1650,
            "active",
            "2023-08-01",
        ),
        (
            "EMP004",
            "高橋 美咲",
            "タカハシ ミサキ",
            "テック産業",
            "組立ライン",
            1400,
            2200,
            "active",
            "2023-03-01",
        ),
        (
            "EMP005",
            "伊藤 健太",
            "イトウ ケンタ",
            "XYZ工業",
            "製造部",
            1250,
            1900,
            "active",
            "2023-09-01",
        ),
        (
            "EMP006",
            "渡辺 さくら",
            "ワタナベ サクラ",
            "グローバル製造",
            "検査部",
            1300,
            2000,
            "active",
            "2023-05-15",
        ),
        (
            "EMP007",
            "山本 大輔",
            "ヤマモト ダイスケ",
            "ABC株式会社",
            "製造部",
            1180,
            1750,
            "active",
            "2023-07-01",
        ),
        (
            "EMP008",
            "中村 愛",
            "ナカムラ アイ",
            "テック産業",
            "事務",
            1100,
            1600,
            "active",
            "2023-10-01",
        ),
        (
            "EMP009",
            "小林 翔太",
            "コバヤシ ショウタ",
            "グローバル製造",
            "製造部",
            1280,
            1950,
            "active",
            "2023-04-15",
        ),
        (
            "EMP010",
            "加藤 真由美",
            "カトウ マユミ",
            "XYZ工業",
            "品質管理",
            1320,
            2050,
            "active",
            "2023-02-01",
        ),
        (
            "EMP011",
            "吉田 誠",
            "ヨシダ マコト",
            "ABC株式会社",
            "物流部",
            1220,
            1850,
            "active",
            "2023-11-01",
        ),
        (
            "EMP012",
            "山田 優子",
            "ヤマダ ユウコ",
            "テック産業",
            "組立ライン",
            1380,
            2150,
            "active",
            "2023-01-15",
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO employees (employee_id, name, name_kana, dispatch_company, department, hourly_rate, billing_rate, status, hire_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        employees,
    )

    # Sample payroll records for 6 months
    import random

    periods = [
        "2024年8月",
        "2024年9月",
        "2024年10月",
        "2024年11月",
        "2024年12月",
        "2025年1月",
    ]

    for emp in employees:
        employee_id = emp[0]
        hourly_rate = emp[5]
        billing_rate = emp[6]

        for period in periods:
            work_hours = 160 + random.randint(-8, 8)
            overtime_hours = random.randint(0, 30)
            paid_leave_hours = random.randint(0, 16)

            base_salary = hourly_rate * work_hours
            overtime_pay = hourly_rate * 1.25 * overtime_hours
            transport_allowance = 15000
            other_allowances = 5000
            gross_salary = (
                base_salary + overtime_pay + transport_allowance + other_allowances
            )

            # Deductions
            social_insurance = round(gross_salary * 0.15)
            employment_insurance = round(gross_salary * 0.006)
            income_tax = round(gross_salary * 0.05)
            resident_tax = round(gross_salary * 0.1)
            net_salary = (
                gross_salary
                - social_insurance
                - employment_insurance
                - income_tax
                - resident_tax
            )

            # Billing
            billing_amount = billing_rate * (work_hours + overtime_hours)

            # Company costs (2024年度 rates)
            company_social_insurance = social_insurance  # Same as employee (労使折半)
            company_employment_insurance = round(
                gross_salary * 0.009
            )  # 0.90% (2025年度)
            company_workers_comp = round(gross_salary * 0.003)  # 労災保険 0.3%
            # NOTE: paid_leave is already in gross_salary, don't add again
            # NOTE: transport is already in gross_salary, don't add again
            total_company_cost = (
                gross_salary
                + company_social_insurance
                + company_employment_insurance
                + company_workers_comp
            )

            # Profit
            gross_profit = billing_amount - total_company_cost
            profit_margin = (
                (gross_profit / billing_amount * 100) if billing_amount > 0 else 0
            )

            cursor.execute(
                """
                INSERT INTO payroll_records (
                    employee_id, period, work_days, work_hours, overtime_hours,
                    paid_leave_hours, paid_leave_days, base_salary, overtime_pay,
                    transport_allowance, other_allowances, gross_salary,
                    social_insurance, employment_insurance, income_tax, resident_tax,
                    net_salary, billing_amount, company_social_insurance,
                    company_employment_insurance, company_workers_comp, total_company_cost, gross_profit, profit_margin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    employee_id,
                    period,
                    work_hours // 8,
                    work_hours,
                    overtime_hours,
                    paid_leave_hours,
                    paid_leave_hours / 8,
                    base_salary,
                    overtime_pay,
                    transport_allowance,
                    other_allowances,
                    gross_salary,
                    social_insurance,
                    employment_insurance,
                    income_tax,
                    resident_tax,
                    net_salary,
                    billing_amount,
                    company_social_insurance,
                    company_employment_insurance,
                    company_workers_comp,
                    total_company_cost,
                    gross_profit,
                    profit_margin,
                ),
            )

    conn.commit()
    print(
        f"✅ Inserted {len(employees)} employees and {len(employees) * len(periods)} payroll records"
    )
