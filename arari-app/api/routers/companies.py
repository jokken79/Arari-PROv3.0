"""
Companies Router - Company management endpoints
"""
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends

from auth_dependencies import require_auth
from database import get_db
from services import PayrollService

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.post("/{company_name}/toggle")
async def toggle_company_status(
    company_name: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Toggle company active status (requires authentication)"""
    service = PayrollService(db)
    active = payload.get("active", True)
    service.set_company_active(company_name, active)
    return {"status": "success", "company": company_name, "active": active}
