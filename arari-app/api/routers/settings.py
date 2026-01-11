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
