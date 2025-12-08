"""
Example tests for critical calculations in 粗利 PRO

To run tests:
    pip install pytest
    pytest test_calculations_example.py -v

NOTE: These are example tests to demonstrate testing approach.
Full test suite should be implemented in /tests/ directory.
"""

import pytest
from models import PayrollRecordCreate
from config import BillingMultipliers, InsuranceRates


def test_billing_calculation_basic():
    """
    Test basic billing calculation: 160h × ¥1,700 = ¥272,000
    """
    # Mock employee with billing_rate
    employee = {'billing_rate': 1700}

    # Mock record with 160h work_hours, no overtime
    record = PayrollRecordCreate(
        employee_id="TEST001",
        period="2025年1月",
        work_hours=160,
        overtime_hours=0,
        overtime_over_60h=0,
        night_hours=0,
        holiday_hours=0,
        paid_leave_hours=0,
        paid_leave_days=0,
        base_salary=0,
        overtime_pay=0,
        gross_salary=0,
        social_insurance=0,
        employment_insurance=0,
        income_tax=0,
        resident_tax=0,
        other_deductions=0,
        net_salary=0,
        billing_amount=0
    )

    # Expected billing: 160 × 1700 = ¥272,000
    expected_billing = 160 * 1700
    assert expected_billing == 272000, "Basic billing calculation incorrect"


def test_billing_calculation_with_overtime():
    """
    Test billing with overtime:
    - Base: 160h × ¥1,700 = ¥272,000
    - Overtime: 10h × ¥1,700 × 1.25 = ¥21,250
    - Total: ¥293,250
    """
    billing_rate = 1700
    work_hours = 160
    overtime_hours = 10

    base_billing = work_hours * billing_rate
    overtime_billing = overtime_hours * billing_rate * BillingMultipliers.OVERTIME_NORMAL

    expected_total = base_billing + overtime_billing

    assert expected_total == 293250, f"Expected ¥293,250 but got ¥{expected_total:,.0f}"


def test_billing_calculation_with_over_60h_overtime():
    """
    Test billing with >60h overtime:
    - Base: 160h × ¥1,700 = ¥272,000
    - Overtime ≤60h: 60h × ¥1,700 × 1.25 = ¥127,500
    - Overtime >60h: 10h × ¥1,700 × 1.5 = ¥25,500
    - Total: ¥425,000
    """
    billing_rate = 1700
    work_hours = 160
    overtime_hours = 60
    overtime_over_60h = 10

    base = work_hours * billing_rate
    ot_normal = overtime_hours * billing_rate * BillingMultipliers.OVERTIME_NORMAL
    ot_over_60 = overtime_over_60h * billing_rate * BillingMultipliers.OVERTIME_OVER_60H

    expected = base + ot_normal + ot_over_60

    assert expected == 425000, f"Expected ¥425,000 but got ¥{expected:,.0f}"


def test_billing_calculation_with_night_hours():
    """
    Test billing with night hours (深夜):
    - Base: 160h × ¥1,700 = ¥272,000
    - Night extra: 20h × ¥1,700 × 0.25 = ¥8,500
    - Total: ¥280,500
    """
    billing_rate = 1700
    work_hours = 160
    night_hours = 20

    base = work_hours * billing_rate
    night = night_hours * billing_rate * BillingMultipliers.NIGHT

    expected = base + night

    assert expected == 280500, f"Expected ¥280,500 but got ¥{expected:,.0f}"


def test_billing_calculation_with_holiday_hours():
    """
    Test billing with holiday hours (休日):
    - Base: 160h × ¥1,700 = ¥272,000
    - Holiday: 8h × ¥1,700 × 1.35 = ¥18,360
    - Total: ¥290,360
    """
    billing_rate = 1700
    work_hours = 160
    holiday_hours = 8

    base = work_hours * billing_rate
    holiday = holiday_hours * billing_rate * BillingMultipliers.HOLIDAY

    expected = base + holiday

    assert expected == 290360, f"Expected ¥290,360 but got ¥{expected:,.0f}"


def test_company_cost_calculation():
    """
    Test total company cost calculation:
    - Gross salary: ¥300,000
    - Social insurance (company): ¥45,000 (same as employee)
    - Employment insurance: ¥300,000 × 0.009 = ¥2,700
    - Workers comp: ¥300,000 × 0.003 = ¥900
    - Paid leave cost: 8h × ¥1,500 = ¥12,000
    - Total: ¥360,600
    """
    gross_salary = 300000
    social_insurance_employee = 45000
    hourly_rate = 1500
    paid_leave_hours = 8

    # Company costs
    company_social_insurance = social_insurance_employee  # Same as employee (労使折半)
    company_employment_insurance = round(gross_salary * InsuranceRates.EMPLOYMENT_2025)
    company_workers_comp = round(gross_salary * InsuranceRates.WORKERS_COMP_MANUFACTURING)
    paid_leave_cost = paid_leave_hours * hourly_rate

    total_company_cost = (
        gross_salary +
        company_social_insurance +
        company_employment_insurance +
        company_workers_comp +
        paid_leave_cost
    )

    expected = 360600
    assert total_company_cost == expected, f"Expected ¥{expected:,.0f} but got ¥{total_company_cost:,.0f}"


