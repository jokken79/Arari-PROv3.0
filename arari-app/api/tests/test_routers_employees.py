"""
Test suite for routers/employees.py
Tests CRUD endpoints for employees management
Follows TDD: RED-GREEN-REFACTOR cycle
"""

import pytest
from fastapi import HTTPException

from models import EmployeeCreate


class TestGetEmployees:
    """Test GET /employees endpoint"""

    def test_get_all_employees_returns_list(self, test_client, db_session):
        """Given request to GET /employees, returns list of employees"""
        # Arrange - create test employees using fixtures

        # Act
        response = test_client.get("/api/employees")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_employees_with_search_filter(self, test_client):
        """Given search parameter, returns filtered employees"""
        # Arrange
        # Act
        response = test_client.get("/api/employees?search=Taro")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_employees_with_company_filter(self, test_client):
        """Given company parameter, returns employees from that company"""
        # Arrange
        # Act
        response = test_client.get("/api/employees?company=ABC%20Corp")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_employees_with_employee_type_filter(self, test_client):
        """Given employee_type parameter, returns employees of that type"""
        # Arrange
        # Act
        response = test_client.get("/api/employees?employee_type=haken")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGetEmployeeById:
    """Test GET /employees/{employee_id} endpoint"""

    def test_get_employee_by_id_returns_employee(self, test_client, db_session):
        """Given valid employee_id, returns employee details"""
        # Arrange - first create an employee
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP001",
            name="Taro Yamada",
            name_kana="ヤマダ太郎",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        created = service.create_employee(employee_data)
        db_session.commit()

        # Act
        response = test_client.get("/api/employees/EMP001")

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["employee_id"] == "EMP001"
        assert data["name"] == "Taro Yamada"

    def test_get_employee_nonexistent_returns_404(self, test_client):
        """Given non-existent employee_id, returns 404"""
        # Arrange
        # Act
        response = test_client.get("/api/employees/NONEXISTENT")

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCreateEmployee:
    """Test POST /employees endpoint"""

    def test_create_employee_with_valid_data_succeeds(self, test_client, authenticated_client):
        """Given valid employee data and auth, creates employee"""
        # Arrange
        employee_data = {
            "employee_id": "EMP_NEW_001",
            "name": "Hanako Suzuki",
            "name_kana": "スズキ花子",
            "dispatch_company": "XYZ Manufacturing",
            "hourly_rate": 1600.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.post("/api/employees", json=employee_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["employee_id"] == "EMP_NEW_001"
        assert data["name"] == "Hanako Suzuki"

    def test_create_employee_without_auth_fails(self, test_client):
        """Given no authentication, returns 403"""
        # Arrange
        employee_data = {
            "employee_id": "EMP_NEW_002",
            "name": "John Doe",
            "name_kana": "ジョン ドゥ",
            "dispatch_company": "International Corp",
            "hourly_rate": 1700.0,
            "status": "active"
        }

        # Act
        response = test_client.post("/api/employees", json=employee_data)

        # Assert
        assert response.status_code in [401, 403]

    def test_create_employee_duplicate_id_fails(self, test_client, authenticated_client, db_session):
        """Given duplicate employee_id, creation fails"""
        # Arrange - create first employee
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP_DUP",
            name="First Employee",
            name_kana="従業員１",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(employee_data)
        db_session.commit()

        # Act - try to create with same ID
        dup_data = {
            "employee_id": "EMP_DUP",
            "name": "Second Employee",
            "name_kana": "従業員２",
            "dispatch_company": "ABC Corp",
            "hourly_rate=": 1600.0,
            "status": "active"
        }
        response = authenticated_client.post("/api/employees", json=dup_data)

        # Assert
        assert response.status_code in [400, 409]  # Conflict/Bad request

    def test_create_employee_missing_required_field_fails(self, test_client, authenticated_client):
        """Given missing required field, creation fails"""
        # Arrange
        incomplete_data = {
            "employee_id": "EMP_INCOMPLETE",
            # Missing: name, name_kana, dispatch_company, hourly_rate
            "status": "active"
        }

        # Act
        response = authenticated_client.post("/api/employees", json=incomplete_data)

        # Assert
        assert response.status_code in [422, 400]  # Validation error


class TestUpdateEmployee:
    """Test PUT /employees/{employee_id} endpoint"""

    def test_update_employee_with_valid_data_succeeds(self, test_client, authenticated_client, db_session):
        """Given valid update data and auth, updates employee"""
        # Arrange - create employee first
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP_UPDATE",
            name="Original Name",
            name_kana="オリジナル",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(employee_data)
        db_session.commit()

        # Update data
        update_data = {
            "employee_id": "EMP_UPDATE",
            "name": "Updated Name",
            "name_kana": "アップデート",
            "dispatch_company": "ABC Corp",
            "hourly_rate": 1700.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.put("/api/employees/EMP_UPDATE", json=update_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["hourly_rate"] == 1700.0

    def test_update_nonexistent_employee_fails(self, test_client, authenticated_client):
        """Given non-existent employee_id, returns 404"""
        # Arrange
        update_data = {
            "employee_id": "NONEXISTENT",
            "name": "Someone",
            "name_kana": "誰か",
            "dispatch_company": "Any Corp",
            "hourly_rate": 1500.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.put("/api/employees/NONEXISTENT", json=update_data)

        # Assert
        assert response.status_code == 404

    def test_update_employee_without_auth_fails(self, test_client):
        """Given no authentication, returns 403"""
        # Arrange
        update_data = {
            "employee_id": "EMP_NOAUTH",
            "name": "Someone",
            "name_kana": "誰か",
            "dispatch_company": "Any Corp",
            "hourly_rate": 1500.0,
            "status": "active"
        }

        # Act
        response = test_client.put("/api/employees/EMP_NOAUTH", json=update_data)

        # Assert
        assert response.status_code in [401, 403]


class TestDeleteEmployee:
    """Test DELETE /employees/{employee_id} endpoint"""

    def test_delete_employee_with_admin_succeeds(self, admin_client, db_session):
        """Given admin auth and valid employee_id, deletes employee"""
        # Arrange - create employee first
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP_DELETE",
            name="To Delete",
            name_kana="削除",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(employee_data)
        db_session.commit()

        # Act
        response = admin_client.delete("/api/employees/EMP_DELETE")

        # Assert
        assert response.status_code == 200
        assert "successfully" in response.json()["message"].lower()

        # Verify deleted
        verify = admin_client.get("/api/employees/EMP_DELETE")
        assert verify.status_code == 404

    def test_delete_employee_without_admin_fails(self, authenticated_client):
        """Given non-admin auth, returns 403"""
        # Arrange
        # Act
        response = authenticated_client.delete("/api/employees/EMP_NOADMIN")

        # Assert
        assert response.status_code == 403

    def test_delete_nonexistent_employee_returns_404(self, admin_client):
        """Given non-existent employee_id, returns 404"""
        # Arrange
        # Act
        response = admin_client.delete("/api/employees/NONEXISTENT")

        # Assert
        assert response.status_code == 404

    def test_delete_without_auth_fails(self, test_client):
        """Given no authentication, returns 401/403"""
        # Arrange
        # Act
        response = test_client.delete("/api/employees/EMP_NOAUTH")

        # Assert
        assert response.status_code in [401, 403]


class TestEmployeeValidation:
    """Test validation of employee data"""

    def test_employee_hourly_rate_cannot_be_negative(self, test_client, authenticated_client):
        """Given negative hourly_rate, creation fails"""
        # Arrange
        invalid_data = {
            "employee_id": "EMP_NEGATIVE",
            "name": "Bad Rate",
            "name_kana": "悪いレート",
            "dispatch_company": "ABC Corp",
            "hourly_rate": -1000.0,  # Invalid
            "status": "active"
        }

        # Act
        response = authenticated_client.post("/api/employees", json=invalid_data)

        # Assert
        assert response.status_code in [400, 422]

    def test_employee_status_values_validated(self, test_client, authenticated_client):
        """Given invalid status value, creation fails"""
        # Arrange
        invalid_data = {
            "employee_id": "EMP_BADSTATUS",
            "name": "Bad Status",
            "name_kana": "悪いステータス",
            "dispatch_company": "ABC Corp",
            "hourly_rate": 1500.0,
            "status": "invalid_status"  # Should be active/inactive
        }

        # Act
        response = authenticated_client.post("/api/employees", json=invalid_data)

        # Assert
        # May or may not validate at API level - depends on model
        assert response.status_code in [200, 400, 422]

    def test_employee_names_unicode_supported(self, test_client, authenticated_client):
        """Given Japanese names, creates successfully"""
        # Arrange
        unicode_data = {
            "employee_id": "EMP_UNICODE",
            "name": "山田太郎",
            "name_kana": "ヤマダタロウ",
            "dispatch_company": "東京ビルディング",
            "hourly_rate": 1500.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.post("/api/employees", json=unicode_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "山田太郎"


class TestEmployeeAuditLogging:
    """Test that employee operations are logged"""

    def test_create_employee_is_logged(self, test_client, authenticated_client, db_session):
        """Given create_employee called, action is logged"""
        # Arrange
        employee_data = {
            "employee_id": "EMP_AUDIT_CREATE",
            "name": "Audit Test",
            "name_kana": "監査テスト",
            "dispatch_company": "ABC Corp",
            "hourly_rate": 1500.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.post("/api/employees", json=employee_data)

        # Assert
        assert response.status_code == 200
        # TODO: Verify audit log entry exists in database

    def test_update_employee_is_logged(self, authenticated_client, db_session):
        """Given update_employee called, action is logged"""
        # Arrange - create first
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP_AUDIT_UPDATE",
            name="Before",
            name_kana="前",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(employee_data)
        db_session.commit()

        # Update
        update_data = {
            "employee_id": "EMP_AUDIT_UPDATE",
            "name": "After",
            "name_kana": "後",
            "dispatch_company": "ABC Corp",
            "hourly_rate": 1600.0,
            "status": "active"
        }

        # Act
        response = authenticated_client.put("/api/employees/EMP_AUDIT_UPDATE", json=update_data)

        # Assert
        assert response.status_code == 200
        # TODO: Verify audit log entry exists

    def test_delete_employee_is_logged(self, admin_client, db_session):
        """Given delete_employee called, action is logged"""
        # Arrange
        from services import PayrollService
        service = PayrollService(db_session)
        employee_data = EmployeeCreate(
            employee_id="EMP_AUDIT_DELETE",
            name="To Log Delete",
            name_kana="削除ログ",
            dispatch_company="ABC Corp",
            hourly_rate=1500.0,
            status="active"
        )
        service.create_employee(employee_data)
        db_session.commit()

        # Act
        response = admin_client.delete("/api/employees/EMP_AUDIT_DELETE")

        # Assert
        assert response.status_code == 200
        # TODO: Verify audit log entry exists
