from .connection import USE_POSTGRES

# SQL type mappings for cross-database compatibility
if USE_POSTGRES:
    PK_TYPE = "SERIAL PRIMARY KEY"
    REAL_TYPE = "DOUBLE PRECISION"
    TEXT_TYPE = "TEXT"
else:
    PK_TYPE = "INTEGER PRIMARY KEY AUTOINCREMENT"
    REAL_TYPE = "REAL"
    TEXT_TYPE = "TEXT"

EMPLOYEES_SQL = f"""
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

PAYROLL_SQL = f"""
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

SETTINGS_SQL = """
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
"""

if USE_POSTGRES:
    FACTORY_TEMPLATES_SQL = """
        CREATE TABLE IF NOT EXISTS factory_templates (
            id SERIAL PRIMARY KEY,
            factory_identifier TEXT UNIQUE NOT NULL,
            template_name TEXT,
            field_positions JSONB NOT NULL,
            column_offsets JSONB NOT NULL,
            detected_allowances JSONB DEFAULT '{}'::jsonb,
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
    FACTORY_TEMPLATES_SQL = """
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

DEFAULT_SETTINGS = [
    (
        "employment_insurance_rate",
        "0.0090",
        "雇用保険（会社負担）- 2025年度: 0.90%",
    ),
    ("workers_comp_rate", "0.003", "労災保険 - 製造業: 0.3%"),
    ("fiscal_year", "2025", "適用年度"),
    ("target_margin", "12", "目標マージン率 (%) - 製造派遣"),
]
