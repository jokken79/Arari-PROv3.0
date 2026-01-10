"""
Cache Router - Cache management endpoints
"""
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends

from auth_dependencies import require_admin
from cache import CacheService
from database import get_db

router = APIRouter(prefix="/api/cache", tags=["cache"])


@router.get("/stats")
async def get_cache_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get cache statistics"""
    service = CacheService(db)
    return {
        "memory": service.get_stats(),
        "persistent": service.get_persistent_stats()
    }


@router.post("/clear")
async def clear_cache(
    payload: dict = None,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Clear cache (requires admin)"""
    service = CacheService(db)
    pattern = payload.get("pattern") if payload else None
    memory_cleared = service.clear(pattern)
    persistent_cleared = service.clear_persistent(pattern)
    return {
        "memory_cleared": memory_cleared,
        "persistent_cleared": persistent_cleared
    }
