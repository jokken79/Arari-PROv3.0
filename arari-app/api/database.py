"""
Database configuration and initialization
SQLite database for 粗利 PRO
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager

# Database file path
DB_PATH = Path(__file__).parent / "arari_pro.db"

def get_connection(db_path=None):
    """Create a new database connection"""
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

def init_db(conn=None):
    """Initialize the database with tables"""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    cursor = conn.cursor()

    # Create employees table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            name_kana TEXT,
            dispatch_company TEXT NOT NULL,
            department TEXT,
            hourly_rate REAL NOT NULL DEFAULT 0,
            billing_rate REAL NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'active',
            hire_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create payroll_records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payroll_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT NOT NULL,
            period TEXT NOT NULL,
            work_days INTEGER DEFAULT 0,
            work_hours REAL DEFAULT 0,
            overtime_hours REAL DEFAULT 0,
            night_hours REAL DEFAULT 0,
            holiday_hours REAL DEFAULT 0,
            overtime_over_60h REAL DEFAULT 0,
            paid_leave_hours REAL DEFAULT 0,
            paid_leave_days REAL DEFAULT 0,
            paid_leave_amount REAL DEFAULT 0,
            base_salary REAL DEFAULT 0,
            overtime_pay REAL DEFAULT 0,
            night_pay REAL DEFAULT 0,
            holiday_pay REAL DEFAULT 0,
            overtime_over_60h_pay REAL DEFAULT 0,
            transport_allowance REAL DEFAULT 0,
            other_allowances REAL DEFAULT 0,
            gross_salary REAL DEFAULT 0,
            social_insurance REAL DEFAULT 0,
            welfare_pension REAL DEFAULT 0,
            employment_insurance REAL DEFAULT 0,
            income_tax REAL DEFAULT 0,
            resident_tax REAL DEFAULT 0,
            other_deductions REAL DEFAULT 0,
            net_salary REAL DEFAULT 0,
            billing_amount REAL DEFAULT 0,
            company_social_insurance REAL DEFAULT 0,
            company_employment_insurance REAL DEFAULT 0,
            company_workers_comp REAL DEFAULT 0,
            total_company_cost REAL DEFAULT 0,
            gross_profit REAL DEFAULT 0,
            profit_margin REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
            UNIQUE(employee_id, period)
        )
    """)

    # Add columns if not exists (for existing databases)
    new_columns = [
        ("company_workers_comp", "REAL DEFAULT 0"),
        ("paid_leave_amount", "REAL DEFAULT 0"),
        ("night_hours", "REAL DEFAULT 0"),
        ("holiday_hours", "REAL DEFAULT 0"),
        ("overtime_over_60h", "REAL DEFAULT 0"),
        ("night_pay", "REAL DEFAULT 0"),
        ("holiday_pay", "REAL DEFAULT 0"),
        ("overtime_over_60h_pay", "REAL DEFAULT 0"),
        ("non_billable_allowances", "REAL DEFAULT 0"),  # 通勤手当（非）、業務手当等 - 会社負担のみ
        ("welfare_pension", "REAL DEFAULT 0"),
        # ================================================================
        # NEW COLUMNS - 2025-12-11: Deduction fields from Excel dynamic zone
        # These fields are extracted by salary_parser.py but were not being saved
        # ================================================================
        ("rent_deduction", "REAL DEFAULT 0"),           # 家賃、寮費 - Housing/dormitory rent
        ("utilities_deduction", "REAL DEFAULT 0"),      # 水道光熱、光熱費、電気代 - Utilities
        ("meal_deduction", "REAL DEFAULT 0"),           # 弁当、弁当代、食事代 - Meal deductions
        ("advance_payment", "REAL DEFAULT 0"),          # 前貸、前借 - Salary advances
        ("year_end_adjustment", "REAL DEFAULT 0"),      # 年調過不足、年末調整 - Year-end tax adjustment
        ("absence_days", "INTEGER DEFAULT 0"),          # 欠勤日数 - Absence days
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE payroll_records ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # ================================================================
    # NEW COLUMNS FOR EMPLOYEES TABLE - 2025-12-11
    # Add gender and birth_date fields
    # ================================================================
    employee_new_columns = [
        ("gender", "TEXT"),              # 性別: M/F
        ("birth_date", "TEXT"),          # 生年月日: YYYY-MM-DD
        ("employee_type", "TEXT DEFAULT 'haken'"),  # 従業員タイプ: haken/ukeoi
        ("termination_date", "TEXT"),    # 退社日: YYYY-MM-DD (resignation date)
    ]

    for col_name, col_type in employee_new_columns:
        try:
            cursor.execute(f"ALTER TABLE employees ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # Create indexes for performance
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_payroll_period
        ON payroll_records(period)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_payroll_employee
        ON payroll_records(employee_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_employees_company
        ON employees(dispatch_company)
    """)

    # Composite indexes for frequently used query patterns
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_payroll_emp_period
        ON payroll_records(employee_id, period DESC)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_payroll_period_margin
        ON payroll_records(period, profit_margin)
    """)

    # ================================================================
    # SETTINGS TABLE - For configurable rates like 雇用保険
    # ================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert default settings if not exist
    default_settings = [
        ('employment_insurance_rate', '0.0090', '雇用保険（会社負担）- 2025年度: 0.90%'),
        ('workers_comp_rate', '0.003', '労災保険 - 製造業: 0.3%'),
        ('fiscal_year', '2025', '適用年度'),
        ('target_margin', '15', '目標マージン率 (%) - 製造派遣'),
    ]

    for key, value, description in default_settings:
        cursor.execute("""
            INSERT OR IGNORE INTO settings (key, value, description)
            VALUES (?, ?, ?)
        """, (key, value, description))

    # ================================================================
    # FACTORY TEMPLATES TABLE - For Excel parser templates per factory
    # ================================================================
    cursor.execute("""
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
    """)

    # Create index for faster template lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_factory_templates_identifier
        ON factory_templates(factory_identifier)
    """)

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

    # NO sample data - start with clean database
    # Users will upload their own payroll files
    if close_conn:
        conn.close()

def insert_sample_data(conn):
    """Insert sample data for demonstration"""
    cursor = conn.cursor()

    # Sample employees
    employees = [
        ('EMP001', '田中 太郎', 'タナカ タロウ', 'ABC株式会社', '製造部', 1200, 1800, 'active', '2023-04-01'),
        ('EMP002', '鈴木 花子', 'スズキ ハナコ', 'XYZ工業', '品質管理', 1350, 2100, 'active', '2023-06-15'),
        ('EMP003', '佐藤 次郎', 'サトウ ジロウ', 'ABC株式会社', '物流部', 1150, 1650, 'active', '2023-08-01'),
        ('EMP004', '高橋 美咲', 'タカハシ ミサキ', 'テック産業', '組立ライン', 1400, 2200, 'active', '2023-03-01'),
        ('EMP005', '伊藤 健太', 'イトウ ケンタ', 'XYZ工業', '製造部', 1250, 1900, 'active', '2023-09-01'),
        ('EMP006', '渡辺 さくら', 'ワタナベ サクラ', 'グローバル製造', '検査部', 1300, 2000, 'active', '2023-05-15'),
        ('EMP007', '山本 大輔', 'ヤマモト ダイスケ', 'ABC株式会社', '製造部', 1180, 1750, 'active', '2023-07-01'),
        ('EMP008', '中村 愛', 'ナカムラ アイ', 'テック産業', '事務', 1100, 1600, 'active', '2023-10-01'),
        ('EMP009', '小林 翔太', 'コバヤシ ショウタ', 'グローバル製造', '製造部', 1280, 1950, 'active', '2023-04-15'),
        ('EMP010', '加藤 真由美', 'カトウ マユミ', 'XYZ工業', '品質管理', 1320, 2050, 'active', '2023-02-01'),
        ('EMP011', '吉田 誠', 'ヨシダ マコト', 'ABC株式会社', '物流部', 1220, 1850, 'active', '2023-11-01'),
        ('EMP012', '山田 優子', 'ヤマダ ユウコ', 'テック産業', '組立ライン', 1380, 2150, 'active', '2023-01-15'),
    ]

    cursor.executemany("""
        INSERT INTO employees (employee_id, name, name_kana, dispatch_company, department, hourly_rate, billing_rate, status, hire_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, employees)

    # Sample payroll records for 6 months
    import random
    periods = ['2024年8月', '2024年9月', '2024年10月', '2024年11月', '2024年12月', '2025年1月']

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
            gross_salary = base_salary + overtime_pay + transport_allowance + other_allowances

            # Deductions
            social_insurance = round(gross_salary * 0.15)
            employment_insurance = round(gross_salary * 0.006)
            income_tax = round(gross_salary * 0.05)
            resident_tax = round(gross_salary * 0.1)
            net_salary = gross_salary - social_insurance - employment_insurance - income_tax - resident_tax

            # Billing
            billing_amount = billing_rate * (work_hours + overtime_hours)

            # Company costs (2024年度 rates)
            company_social_insurance = social_insurance  # Same as employee (労使折半)
            company_employment_insurance = round(gross_salary * 0.009)  # 0.90% (2025年度)
            company_workers_comp = round(gross_salary * 0.003)  # 労災保険 0.3%
            # NOTE: paid_leave is already in gross_salary, don't add again
            # NOTE: transport is already in gross_salary, don't add again
            total_company_cost = gross_salary + company_social_insurance + company_employment_insurance + company_workers_comp

            # Profit
            gross_profit = billing_amount - total_company_cost
            profit_margin = (gross_profit / billing_amount * 100) if billing_amount > 0 else 0

            cursor.execute("""
                INSERT INTO payroll_records (
                    employee_id, period, work_days, work_hours, overtime_hours,
                    paid_leave_hours, paid_leave_days, base_salary, overtime_pay,
                    transport_allowance, other_allowances, gross_salary,
                    social_insurance, employment_insurance, income_tax, resident_tax,
                    net_salary, billing_amount, company_social_insurance,
                    company_employment_insurance, company_workers_comp, total_company_cost, gross_profit, profit_margin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                employee_id, period, work_hours // 8, work_hours, overtime_hours,
                paid_leave_hours, paid_leave_hours / 8, base_salary, overtime_pay,
                transport_allowance, other_allowances, gross_salary,
                social_insurance, employment_insurance, income_tax, resident_tax,
                net_salary, billing_amount, company_social_insurance,
                company_employment_insurance, company_workers_comp, total_company_cost, gross_profit, profit_margin
            ))

    conn.commit()
    print(f"✅ Inserted {len(employees)} employees and {len(employees) * len(periods)} payroll records")
