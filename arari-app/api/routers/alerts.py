"""
Alerts Router - Alert management endpoints
"""
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from alerts import AlertService
from auth_dependencies import require_admin, require_auth
from database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def get_alerts(
    severity: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get alerts with optional filtering"""
    service = AlertService(db)
    return service.get_alerts(severity=severity, is_resolved=is_resolved, period=period)


@router.get("/summary")
async def get_alerts_summary(db: sqlite3.Connection = Depends(get_db)):
    """Get alerts summary by severity"""
    service = AlertService(db)
    return service.get_alert_summary()


@router.post("/scan")
async def scan_for_alerts(
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Scan data and generate alerts (requires authentication)"""
    service = AlertService(db)
    return service.scan_for_alerts(period=period)


@router.put("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    payload: dict = None,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Resolve an alert (requires authentication)"""
    service = AlertService(db)
    payload = payload or {}
    success = service.resolve_alert(
        alert_id,
        resolved_by=current_user.get("username"),
        notes=payload.get("notes")
    )
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "resolved"}


@router.get("/thresholds")
async def get_alert_thresholds(db: sqlite3.Connection = Depends(get_db)):
    """Get alert thresholds"""
    service = AlertService(db)
    return service.get_thresholds()


@router.put("/thresholds/{key}")
async def update_alert_threshold(
    key: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Update alert threshold (requires admin)"""
    service = AlertService(db)
    value = payload.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="Value required")
    service.update_threshold(key, float(value))
    return {"status": "updated", "key": key, "value": value}
