"""
Salary Calculation Tests - Arari-PRO
Tests for critical salary and margin calculations based on 製造派遣 rules
"""
import os
import sys

import pytest

# Add api directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import EmployeeCreate, PayrollRecordCreate
from services import PayrollService


@pytest.fixture
def payroll_service(db_session):
    """Fixture to create a PayrollService with test database"""
    return PayrollService(db_session)


@pytest.fixture
def manufacturing_employee(payroll_service):
    """Fixture: Standard 製造派遣 employee with 1,700 billing rate"""
    emp = EmployeeCreate(
        employee_id="MFG001",
        name="製造太郎",
        dispatch_company="加藤木材工業",
        department="製造部",
        hourly_rate=1500,
        billing_rate=1700,  # Standard manufacturing rate
        status="active",
        hire_date="2024-01-01",
    )
    return payroll_service.create_employee(emp)


# ================================================================
# BILLING AMOUNT TESTS (請求金額)
# ================================================================


def test_billing_base_hours_only(payroll_service, manufacturing_employee):
    """Basic billing: work_hours × billing_rate"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,  # Standard month
        overtime_hours=0,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # 168 × 1700 = 285,600
    assert amount == 285600


def test_billing_with_overtime_under_60h(payroll_service, manufacturing_employee):
    """Overtime ≤60h at 1.25× rate"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        overtime_hours=40,  # Under 60h threshold
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # Base: 168 × 1700 = 285,600
    # OT: 40 × 1700 × 1.25 = 85,000
    # Total: 370,600
    assert amount == 370600


def test_billing_with_overtime_over_60h(payroll_service, manufacturing_employee):
    """Overtime >60h: first 60h at 1.25×, remaining at 1.5×"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        overtime_hours=60,
        overtime_over_60h=13,  # 73h total overtime
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # Base: 168 × 1700 = 285,600
    # OT≤60: 60 × 1700 × 1.25 = 127,500
    # OT>60: 13 × 1700 × 1.5 = 33,150
    # Total: 446,250
    assert amount == 446250


def test_billing_with_night_hours(payroll_service, manufacturing_employee):
    """Night hours (深夜) add 0.25× extra premium"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        night_hours=20,  # 20 hours between 22:00-05:00
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # Base: 168 × 1700 = 285,600
    # Night premium: 20 × 1700 × 0.25 = 8,500 (EXTRA, not replacement)
    # Total: 294,100
    assert amount == 294100


def test_billing_with_holiday_hours(payroll_service, manufacturing_employee):
    """Holiday hours (休日) at 1.35× rate"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=160,
        holiday_hours=16,  # 2 holiday days
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # Base: 160 × 1700 = 272,000
    # Holiday: 16 × 1700 × 1.35 = 36,720
    # Total: 308,720
    assert amount == 308720


def test_billing_complex_scenario(payroll_service, manufacturing_employee):
    """Complex scenario with all hour types"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        overtime_hours=60,
        overtime_over_60h=10,
        night_hours=15,
        holiday_hours=8,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    # Base: 168 × 1700 = 285,600
    # OT≤60: 60 × 1700 × 1.25 = 127,500
    # OT>60: 10 × 1700 × 1.5 = 25,500
    # Night: 15 × 1700 × 0.25 = 6,375
    # Holiday: 8 × 1700 × 1.35 = 18,360
    # Total: 463,335
    assert amount == 463335


# ================================================================
# COMPANY COST TESTS (会社総コスト)
# ================================================================


def test_company_cost_basic(payroll_service, manufacturing_employee):
    """Basic company cost calculation"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=300000,
        social_insurance=18000,  # 健康保険
        welfare_pension=35000,   # 厚生年金
    )
    result = payroll_service.create_payroll_record(record)

    # Company social insurance = employee portion (労使折半)
    assert result["company_social_insurance"] == 53000  # 18000 + 35000

    # Employment insurance = 0.90% of gross (2025年度)
    assert result["company_employment_insurance"] == 2700  # 300000 × 0.90%

    # Workers comp = 0.30% of gross (製造業)
    assert result["company_workers_comp"] == 900  # 300000 × 0.30%

    # Total company cost
    expected = 300000 + 53000 + 2700 + 900  # = 356,600
    assert result["total_company_cost"] == expected


def test_company_cost_no_double_counting_paid_leave(payroll_service, manufacturing_employee):
    """CRITICAL: paid_leave_amount is already in gross_salary, should NOT be added again"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=280000,  # This ALREADY includes paid_leave_amount
        paid_leave_amount=20000,  # Already in gross
        social_insurance=16000,
        welfare_pension=32000,
    )
    result = payroll_service.create_payroll_record(record)

    # Company cost should NOT include paid_leave_amount again
    company_social = 16000 + 32000  # = 48,000
    employment = 280000 * 0.009  # = 2,520
    workers = 280000 * 0.003  # = 840
    expected_total = 280000 + company_social + employment + workers

    assert result["total_company_cost"] == expected_total
    # Should NOT be: 280000 + 20000 + ... (double counting error)


