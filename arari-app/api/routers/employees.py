"""
Employees Router - CRUD operations for employees
"""
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_dependencies import log_action, require_admin, require_auth
from database import get_db
from models import Employee, EmployeeCreate
from services import PayrollService

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=List[Employee])
async def get_employees(
    db: sqlite3.Connection = Depends(get_db),
    search: Optional[str] = None,
    company: Optional[str] = None,
    employee_type: Optional[str] = None
):
    """Get all employees with optional filtering by search, company, and employee_type"""
    service = PayrollService(db)
    return service.get_employees(search=search, company=company, employee_type=employee_type)


@router.get("/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Get a single employee by ID"""
    service = PayrollService(db)
    employee = service.get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.post("", response_model=Employee)
async def create_employee(
    employee: EmployeeCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Create a new employee (requires authentication)"""
    service = PayrollService(db)
    result = service.create_employee(employee)
    log_action(db, current_user, "create", "employee", employee.employee_id, f"Created employee: {employee.name}")
    return result


@router.put("/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str,
    employee: EmployeeCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Update an existing employee (requires authentication)"""
    service = PayrollService(db)
    updated = service.update_employee(employee_id, employee)
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    log_action(db, current_user, "update", "employee", employee_id, f"Updated employee: {employee.name}")
    return updated


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete an employee (requires admin)"""
    service = PayrollService(db)
    if not service.delete_employee(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    log_action(db, current_user, "delete", "employee", employee_id, "Employee deleted")
    return {"message": "Employee deleted successfully"}
