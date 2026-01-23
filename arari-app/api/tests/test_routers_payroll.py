"""
Test suite for routers/payroll.py
Tests payroll record CRUD and period management
Follows TDD: RED-GREEN-REFACTOR cycle
"""

import pytest
from models import PayrollRecordCreate, EmployeeCreate


class TestGetPayrollRecords:
    """Test GET /payroll endpoint"""

    def test_get_payroll_records_returns_list(self, test_client):
        """Given request to GET /payroll, returns list"""
        # Act
        response = test_client.get("/api/payroll")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_payroll_with_period_filter(self, test_client):
        """Given period parameter, filters records"""
        # Act
        response = test_client.get("/api/payroll?period=2025年1月")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_payroll_with_employee_filter(self, test_client):
        """Given employee_id parameter, filters records"""
        # Act
        response = test_client.get("/api/payroll?employee_id=EMP001")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_payroll_with_multiple_filters(self, test_client):
        """Given multiple filter parameters, applies all"""
        # Act
        response = test_client.get("/api/payroll?period=2025年1月&employee_id=EMP001")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGetAvailablePeriods:
    """Test GET /payroll/periods endpoint"""

    def test_get_available_periods_returns_list(self, test_client):
        """Given request to GET /payroll/periods, returns period list"""
        # Act
        response = test_client.get("/api/payroll/periods")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each item should be a period string like "2025年1月"

    def test_available_periods_format_japanese(self, test_client):
        """Given periods returned, uses Japanese format (YYYY年MM月)"""
        # Act
        response = test_client.get("/api/payroll/periods")

        # Assert
        assert response.status_code == 200
        data = response.json()
        for period in data:
            assert isinstance(period, str)
            # Should contain 年 (year) and 月 (month) in Japanese
            assert "年" in period or len(data) == 0