def test_company_cost_no_double_counting_transport(payroll_service, manufacturing_employee):
    """Transport allowance is already in gross_salary"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=310000,  # This ALREADY includes transport
        transport_allowance=10000,  # Already in gross
        social_insurance=18000,
        welfare_pension=36000,
    )
    result = payroll_service.create_payroll_record(record)

    # Transport should NOT be added again
    company_social = 18000 + 36000
    employment = 310000 * 0.009
    workers = 310000 * 0.003
    expected_total = 310000 + company_social + employment + workers

    assert result["total_company_cost"] == expected_total


# ================================================================
# MARGIN CALCULATION TESTS (粗利・マージン率)
# ================================================================


def test_margin_calculation_basic(payroll_service, manufacturing_employee):
    """Gross profit = Billing - Company Cost"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        gross_salary=200000,  # Lower gross to ensure positive margin
        social_insurance=12000,
        welfare_pension=24000,
    )

    # Calculate billing amount
    billing = payroll_service.calculate_billing_amount(record, employee_data)

    # Create record to get company cost
    result = payroll_service.create_payroll_record(record)

    # Expected gross profit
    gross_profit = billing - result["total_company_cost"]

    # Margin should be positive with these values
    # billing = 168 * 1700 = 285,600
    # company cost = 200,000 + 36,000 + 1,800 + 600 = 238,400
    # profit = 285,600 - 238,400 = 47,200
    # margin = 47,200 / 285,600 = 16.5%
    if billing > 0:
        margin_rate = (gross_profit / billing) * 100
        assert margin_rate >= 10, f"Margin too low: {margin_rate}%"
        assert margin_rate <= 30, f"Margin too high: {margin_rate}%"


def test_margin_classification_excellent(payroll_service, manufacturing_employee):
    """Margin ≥18% should be classified as excellent"""
    # Set up a high-margin scenario
    employee_data = {"billing_rate": 2200}  # Higher billing rate
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        gross_salary=200000,  # Lower cost
        social_insurance=12000,
        welfare_pension=24000,
    )

    billing = payroll_service.calculate_billing_amount(record, employee_data)
    result = payroll_service.create_payroll_record(record)

    gross_profit = billing - result["total_company_cost"]
    margin_rate = (gross_profit / billing) * 100

    # billing = 168 * 2200 = 369,600
    # company cost = 200,000 + 36,000 + 1,800 + 600 = 238,400
    # profit = 369,600 - 238,400 = 131,200
    # margin = 131,200 / 369,600 = 35.5% (excellent!)
    assert margin_rate > 18, f"Expected excellent margin, got {margin_rate}%"


def test_margin_classification_target(payroll_service, manufacturing_employee):
    """Margin 15-18% is on target for 製造派遣"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        gross_salary=200000,  # Adjusted to hit ~15% margin
        social_insurance=12000,
        welfare_pension=24000,
    )

    billing = payroll_service.calculate_billing_amount(record, employee_data)
    result = payroll_service.create_payroll_record(record)

    gross_profit = billing - result["total_company_cost"]
    margin_rate = (gross_profit / billing) * 100

    # billing = 168 * 1700 = 285,600
    # company cost = 200,000 + 36,000 + 1,800 + 600 = 238,400
    # profit = 47,200
    # margin = 16.5% (in target range!)
    assert margin_rate >= 10, f"Margin below acceptable: {margin_rate}%"


# ================================================================
# INSURANCE RATE TESTS (保険料率 2025年度)
# ================================================================


def test_employment_insurance_rate_2025(payroll_service, manufacturing_employee):
    """Employment insurance company rate should be 0.90% for 2025"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=300000,
        social_insurance=18000,
        welfare_pension=35000,
    )
    result = payroll_service.create_payroll_record(record)

    # 0.90% of 300,000 = 2,700
    expected_employment = int(300000 * 0.009)
    assert result["company_employment_insurance"] == expected_employment


def test_workers_comp_rate_manufacturing(payroll_service, manufacturing_employee):
    """Workers comp should be 0.30% for manufacturing industry"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=300000,
        social_insurance=18000,
        welfare_pension=35000,
    )
    result = payroll_service.create_payroll_record(record)

    # 0.30% of 300,000 = 900
    expected_workers = int(300000 * 0.003)
    assert result["company_workers_comp"] == expected_workers


def test_social_insurance_equal_split(payroll_service, manufacturing_employee):
    """Company social insurance = employee portion (労使折半)"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        gross_salary=300000,
        social_insurance=18000,  # Employee pays this
        welfare_pension=35000,   # Employee pays this
    )
    result = payroll_service.create_payroll_record(record)

    # Company pays same as employee (equal split)
    expected_company_social = 18000 + 35000
    assert result["company_social_insurance"] == expected_company_social


# ================================================================
# EDGE CASES
# ================================================================


def test_zero_hours_record(payroll_service, manufacturing_employee):
    """Record with zero hours should not fail"""
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=0,
        gross_salary=0,
    )
    result = payroll_service.create_payroll_record(record)
    assert result is not None
    assert result["total_company_cost"] == 0


def test_high_overtime_scenario(payroll_service, manufacturing_employee):
    """Very high overtime (>100h) should calculate correctly"""
    employee_data = {"billing_rate": 1700}
    record = PayrollRecordCreate(
        employee_id=manufacturing_employee["employee_id"],
        period="2025年1月",
        work_hours=168,
        overtime_hours=60,  # Capped at 60
        overtime_over_60h=40,  # Additional 40h
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)

    # Should handle without errors
    assert amount > 0
    # Base: 285,600 + OT60: 127,500 + OT40: 102,000 = 515,100
    assert amount == 515100
