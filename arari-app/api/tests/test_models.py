"""
Test suite for models.py
Tests Pydantic model validation
Follows TDD: RED-GREEN-REFACTOR cycle
"""

import pytest
from pydantic import ValidationError

from models import (
    Employee,
    EmployeeCreate,
    PayrollRecord,
    PayrollRecordCreate,
)


class TestEmployeeModel:
    """Test Employee and EmployeeCreate models"""

    def test_employee_create_with_valid_data(self):
        """Given valid employee data, model accepts"""
        # Arrange
        data = {
            "employee_id": "EMP001",
            "name": "Taro Yamada",
            "name_kana": "ヤマダ太郎",
            "dispatch_company": "ABC Corp",
            "hourly_rate": 1500.0,
            "billing_rate": 2000.0,
            "status": "active"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.employee_id == "EMP001"
        assert employee.name == "Taro Yamada"
        assert employee.hourly_rate == 1500.0

    def test_employee_create_required_fields_only(self):
        """Given only required fields, model accepts"""
        # Arrange
        data = {
            "employee_id": "EMP002",
            "name": "Hanako",
            "dispatch_company": "XYZ Corp"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.employee_id == "EMP002"
        assert employee.hourly_rate == 0  # Default

    def test_employee_create_missing_required_field_fails(self):
        """Given missing required field, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP003",
            # Missing: name
            "dispatch_company": "ABC Corp"
        }

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            EmployeeCreate(**data)

        assert "name" in str(exc_info.value).lower()

    def test_employee_create_optional_fields(self):
        """Given optional fields omitted, model accepts defaults"""
        # Arrange
        data = {
            "employee_id": "EMP004",
            "name": "Test",
            "dispatch_company": "ABC"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.status == "active"  # Default
        assert employee.employee_type == "haken"  # Default
        assert employee.name_kana is None  # Optional

    def test_employee_create_with_nationality(self):
        """Given nationality field, accepts"""
        # Arrange
        data = {
            "employee_id": "EMP_NAT",
            "name": "Foreign Worker",
            "dispatch_company": "ABC",
            "nationality": "Vietnam"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.nationality == "Vietnam"

    def test_employee_create_with_birth_date(self):
        """Given birth_date in YYYY-MM-DD format, accepts"""
        # Arrange
        data = {
            "employee_id": "EMP_BIRTH",
            "name": "Test",
            "dispatch_company": "ABC",
            "birth_date": "1990-05-15"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.birth_date == "1990-05-15"

    def test_employee_model_with_calculated_fields(self):
        """Given Employee model with calculated fields"""
        # Arrange
        data = {
            "employee_id": "EMP_CALC",
            "name": "Test",
            "dispatch_company": "ABC",
            "profit_per_hour": 500.0,
            "margin_rate": 12.5
        }

        # Act
        employee = Employee(**data)

        # Assert
        assert employee.profit_per_hour == 500.0
        assert employee.margin_rate == 12.5

    def test_employee_gender_field_accepts_m_f(self):
        """Given gender field with M or F, accepts"""
        # Arrange
        data_m = {
            "employee_id": "EMP_M",
            "name": "Male",
            "dispatch_company": "ABC",
            "gender": "M"
        }
        data_f = {
            "employee_id": "EMP_F",
            "name": "Female",
            "dispatch_company": "ABC",
            "gender": "F"
        }

        # Act
        emp_m = EmployeeCreate(**data_m)
        emp_f = EmployeeCreate(**data_f)

        # Assert
        assert emp_m.gender == "M"
        assert emp_f.gender == "F"


class TestPayrollRecordModel:
    """Test PayrollRecord and PayrollRecordCreate models"""

    def test_payroll_record_create_with_valid_data(self):
        """Given valid payroll data, model accepts"""
        # Arrange
        data = {
            "employee_id": "EMP001",
            "period": "2025年1月",
            "work_hours": 160,
            "overtime_hours": 10,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.employee_id == "EMP001"
        assert record.period == "2025年1月"
        assert record.work_hours == 160

    def test_payroll_record_period_validation_valid_format(self):
        """Given period in YYYY年M月 format, accepts"""
        # Arrange & Act - valid formats
        valid_periods = [
            "2025年1月",
            "2025年12月",
            "2026年6月",
        ]

        for period in valid_periods:
            data = {
                "employee_id": "EMP",
                "period": period,
            }
            record = PayrollRecordCreate(**data)
            assert record.period == period

    def test_payroll_record_period_validation_invalid_format_fails(self):
        """Given invalid period format, raises ValidationError"""
        # Arrange
        invalid_periods = [
            "2025-01",  # Wrong format
            "2025/1/15",  # Wrong format
            "Jan 2025",  # Wrong format
            "2025年1月1日",  # Day included
        ]

        for period in invalid_periods:
            data = {
                "employee_id": "EMP",
                "period": period,
            }

            # Act & Assert
            with pytest.raises(ValidationError):
                PayrollRecordCreate(**data)

    def test_payroll_record_employee_id_empty_fails(self):
        """Given empty employee_id, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "",
            "period": "2025年1月",
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_work_hours_range_valid(self):
        """Given work_hours within valid range (0-400), accepts"""
        # Arrange
        valid_hours = [0, 160, 200, 400]

        for hours in valid_hours:
            data = {
                "employee_id": "EMP",
                "period": "2025年1月",
                "work_hours": hours,
            }

            # Act
            record = PayrollRecordCreate(**data)

            # Assert
            assert record.work_hours == hours

    def test_payroll_record_work_hours_exceeds_max_fails(self):
        """Given work_hours > 400, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "work_hours": 401,
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_work_hours_negative_fails(self):
        """Given negative work_hours, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "work_hours": -10,
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_overtime_hours_valid_range(self):
        """Given overtime_hours 0-100 (≤60h portion), accepts"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "overtime_hours": 60,  # Valid max
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.overtime_hours == 60

    def test_payroll_record_overtime_hours_exceeds_max_fails(self):
        """Given overtime_hours > 100, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "overtime_hours": 101,
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_negative_net_salary_accepted(self):
        """Given negative net_salary (over-deduction), accepts"""
        # NOTE: Model description says negative values allowed
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "net_salary": -50000,  # Over-deducted
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.net_salary == -50000

    def test_payroll_record_paid_leave_days_range(self):
        """Given paid_leave_days 0-25, accepts"""
        # Arrange
        valid_days = [0, 10, 25]

        for days in valid_days:
            data = {
                "employee_id": "EMP",
                "period": "2025年1月",
                "paid_leave_days": days,
            }

            # Act
            record = PayrollRecordCreate(**data)

            # Assert
            assert record.paid_leave_days == days

    def test_payroll_record_paid_leave_days_exceeds_max_fails(self):
        """Given paid_leave_days > 25, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "paid_leave_days": 26,
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_work_days_range(self):
        """Given work_days 0-31, accepts"""
        # Arrange
        valid_days = [0, 20, 31]

        for days in valid_days:
            data = {
                "employee_id": "EMP",
                "period": "2025年1月",
                "work_days": days,
            }

            # Act
            record = PayrollRecordCreate(**data)

            # Assert
            assert record.work_days == days

    def test_payroll_record_work_days_exceeds_max_fails(self):
        """Given work_days > 31, raises ValidationError"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "work_days": 32,
        }

        # Act & Assert
        with pytest.raises(ValidationError):
            PayrollRecordCreate(**data)

    def test_payroll_record_all_fields_with_data(self):
        """Given all payroll fields populated, model accepts"""
        # Arrange
        data = {
            "employee_id": "EMP_FULL",
            "period": "2025年2月",
            "work_days": 20,
            "work_hours": 160,
            "overtime_hours": 10,
            "overtime_over_60h": 0,
            "night_hours": 5,
            "holiday_hours": 8,
            "paid_leave_hours": 8,
            "paid_leave_days": 1,
            "paid_leave_amount": 10000,
            "base_salary": 900000,
            "overtime_pay": 25000,
            "night_pay": 3000,
            "holiday_pay": 15000,
            "overtime_over_60h_pay": 0,
            "transport_allowance": 5000,
            "other_allowances": 10000,
            "gross_salary": 1000000,
            "social_insurance": 40000,
            "welfare_pension": 35000,
            "employment_insurance": 9000,
            "income_tax": 30000,
            "resident_tax": 15000,
            "billing_amount": 1250000,
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.employee_id == "EMP_FULL"
        assert record.gross_salary == 1000000
        assert record.billing_amount == 1250000

    def test_payroll_record_year_end_adjustment_allows_negative(self):
        """Given negative year_end_adjustment (refund scenario), accepts"""
        # NOTE: Model description says negative values possible (refund)
        data = {
            "employee_id": "EMP",
            "period": "2025年12月",
            "year_end_adjustment": -50000,  # Refund
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.year_end_adjustment == -50000

    def test_payroll_record_transport_allowance_allows_negative(self):
        """Given negative transport_allowance (deduction scenario), accepts"""
        # NOTE: Model description says negative values possible (deduction)
        data = {
            "employee_id": "EMP",
            "period": "2025年1月",
            "transport_allowance": -5000,  # Deduction
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.transport_allowance == -5000


class TestModelDefaults:
    """Test default values for models"""

    def test_employee_create_status_defaults_to_active(self):
        """Given no status, defaults to active"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "name": "Test",
            "dispatch_company": "ABC"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.status == "active"

    def test_employee_create_employee_type_defaults_to_haken(self):
        """Given no employee_type, defaults to haken"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "name": "Test",
            "dispatch_company": "ABC"
        }

        # Act
        employee = EmployeeCreate(**data)

        # Assert
        assert employee.employee_type == "haken"

    def test_payroll_record_numeric_fields_default_to_zero(self):
        """Given numeric fields omitted, default to 0"""
        # Arrange
        data = {
            "employee_id": "EMP",
            "period": "2025年1月"
        }

        # Act
        record = PayrollRecordCreate(**data)

        # Assert
        assert record.work_hours == 0
        assert record.overtime_hours == 0
        assert record.gross_salary == 0
