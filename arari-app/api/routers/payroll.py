"""
Payroll Router - Payroll record operations
"""
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends

from auth_dependencies import log_action, require_auth
from database import get_db
from models import PayrollRecord, PayrollRecordCreate
from services import PayrollService

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.get("", response_model=List[PayrollRecord])
async def get_payroll_records(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None,
    employee_id: Optional[str] = None
):
    """Get all payroll records with optional filtering"""
    service = PayrollService(db)
    return service.get_payroll_records(period=period, employee_id=employee_id)


@router.get("/periods")
async def get_available_periods(db: sqlite3.Connection = Depends(get_db)):
    """Get list of available periods"""
    service = PayrollService(db)
    return service.get_available_periods()


@router.post("", response_model=PayrollRecord)
async def create_payroll_record(
    record: PayrollRecordCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Create a new payroll record (requires authentication)"""
    service = PayrollService(db)
    result = service.create_payroll_record(record)
    db.commit()
    log_action(db, current_user, "create", "payroll", f"{record.employee_id}_{record.period}", "Created payroll record")
    return result