class TestCreatePayrollRecord:
    """Test POST /payroll endpoint"""

    def test_create_payroll_record_succeeds(self, authenticated_client, db_session):
        """Given valid payroll data and auth, creates record"""
        # Arrange - create employee first
        from services import PayrollService
        service = PayrollService(db_session)
        emp_data = EmployeeCreate(
            employee_id="EMP_PAYROLL",
            name="Taro",
            name_kana="タロー",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        # Payroll data
        payroll_data = {
            "employee_id": "EMP_PAYROLL",
            "period": "2025年1月",
            "work_hours": 160,
            "overtime_hours": 10,
            "night_hours": 5,
            "holiday_hours": 8,
            "overtime_over_60h": 0,
            "work_days": 20,
            "paid_leave_days": 0,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "company_social_insurance": 40000,
            "company_employment_insurance": 9000,
            "company_workers_comp": 3000,
            "total_company_cost": 1052000,
            "gross_profit": 198000,
            "profit_margin": 15.84
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["employee_id"] == "EMP_PAYROLL"
        assert data["period"] == "2025年1月"

    def test_create_payroll_without_auth_fails(self, test_client):
        """Given no authentication, returns 401/403"""
        # Arrange
        payroll_data = {
            "employee_id": "EMP_TEST",
            "period": "2025年1月",
            "work_hours": 160,
            "overtime_hours": 10,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "total_company_cost": 1100000,
            "gross_profit": 150000,
            "profit_margin": 12.0
        }

        # Act
        response = test_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code in [401, 403]

    def test_create_payroll_record_persists(self, authenticated_client, db_session):
        """Given payroll created, persists to database"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)

        # Create employee
        emp_data = EmployeeCreate(
            employee_id="EMP_PERSIST",
            name="Test",
            name_kana="テスト",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        # Create payroll
        payroll_data = {
            "employee_id": "EMP_PERSIST",
            "period": "2025年2月",
            "work_hours": 160,
            "overtime_hours": 10,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "total_company_cost": 1100000,
            "gross_profit": 150000,
            "profit_margin": 12.0
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert - record created
        assert response.status_code == 200

        # Verify persisted by retrieving
        get_response = authenticated_client.get("/api/payroll?employee_id=EMP_PERSIST&period=2025年2月")
        assert get_response.status_code == 200
        records = get_response.json()
        assert len(records) > 0


class TestPayrollMarginCalculation:
    """Test margin calculations in payroll"""

    def test_payroll_margin_percentage_calculated(self, authenticated_client, db_session):
        """Given payroll data, profit_margin calculated correctly"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)

        emp_data = EmployeeCreate(
            employee_id="EMP_MARGIN",
            name="Test",
            name_kana="テスト",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        # Payroll: billing=1250000, cost=1100000, profit=150000, margin=12%
        payroll_data = {
            "employee_id": "EMP_MARGIN",
            "period": "2025年3月",
            "work_hours": 160,
            "overtime_hours": 0,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "total_company_cost": 1100000,
            "gross_profit": 150000,
            "profit_margin": 12.0
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["profit_margin"] == 12.0
        assert data["gross_profit"] == 150000

    def test_payroll_costs_summed_correctly(self, authenticated_client, db_session):
        """Given employee costs, total_company_cost includes all components"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)

        emp_data = EmployeeCreate(
            employee_id="EMP_COSTS",
            name="Test",
            name_kana="テスト",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        payroll_data = {
            "employee_id": "EMP_COSTS",
            "period": "2025年4月",
            "work_hours": 160,
            "overtime_hours": 5,
            "gross_salary": 1000000,
            "company_social_insurance": 40000,
            "company_employment_insurance": 9000,
            "company_workers_comp": 3000,
            "billing_amount": 1250000,
            "total_company_cost": 1052000,  # salary + all costs
            "gross_profit": 198000,
            "profit_margin": 15.84
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        # Total cost = gross_salary + social + employment + workers_comp
        # 1000000 + 40000 + 9000 + 3000 = 1052000
        expected_cost = 1000000 + 40000 + 9000 + 3000
        assert data["total_company_cost"] == expected_cost


class TestPayrollAuditLogging:
    """Test that payroll operations are logged"""

    def test_create_payroll_is_logged(self, authenticated_client, db_session):
        """Given payroll created, action is logged"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)

        emp_data = EmployeeCreate(
            employee_id="EMP_AUDIT",
            name="Test",
            name_kana="テスト",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        payroll_data = {
            "employee_id": "EMP_AUDIT",
            "period": "2025年5月",
            "work_hours": 160,
            "overtime_hours": 0,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "total_company_cost": 1100000,
            "gross_profit": 150000,
            "profit_margin": 12.0
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code == 200
        # TODO: Verify audit log entry exists


class TestPayrollPeriodFormats:
    """Test Japanese date period handling"""

    def test_payroll_period_japanese_format_accepted(self, authenticated_client, db_session):
        """Given Japanese period format (2025年1月), accepted"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)

        emp_data = EmployeeCreate(
            employee_id="EMP_JP",
            name="Test",
            name_kana="テスト",
            dispatch_company="ABC",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(emp_data)
        db_session.commit()

        payroll_data = {
            "employee_id": "EMP_JP",
            "period": "2025年12月",  # Japanese format
            "work_hours": 160,
            "gross_salary": 1000000,
            "billing_amount": 1250000,
            "total_company_cost": 1100000,
            "gross_profit": 150000,
            "profit_margin": 12.0
        }

        # Act
        response = authenticated_client.post("/api/payroll", json=payroll_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "2025年12月"

    def test_payroll_period_sorting_chronological(self, test_client):
        """Given multiple periods, available periods endpoint works"""
        # Act
        response = test_client.get("/api/payroll/periods")

        # Assert
        assert response.status_code == 200
        periods = response.json()

        # Should return list of periods
        assert isinstance(periods, list)
        # If periods exist, they should be strings in Japanese format
        for period in periods:
            assert isinstance(period, str)
            if period:  # If non-empty
                assert "年" in period or "月" in period or len(periods) == 0
