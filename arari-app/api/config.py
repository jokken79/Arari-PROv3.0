"""
Configuration constants for 粗利 PRO

Centralized configuration to avoid magic numbers throughout the codebase.
"""

# ============== Insurance Rates ==============


class InsuranceRates:
    """Insurance rates by fiscal year (年度別保険料率)"""

    # 雇用保険（会社負担） - Employment Insurance (Company Share)
    EMPLOYMENT_2024 = 0.0095  # 0.95% (2024年度)
    EMPLOYMENT_2025 = 0.0090  # 0.90% (2025年度) ← Current

    # 労災保険 - Workers' Compensation Insurance
    WORKERS_COMP_MANUFACTURING = 0.003  # 0.3% (製造業)
    WORKERS_COMP_CONSTRUCTION = 0.009  # 0.9% (建設業)
    WORKERS_COMP_OFFICE = 0.0025  # 0.25% (事務)


# ============== Business Rules ==============


class BusinessRules:
    """Business rules and limits for 製造派遣"""

    # Target margin rates by industry
    TARGET_MARGIN_MANUFACTURING = 15.0  # 製造派遣目標 10-18%
    TARGET_MARGIN_OFFICE = 25.0  # 事務派遣目標 20-25%
    TARGET_MARGIN_IT = 30.0  # IT派遣目標 25-35%

    # Operational limits
    MAX_OVERTIME_HOURS_MONTH = 100  # 月間残業上限
    MAX_WORK_HOURS_MONTH = 400  # 月間労働時間上限
    MAX_PAID_LEAVE_DAYS_YEAR = 25  # 年間有給日数上限
    MAX_WORK_DAYS_MONTH = 31  # 月間出勤日数上限


# ============== Billing Multipliers ==============


class BillingMultipliers:
    """
    Billing rate multipliers for different hour types
    (派遣先への請求倍率)
    """

    BASE = 1.0  # 通常労働時間
    OVERTIME_NORMAL = 1.25  # 残業 ≤60h: ×1.25
    OVERTIME_OVER_60H = 1.5  # 残業 >60h: ×1.5
    NIGHT = 0.25  # 深夜: +0.25 (extra on top of regular or overtime)
    HOLIDAY = 1.35  # 休日: ×1.35


# ============== File Upload Limits ==============


class UploadLimits:
    """File upload restrictions"""

    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB
    MAX_FILE_SIZE_MB = 50

    ALLOWED_EXTENSIONS = [".xlsx", ".xlsm", ".xls", ".csv"]


# ============== Validation Limits ==============


class ValidationLimits:
    """Field validation limits for Pydantic models"""

    # Hours
    MIN_HOURS = 0
    MAX_WORK_HOURS = 400
    MAX_OVERTIME_HOURS = 100
    MAX_NIGHT_HOURS = 200
    MAX_HOLIDAY_HOURS = 100
    MAX_PAID_LEAVE_HOURS = 200

    # Days
    MIN_DAYS = 0
    MAX_WORK_DAYS = 31
    MAX_PAID_LEAVE_DAYS = 25

    # Money
    MIN_AMOUNT = 0

    # Strings
    MIN_EMPLOYEE_ID_LENGTH = 1
    MAX_EMPLOYEE_ID_LENGTH = 50


# ============== Database Configuration ==============


class DatabaseConfig:
    """Database connection and query settings"""

    # Connection settings
    CHECK_SAME_THREAD = False

    # Query settings
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 1000

    # Transaction settings
    DEFAULT_ISOLATION_LEVEL = None  # Autocommit mode off


# ============== API Configuration ==============


class APIConfig:
    """API server configuration"""

    # CORS
    FRONTEND_PORT_RANGE_START = 4000
    FRONTEND_PORT_RANGE_END = 4009
    DEV_PORTS = [3000, 3004, 3005, 3006, 3007, 4321, 8765]

    # Rate limiting
    RATE_LIMIT_UPLOADS = "10/minute"
    RATE_LIMIT_API = "100/minute"


# ============== Application Version ==============


class AppVersion:
    """Application version info"""

    VERSION = "2.0.0"
    BUILD = "production"
    API_VERSION = "v1"
