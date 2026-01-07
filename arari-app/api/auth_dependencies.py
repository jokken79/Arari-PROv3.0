"""
Authentication Dependencies for FastAPI
Provides reusable dependencies for route protection
"""

import logging
import sqlite3
import time
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, Request

from auth import check_role_level, has_permission, validate_token
from database import get_db

logger = logging.getLogger(__name__)

# Rate limiting storage (in production, use Redis)
_rate_limit_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 5  # max login attempts per window


def get_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract token from Authorization header"""
    if not authorization:
        return None
    if authorization.startswith("Bearer "):
        return authorization[7:]
    return authorization


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to get current user from token.
    Returns None if no token or invalid token.
    Use this for optional authentication.
    """
    token = get_token_from_header(authorization)
    if not token:
        return None

    user = validate_token(db, token)
    return user


async def require_auth(
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires a valid authentication token.
    Raises 401 if no token or invalid token.
    """
    token = get_token_from_header(authorization)

    if not token:
        logger.warning("Authentication required: No token provided")
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = validate_token(db, token)

    if not user:
        logger.warning("Authentication failed: Invalid or expired token")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


async def require_admin(
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires admin role.
    Raises 401 if not authenticated, 403 if not admin.
    """
    user = await require_auth(authorization, db)

    if user.get("role") != "admin":
        logger.warning(f"Admin access denied for user: {user.get('username')}")
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return user


async def require_manager_or_admin(
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires manager or admin role.
    """
    user = await require_auth(authorization, db)

    if not check_role_level(user.get("role", ""), "manager"):
        logger.warning(f"Manager access denied for user: {user.get('username')}")
        raise HTTPException(
            status_code=403,
            detail="Manager or admin access required"
        )

    return user


def require_permission(permission: str):
    """
    Factory for creating permission-based dependencies.

    Usage:
        @app.get("/api/protected")
        async def protected_route(user: dict = Depends(require_permission("edit:employees"))):
            ...
    """
    async def check_permission(
        authorization: Optional[str] = Header(None),
        db: sqlite3.Connection = Depends(get_db)
    ) -> Dict[str, Any]:
        user = await require_auth(authorization, db)

        if not has_permission(user.get("role", ""), permission):
            logger.warning(f"Permission '{permission}' denied for user: {user.get('username')}")
            raise HTTPException(
                status_code=403,
                detail=f"Permission required: {permission}"
            )

        return user

    return check_permission


def check_rate_limit(client_ip: str, endpoint: str = "login") -> bool:
    """
    Check if client has exceeded rate limit.
    Returns True if request is allowed, raises HTTPException if blocked.
    """
    key = f"{client_ip}:{endpoint}"
    current_time = time.time()

    # Clean old entries
    _rate_limit_store[key] = [
        t for t in _rate_limit_store[key]
        if current_time - t < RATE_LIMIT_WINDOW
    ]

    # Check limit
    if len(_rate_limit_store[key]) >= RATE_LIMIT_MAX_REQUESTS:
        retry_after = int(RATE_LIMIT_WINDOW - (current_time - _rate_limit_store[key][0]))
        logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    # Record request
    _rate_limit_store[key].append(current_time)
    return True


async def rate_limit_login(request: Request):
    """
    Dependency for rate limiting login attempts.
    Uses X-Forwarded-For header when behind a proxy (e.g., Railway, Vercel).
    """
    # Get client IP, checking X-Forwarded-For for proxy environments
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client) - proxies append to this header
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    check_rate_limit(client_ip, "login")


def clear_rate_limit(client_ip: str, endpoint: str = "login"):
    """Clear rate limit for a client (e.g., after successful login)"""
    key = f"{client_ip}:{endpoint}"
    if key in _rate_limit_store:
        del _rate_limit_store[key]


# Audit logging helper
def log_action(
    db: sqlite3.Connection,
    user: Optional[Dict[str, Any]],
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[str] = None
):
    """Log an action to the audit table"""
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user.get("user_id") if user else None,
                user.get("username") if user else "anonymous",
                action,
                entity_type,
                entity_id,
                details,
                datetime.now().isoformat()
            )
        )
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit action: {e}")
