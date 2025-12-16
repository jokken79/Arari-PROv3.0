import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services import PayrollService
from models import EmployeeCreate, PayrollRecordCreate

@pytest.fixture
def seed_data(db_session):
    """Seed the database with test data."""
    service = PayrollService(db_session)
    
    # Create employees
    emp1 = EmployeeCreate(employee_id='EMP001', name='Empleado 1', dispatch_company='Empresa A', hourly_rate=1000, billing_rate=1500)
    emp2 = EmployeeCreate(employee_id='EMP002', name='Empleado 2', dispatch_company='Empresa B', hourly_rate=1200, billing_rate=1800)
    service.create_employee(emp1)
    service.create_employee(emp2)

    # Create payroll records
    pr1 = PayrollRecordCreate(employee_id='EMP001', period='2025年1月', work_hours=160)
    pr2 = PayrollRecordCreate(employee_id='EMP002', period='2025年1月', work_hours=160)
    service.create_payroll_record(pr1)
    service.create_payroll_record(pr2)
    
    db_session.commit()


def test_reset_db_target_payroll(test_client: TestClient, seed_data, db_session):
    """Test that `target=payroll` deletes only payroll records."""
    # Verify data exists before deletion
    employees_before = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_before = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_before) == 2
    assert len(payrolls_before) == 2

    # Call the endpoint
    response = test_client.delete("/api/reset-db?target=payroll")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify data after deletion
    employees_after = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_after = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_after) == 2
    assert len(payrolls_after) == 0


def test_reset_db_target_employees(test_client: TestClient, seed_data, db_session):
    """Test that `target=employees` deletes both employees and payroll records."""
    # Verify data exists before deletion
    employees_before = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_before = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_before) == 2
    assert len(payrolls_before) == 2

    # Call the endpoint
    response = test_client.delete("/api/reset-db?target=employees")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify data after deletion
    employees_after = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_after = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_after) == 0
    assert len(payrolls_after) == 0


def test_reset_db_target_all(test_client: TestClient, seed_data, db_session):
    """Test that `target=all` deletes all data."""
    # Verify data exists before deletion
    employees_before = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_before = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_before) == 2
    assert len(payrolls_before) == 2

    # Call the endpoint
    response = test_client.delete("/api/reset-db?target=all")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify data after deletion
    employees_after = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_after = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_after) == 0
    assert len(payrolls_after) == 0


def test_reset_db_no_target(test_client: TestClient, seed_data, db_session):
    """Test that no target defaults to deleting all data."""
    # Verify data exists before deletion
    employees_before = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_before = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_before) == 2
    assert len(payrolls_before) == 2

    # Call the endpoint
    response = test_client.delete("/api/reset-db")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify data after deletion
    employees_after = db_session.execute("SELECT * FROM employees").fetchall()
    payrolls_after = db_session.execute("SELECT * FROM payroll_records").fetchall()
    assert len(employees_after) == 0
    assert len(payrolls_after) == 0


def test_reset_db_invalid_target(test_client: TestClient, seed_data):
    """Test that an invalid target returns a 400 error."""
    response = test_client.delete("/api/reset-db?target=invalid")
    assert response.status_code == 400
