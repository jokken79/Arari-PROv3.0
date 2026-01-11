"""
Notifications Router - Notification management endpoints
"""
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_dependencies import require_auth
from database import get_db
from notifications import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    user_id: Optional[int] = None,
    unread_only: bool = False,
    limit: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get notifications"""
    service = NotificationService(db)
    return service.get_notifications(user_id=user_id, unread_only=unread_only, limit=limit)


@router.get("/count")
async def get_unread_count(user_id: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get unread notification count"""
    service = NotificationService(db)
    return {"unread_count": service.get_unread_count(user_id)}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Mark notification as read (requires authentication)"""
    service = NotificationService(db)
    if service.mark_as_read(notification_id):
        return {"status": "marked_as_read"}
    raise HTTPException(status_code=404, detail="Notification not found")


@router.put("/read-all")
async def mark_all_read(
    user_id: int,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Mark all notifications as read (requires authentication)"""
    service = NotificationService(db)
    count = service.mark_all_read(user_id)
    return {"marked_count": count}


@router.get("/preferences/{user_id}")
async def get_notification_preferences(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Get notification preferences"""
    service = NotificationService(db)
    return service.get_preferences(user_id)


@router.put("/preferences/{user_id}")
async def update_notification_preferences(
    user_id: int,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Update notification preferences (requires authentication)"""
    service = NotificationService(db)
    return service.update_preferences(user_id, **payload)
