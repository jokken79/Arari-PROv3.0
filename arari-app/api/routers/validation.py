"""
Validation Router - Data validation endpoints
"""
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends

from auth_dependencies import require_admin
from database import get_db
from validation import ValidationService

router = APIRouter(prefix="/api/validation", tags=["validation"])


@router.get("")
async def validate_all_data(db: sqlite3.Connection = Depends(get_db)):
    """Run full data validation"""
    service = ValidationService(db)
    return service.validate_all()


@router.get("/employees")
async def validate_employees_data(db: sqlite3.Connection = Depends(get_db)):
    """Validate employee data"""
    service = ValidationService(db)
    service.validate_employees()
    return service.get_summary()


@router.get("/payroll")
async def validate_payroll_data(db: sqlite3.Connection = Depends(get_db)):
    """Validate payroll data"""
    service = ValidationService(db)
    service.validate_payroll()
    return service.get_summary()


@router.post("/fix")
async def auto_fix_issues(
    payload: dict = None,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Auto-fix certain data issues (requires admin)"""
    service = ValidationService(db)
    fix_types = payload.get("fix_types") if payload else None
    return service.auto_fix(fix_types)