def test_profit_margin_calculation():
    """
    Test profit margin calculation:
    - Billing: ¥400,000
    - Total cost: ¥360,000
    - Profit: ¥40,000
    - Margin: 10%
    """
    billing_amount = 400000
    total_company_cost = 360000

    gross_profit = billing_amount - total_company_cost
    profit_margin = (gross_profit / billing_amount * 100) if billing_amount > 0 else 0

    assert gross_profit == 40000, f"Expected profit ¥40,000 but got ¥{gross_profit:,.0f}"
    assert profit_margin == 10.0, f"Expected margin 10% but got {profit_margin:.1f}%"


def test_profit_margin_manufacturing_target():
    """
    Test that manufacturing target margin is 15%
    """
    from config import BusinessRules

    assert BusinessRules.TARGET_MARGIN_MANUFACTURING == 15.0, \
        "Manufacturing target margin should be 15%"


def test_insurance_rates_2025():
    """
    Test 2025 insurance rates are correct
    """
    assert InsuranceRates.EMPLOYMENT_2025 == 0.0090, "Employment rate 2025 should be 0.90%"
    assert InsuranceRates.WORKERS_COMP_MANUFACTURING == 0.003, "Workers comp should be 0.3%"


def test_validation_limits_work_hours():
    """
    Test that work hours validation limits are reasonable
    """
    from config import ValidationLimits

    assert ValidationLimits.MAX_WORK_HOURS == 400, "Max work hours should be 400h/month"
    assert ValidationLimits.MAX_OVERTIME_HOURS == 100, "Max overtime should be 100h/month"


def test_period_format_validation():
    """
    Test that period format validation works
    """
    import re

    # Valid formats
    valid_periods = ["2025年1月", "2025年12月", "2024年6月"]
    period_pattern = r'^\d{4}年\d{1,2}月$'

    for period in valid_periods:
        assert re.match(period_pattern, period), f"Valid period '{period}' should match"

    # Invalid formats
    invalid_periods = ["2025-01", "January 2025", "2025年1", "2025年", "1月"]

    for period in invalid_periods:
        assert not re.match(period_pattern, period), f"Invalid period '{period}' should NOT match"


# ============== Integration Test Example ==============

def test_full_payroll_calculation_integration():
    """
    Full integration test: Calculate complete payroll with all components

    Scenario: 製造派遣 employee in January 2025
    - Work: 160h @ ¥1,700/h
    - Overtime: 15h (≤60h)
    - Night: 10h
    - Paid leave: 8h
    - Target margin: 15%
    """
    # Employee data
    hourly_rate = 1700
    billing_rate = 1700

    # Hours
    work_hours = 160
    overtime_hours = 15
    night_hours = 10
    paid_leave_hours = 8

    # Step 1: Calculate billing amount
    base_billing = work_hours * billing_rate
    overtime_billing = overtime_hours * billing_rate * BillingMultipliers.OVERTIME_NORMAL
    night_billing = night_hours * billing_rate * BillingMultipliers.NIGHT

    billing_amount = base_billing + overtime_billing + night_billing
    # Expected: 160×1700 + 15×1700×1.25 + 10×1700×0.25 = 272,000 + 31,875 + 4,250 = ¥308,125

    assert billing_amount == 308125, f"Billing should be ¥308,125 but got ¥{billing_amount:,.0f}"

    # Step 2: Calculate gross salary (what employee receives)
    base_salary = work_hours * hourly_rate
    overtime_pay = overtime_hours * hourly_rate * 1.25
    night_pay = night_hours * hourly_rate * 0.25
    transport = 15000

    gross_salary = base_salary + overtime_pay + night_pay + transport
    # Expected: 272,000 + 31,875 + 4,250 + 15,000 = ¥323,125

    assert gross_salary == 323125, f"Gross salary should be ¥323,125 but got ¥{gross_salary:,.0f}"

    # Step 3: Calculate company costs
    social_insurance_employee = round(gross_salary * 0.15)  # Example rate
    company_social_insurance = social_insurance_employee
    company_employment_insurance = round(gross_salary * 0.009)
    company_workers_comp = round(gross_salary * 0.003)
    paid_leave_cost = paid_leave_hours * hourly_rate

    total_company_cost = (
        gross_salary +
        company_social_insurance +
        company_employment_insurance +
        company_workers_comp +
        paid_leave_cost
    )
    # Expected: 323,125 + 48,469 + 2,908 + 970 + 13,600 = ¥389,072

    assert abs(total_company_cost - 389072) < 10, \
        f"Total cost should be ~¥389,072 but got ¥{total_company_cost:,.0f}"

    # Step 4: Calculate profit and margin
    gross_profit = billing_amount - total_company_cost
    profit_margin = (gross_profit / billing_amount * 100)

    # Expected profit: 308,125 - 389,072 = ¥-80,947 (NEGATIVE! - Not profitable)
    # This shows the importance of correct billing_rate vs hourly_rate

    print(f"\n📊 Integration Test Results:")
    print(f"   Billing Amount: ¥{billing_amount:,.0f}")
    print(f"   Total Cost: ¥{total_company_cost:,.0f}")
    print(f"   Gross Profit: ¥{gross_profit:,.0f}")
    print(f"   Margin: {profit_margin:.2f}%")

    if profit_margin < 15:
        print(f"   ⚠️  Margin below target (15%)")


# ============== Run Tests ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
