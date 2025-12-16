"""
Pydantic models for API request/response validation
"""

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    employee_type: str = Field(
        "haken", description="従業員タイプ (haken=派遣社員, ukeoi=請負社員)"
    )
    # NEW FIELDS - 2025-12-11
    gender: Optional[str] = Field(None, description="性別 (M=男性, F=女性)")
    birth_date: Optional[str] = Field(None, description="生年月日 (YYYY-MM-DD)")
    termination_date: Optional[str] = Field(None, description="退社日 (YYYY-MM-DD)")


class EmployeeCreate(EmployeeBase):
    pass


class Employee(EmployeeBase):
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    # Calculated fields
    profit_per_hour: Optional[float] = None
    margin_rate: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ============== Payroll Record Models ==============


class PayrollRecordBase(BaseModel):
    employee_id: str = Field(..., min_length=1, description="社員番号")
    period: str = Field(..., description="対象期間 (例: 2025年1月)")
    work_days: int = Field(0, ge=0, le=31, description="出勤日数")
    work_hours: float = Field(0, ge=0, le=400, description="労働時間 (max 400h/month)")
    overtime_hours: float = Field(
        0, ge=0, le=100, description="残業時間（≤60h部分, max 100h)"
    )
    night_hours: float = Field(0, ge=0, le=200, description="深夜時間")
    holiday_hours: float = Field(0, ge=0, le=100, description="休日時間")
    overtime_over_60h: float = Field(
        0, ge=0, le=100, description="60H過残業（60h超え部分）"
    )
    paid_leave_hours: float = Field(0, ge=0, le=200, description="有給時間")
    paid_leave_days: float = Field(0, ge=0, le=25, description="有給日数")
    paid_leave_amount: float = Field(
        0, ge=0, description="有給金額（円）- 直接値がある場合"
    )
    base_salary: float = Field(0, ge=0, description="基本給")
    overtime_pay: float = Field(0, ge=0, description="残業代（≤60h: ×1.25）")
    night_pay: float = Field(0, ge=0, description="深夜手当（本人: ×0.25）")
    holiday_pay: float = Field(0, ge=0, description="休日手当（×1.35）")
    overtime_over_60h_pay: float = Field(0, ge=0, description="60H過残業手当（×1.5）")
    transport_allowance: float = Field(0, description="通勤費（控除含む場合は負値可）")
    other_allowances: float = Field(0, ge=0, description="その他手当（請求可能）")
    non_billable_allowances: float = Field(
        0, ge=0, description="非請求手当（通勤手当（非）、業務手当等）- 会社負担のみ"
    )
    gross_salary: float = Field(0, ge=0, description="総支給額")
    social_insurance: float = Field(0, ge=0, description="社会保険料（健康保険）")
    welfare_pension: float = Field(0, ge=0, description="厚生年金保険料")
    employment_insurance: float = Field(0, ge=0, description="雇用保険料")
    income_tax: float = Field(0, ge=0, description="所得税")
    resident_tax: float = Field(0, ge=0, description="住民税")
    rent_deduction: float = Field(0, ge=0, description="家賃/寮費")
    utilities_deduction: float = Field(0, ge=0, description="水道光熱費")
    meal_deduction: float = Field(0, ge=0, description="弁当代/食事代")
    advance_payment: float = Field(0, ge=0, description="前借金/前貸")
    year_end_adjustment: float = Field(
        0,
        description="年末調整 (負値可、還付の場合は正？通常は徴収が基本だが還付もある)",
    )
    other_deductions: float = Field(0, ge=0, description="その他控除")
    net_salary: float = Field(
        0, description="差引支給額（負値も許容 - 控除超過の場合）"
    )
    billing_amount: float = Field(0, ge=0, description="請求金額")

    @field_validator("period")
    @classmethod
    def validate_period(cls, v: str) -> str:
        """Validate period format is YYYY年M月 or YYYY年MM月"""
        if not re.match(r"^\d{4}年\d{1,2}月$", v):
            raise ValueError("Period must be in format YYYY年M月 (例: 2025年1月)")
        return v

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, v: str) -> str:
        """Validate employee_id is not empty"""
        if not v or not v.strip():
            raise ValueError("Employee ID cannot be empty")
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

    model_config = ConfigDict(from_attributes=True)
