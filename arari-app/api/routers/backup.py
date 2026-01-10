"""
Backup Router - Database backup endpoints
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from auth_dependencies import require_admin
from backup import BackupService

router = APIRouter(prefix="/api/backups", tags=["backups"])


@router.get("")
async def list_backups():
    """List all backups"""
    service = BackupService()
    return service.list_backups()


@router.post("")
async def create_backup(
    payload: dict = None,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Create a new backup (requires admin)"""
    service = BackupService()
    description = payload.get("description") if payload else None
    result = service.create_backup(description)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.get("/stats")
async def get_backup_stats():
    """Get backup statistics"""
    service = BackupService()
    return service.get_backup_stats()


@router.post("/{filename}/restore")
async def restore_backup(
    filename: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Restore from backup (requires admin)"""
    service = BackupService()
    result = service.restore_backup(filename)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/{filename}/verify")
async def verify_backup(filename: str):
    """Verify backup integrity"""
    service = BackupService()
    return service.verify_backup(filename)


@router.delete("/{filename}")
async def delete_backup_file(
    filename: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a backup (requires admin)"""
    service = BackupService()
    result = service.delete_backup(filename)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
