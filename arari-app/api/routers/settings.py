"""
Settings Router - System configuration endpoints
"""
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from auth_dependencies import require_admin, require_auth
from database import get_db
from services import PayrollService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings(db: sqlite3.Connection = Depends(get_db)):
    """Get all system settings"""
    service = PayrollService(db)
    return service.get_all_settings()


@router.get("/rates/insurance")
async def get_insurance_rates(db: sqlite3.Connection = Depends(get_db)):
    """Get current insurance rates"""
    service = PayrollService(db)
    return service.get_insurance_rates()


@router.get("/ignored-companies")
async def get_ignored_companies(db: sqlite3.Connection = Depends(get_db)):
    """Get list of ignored companies"""
    service = PayrollService(db)
    return service.get_ignored_companies()


@router.get("/{key}")
async def get_setting(key: str, db: sqlite3.Connection = Depends(get_db)):
    """Get a single setting by key"""
    service = PayrollService(db)
    value = service.get_setting(key)
    if value is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return {"key": key, "value": value}


@router.put("/{key}")
async def update_setting(
    key: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Update a setting (requires admin)"""
    service = PayrollService(db)
    value = payload.get("value")
    description = payload.get("description")

    if value is None:
        raise HTTPException(status_code=400, detail="'value' is required")

    service.update_setting(key, str(value), description)
    return {"key": key, "value": value, "status": "updated"}


# Create a separate router for reset-db at /api level
reset_router = APIRouter(prefix="/api", tags=["data-management"])


@reset_router.delete("/reset-db")
async def reset_database(
    target: str = "payroll",
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Reset/delete data from the database (requires admin).
    
    Target options:
    - payroll: Delete only payroll records
    - employees: Delete employees and related payroll records  
    - all: Delete all data (employees, payroll, additional costs, etc.)
    """
    valid_targets = ["payroll", "employees", "all"]
    if target not in valid_targets:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid target. Must be one of: {', '.join(valid_targets)}"
        )
    
    cursor = db.cursor()
    deleted = {"target": target, "counts": {}}
    
    try:
        if target == "payroll":
            # Delete only payroll records
            cursor.execute("SELECT COUNT(*) FROM payroll_records")
            count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM payroll_records")
            deleted["counts"]["payroll_records"] = count
            
        elif target == "employees":
            # Delete employees and payroll records
            cursor.execute("SELECT COUNT(*) FROM payroll_records")
            payroll_count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM payroll_records")
            deleted["counts"]["payroll_records"] = payroll_count
            
            cursor.execute("SELECT COUNT(*) FROM employees")
            emp_count = cursor.fetchone()[0]
            cursor.execute("DELETE FROM employees")
            deleted["counts"]["employees"] = emp_count
            
        elif target == "all":
            # Delete all data
            tables = ["payroll_records", "employees", "additional_costs", "budgets", "alerts"]
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    cursor.execute(f"DELETE FROM {table}")
                    deleted["counts"][table] = count
                except sqlite3.OperationalError:
                    # Table doesn't exist, skip
                    pass
        
        db.commit()
        deleted["status"] = "success"
        deleted["message"] = f"Successfully deleted data for target: {target}"
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")
    
    return deleted

