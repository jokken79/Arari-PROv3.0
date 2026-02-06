from .connection import get_connection, USE_POSTGRES
from .schema import (
    EMPLOYEES_SQL,
    PAYROLL_SQL,
    SETTINGS_SQL,
    FACTORY_TEMPLATES_SQL,
    DEFAULT_SETTINGS,
)
from .migrations import add_column_if_not_exists


def init_db(conn=None):
    """Initialize the database with tables (SQLite or PostgreSQL)"""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    cursor = conn.cursor()

    # Create tables
    cursor.execute(EMPLOYEES_SQL)
    cursor.execute(PAYROLL_SQL)
    
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
        add_column_if_not_exists(cursor, "payroll_records", col_name, col_type)

    # NEW COLUMNS FOR EMPLOYEES TABLE
    employee_new_columns = [
        ("gender", "TEXT"),  # 性別: M/F
        ("birth_date", "TEXT"),  # 生年月日: YYYY-MM-DD
        ("employee_type", "TEXT DEFAULT 'haken'"),  # 従業員タイプ: haken/ukeoi
        ("termination_date", "TEXT"),  # 退社日: YYYY-MM-DD
        ("nationality", "TEXT"),  # 国籍: Vietnam, Philippines, etc.
    ]

    for col_name, col_type in employee_new_columns:
        add_column_if_not_exists(cursor, "employees", col_name, col_type)

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

    # SETTINGS TABLE
    cursor.execute(SETTINGS_SQL)

    # Insert default settings if not exist
    if USE_POSTGRES:
        for key, value, description in DEFAULT_SETTINGS:
            cursor.execute(
                """
                INSERT INTO settings (key, value, description)
                VALUES (%s, %s, %s)
                ON CONFLICT (key) DO NOTHING
            """,
                (key, value, description),
            )
    else:
        for key, value, description in DEFAULT_SETTINGS:
            cursor.execute(
                """
                INSERT OR IGNORE INTO settings (key, value, description)
                VALUES (?, ?, ?)
            """,
                (key, value, description),
            )

    # FACTORY TEMPLATES TABLE
    cursor.execute(FACTORY_TEMPLATES_SQL)

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
    # Used check: Use 'auth' instead of 'api.auth' because main.py runs in api/
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

    try:
        from agent_commissions import init_agent_commissions_tables
        init_agent_commissions_tables(conn)
    except Exception as e:
        print(f"[WARN] Agent commissions tables: {e}")

    if close_conn:
        conn.close()
