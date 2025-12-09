"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

# ============== Employee Models ==============

class EmployeeBase(BaseModel):
    employee_id: str = Field(..., description="社員番号")
    name: str = Field(..., description="氏名")
    name_kana: Optional[str] = Field(None, description="氏名（カナ）")
    dispatch_company: str = Field(..., description="派遣先")
    department: Optional[str] = Field(None, description="部署")
    hourly_rate: float = Field(0, description="時給")
    billing_rate: float = Field(0, description="単価")
    status: str = Field("active", description="ステータス")
    hire_date: Optional[str] = Field(None, description="入社日")
    employee_type: str = Field("haken", description="従業員タイプ (haken=派遣社員, ukeoi=請負社員)")

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    # Calculated fields
    profit_per_hour: Optional[float] = None
    margin_rate: Optional[float] = None

    class Config:
        from_attributes = True

# ============== Payroll Record Models ==============

class PayrollRecordBase(BaseModel):
    employee_id: str = Field(..., min_length=1, description="社員番号")
    period: str = Field(..., description="対象期間 (例: 2025年1月)")
    work_days: int = Field(0, ge=0, le=31, description="出勤日数")
    work_hours: float = Field(0, ge=0, le=400, description="労働時間 (max 400h/month)")
    overtime_hours: float = Field(0, ge=0, le=100, description="残業時間（≤60h部分, max 100h)")
    night_hours: float = Field(0, ge=0, le=200, description="深夜時間")
    holiday_hours: float = Field(0, ge=0, le=100, description="休日時間")
    overtime_over_60h: float = Field(0, ge=0, le=100, description="60H過残業（60h超え部分）")
    paid_leave_hours: float = Field(0, ge=0, le=200, description="有給時間")
    paid_leave_days: float = Field(0, ge=0, le=25, description="有給日数")
    paid_leave_amount: float = Field(0, ge=0, description="有給金額（円）- 直接値がある場合")
    base_salary: float = Field(0, ge=0, description="基本給")
    overtime_pay: float = Field(0, ge=0, description="残業代（≤60h: ×1.25）")
    night_pay: float = Field(0, ge=0, description="深夜手当（本人: ×0.25）")
    holiday_pay: float = Field(0, ge=0, description="休日手当（×1.35）")
    overtime_over_60h_pay: float = Field(0, ge=0, description="60H過残業手当（×1.5）")
    transport_allowance: float = Field(0, description="通勤費（控除含む場合は負値可）")
    other_allowances: float = Field(0, ge=0, description="その他手当（請求可能）")
    non_billable_allowances: float = Field(0, ge=0, description="非請求手当（通勤手当（非）、業務手当等）- 会社負担のみ")
    gross_salary: float = Field(0, ge=0, description="総支給額")
    social_insurance: float = Field(0, ge=0, description="社会保険料（本人負担）")
    employment_insurance: float = Field(0, ge=0, description="雇用保険料")
    income_tax: float = Field(0, ge=0, description="所得税")
    resident_tax: float = Field(0, ge=0, description="住民税")
    other_deductions: float = Field(0, ge=0, description="その他控除")
    net_salary: float = Field(0, description="差引支給額（負値も許容 - 控除超過の場合）")
    billing_amount: float = Field(0, ge=0, description="請求金額")

    @field_validator('period')
    @classmethod
    def validate_period(cls, v: str) -> str:
        """Validate period format is YYYY年M月 or YYYY年MM月"""
        if not re.match(r'^\d{4}年\d{1,2}月$', v):
            raise ValueError('Period must be in format YYYY年M月 (例: 2025年1月)')
        return v

    @field_validator('employee_id')
    @classmethod
    def validate_employee_id(cls, v: str) -> str:
        """Validate employee_id is not empty"""
        if not v or not v.strip():
            raise ValueError('Employee ID cannot be empty')
        return v.strip()

class PayrollRecordCreate(PayrollRecordBase):
    # Optional calculated fields - will be calculated if not provided
    company_social_insurance: Optional[float] = None
    company_employment_insurance: Optional[float] = None
    company_workers_comp: Optional[float] = None  # 労災保険（会社負担100%）
    total_company_cost: Optional[float] = None
    gross_profit: Optional[float] = None
    profit_margin: Optional[float] = None
    # Dispatch company from Excel sheet name (派遣先企業)
    dispatch_company: Optional[str] = None
    # Employee name from Excel (氏名)
    employee_name: Optional[str] = None

class PayrollRecord(PayrollRecordBase):
    id: Optional[int] = None
    company_social_insurance: float = Field(0, description="社会保険（会社負担）")
    company_employment_insurance: float = Field(0, description="雇用保険（会社負担）")
    company_workers_comp: float = Field(0, description="労災保険（会社負担100%）")
    total_company_cost: float = Field(0, description="会社総コスト")
    gross_profit: float = Field(0, description="粗利")
    profit_margin: float = Field(0, description="マージン率")
    created_at: Optional[str] = None

    # Related employee info
    employee_name: Optional[str] = None
    dispatch_company: Optional[str] = None

    class Config:
        from_attributes = True

# ============== Statistics Models ==============

class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    total_companies: int
    average_profit: float
    average_margin: float
    total_monthly_revenue: float
    total_monthly_cost: float
    total_monthly_profit: float
    profit_trend: List[dict]
    profit_distribution: List[dict]
    top_companies: List[dict]
    recent_payrolls: List[dict]

class CompanyStats(BaseModel):
    company_name: str
    employee_count: int
    average_hourly_rate: float
    average_billing_rate: float
    average_profit: float
    average_margin: float
    total_monthly_profit: float

class MonthlyStats(BaseModel):
    period: str
    year: int
    month: int
    total_employees: int
    total_revenue: float
    total_cost: float
    total_profit: float
    average_margin: float
    total_social_insurance: float
    total_paid_leave_cost: float

# ============== Upload Response Models ==============

class UploadResponse(BaseModel):
    success: bool
    filename: str
    total_records: int
    saved_records: int
    skipped_count: Optional[int] = None
    error_count: Optional[int] = None
    skipped_details: Optional[List[dict]] = None
    errors: Optional[List[str]] = None

# ============== API Response Models ==============

class APIResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None
    error: Optional[str] = None
