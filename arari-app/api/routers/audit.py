"""
Audit Router - Audit log endpoints
"""
import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends

from audit import AuditService
from database import get_db

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 100,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get audit logs"""
    service = AuditService(db)
    return service.get_logs(user_id=user_id, action=action, entity_type=entity_type, limit=limit)


@router.get("/summary")
async def get_audit_summary(
    days: int = 7,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get audit summary"""
    service = AuditService(db)
    return service.get_summary(days=days)


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get history for a specific entity"""
    service = AuditService(db)
    return service.get_entity_history(entity_type, entity_id)
