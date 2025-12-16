import os
import sys

import pytest

# Add api directory to path so we can import modules from parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models import EmployeeCreate, PayrollRecordCreate
from services import PayrollService


@pytest.fixture
def payroll_service(db_session):
    """Fixture to create a PayrollService with a test database session."""
    return PayrollService(db_session)


@pytest.fixture
def test_employee(payroll_service):
    """Fixture to create a standard test employee and yield it."""
    emp_create = EmployeeCreate(
        employee_id="123456",
        name="Test User",
        dispatch_company="Test Co",
        department="Dept",
        hourly_rate=1500,
        billing_rate=2000,
        status="active",
        hire_date="2024-01-01",
        name_kana="Test",
    )
    employee = payroll_service.create_employee(emp_create)
    return employee


# ================================================================
# BILLING LOGIC TESTS (Facturación al Cliente)
# ================================================================


def test_billing_standard_hours(payroll_service, test_employee):
    """Test basic billing: Hours * Rate"""
    employee_data = {"billing_rate": 2000}
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        work_hours=100,
        overtime_hours=10,
        billing_amount=0,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    assert amount == 225000


def test_billing_excludes_non_billable_items(payroll_service, test_employee):
    """CRITICAL RULE: Transport and Work Allowances must NOT be billed."""
    employee_data = {"billing_rate": 2000}
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        work_hours=100,
        transport_allowance=15000,
        non_billable_allowances=5000,
        other_allowances=0,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    assert amount == 200000


def test_billing_excludes_paid_leave(payroll_service, test_employee):
    """CRITICAL RULE: Paid Leave is a company cost, NOT billed to client."""
    employee_data = {"billing_rate": 2000}
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        work_hours=100,
        paid_leave_amount=10000,
        other_allowances=0,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    assert amount == 200000


def test_billing_includes_pass_through_allowances(payroll_service, test_employee):
    """CRITICAL RULE: Other Allowances MUST be billed to the client (Pass-through)."""
    employee_data = {"billing_rate": 2000}
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        work_hours=100,
        other_allowances=5000,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    assert amount == 205000


def test_billing_complex_mix(payroll_service, test_employee):
    """Verify complex scenario with mixed billable/non-billable items"""
    employee_data = {"billing_rate": 2000}
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        work_hours=100,
        other_allowances=2000,
        transport_allowance=10000,
        paid_leave_amount=15000,
        non_billable_allowances=5000,
    )
    amount = payroll_service.calculate_billing_amount(record, employee_data)
    assert amount == 202000


# ================================================================
# GROSS SALARY LOGIC TESTS (Pago al Empleado)
# ================================================================


def test_company_cost_calculation(payroll_service, test_employee):
    """Verify Company Cost = Gross Salary + Legal Welfare + (NO double counting)"""
    record = PayrollRecordCreate(
        employee_id=test_employee["employee_id"],
        period="2025年1月",
        gross_salary=250000,
        social_insurance=15000,
        welfare_pension=30000,
        paid_leave_amount=30000,
        transport_allowance=20000,
    )

    result = payroll_service.create_payroll_record(record)

    expected_company_social = 15000 + 30000
    assert result["company_social_insurance"] == expected_company_social
    assert result["company_employment_insurance"] == 2250
    assert result["company_workers_comp"] == 750
    expected_total_cost = 250000 + 45000 + 2250 + 750
    assert result["total_company_cost"] == expected_total_cost
