"""
Authentication Dependencies for FastAPI
Provides reusable dependencies for route protection
Supports both HttpOnly cookie and Authorization header authentication
"""

import logging
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Cookie, Depends, Header, HTTPException, Request, Response

from auth import check_role_level, has_permission, validate_token
from database import get_db
from rate_limiter import (
    get_rate_limiter,
    get_client_ip,
    rate_limit_login as _rate_limit_login_new,
    rate_limit_upload,
    rate_limit_api_write,
    rate_limit_report,
    create_rate_limit_dependency,
)

load_dotenv()

logger = logging.getLogger(__name__)

# ============== Cookie Configuration ==============
# Cookie name for storing the access token
COOKIE_NAME = "arari_token"

# Cookie name for storing the refresh token
REFRESH_COOKIE_NAME = "arari_refresh_token"

# Cookie security settings from environment variables
# COOKIE_DOMAIN: Set to your domain in production (e.g., ".arari-pro.com")
# Leave empty for localhost/development
COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN", "")

# COOKIE_SECURE: Set to "true" in production (requires HTTPS)
# Default is "false" for local development
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

# Access token cookie expiration in seconds (24 hours, matches TOKEN_EXPIRE_HOURS in auth.py)
COOKIE_MAX_AGE = 24 * 60 * 60  # 24 hours

# Refresh token cookie expiration in seconds (7 days, matches REFRESH_TOKEN_EXPIRE_DAYS in auth.py)
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days

# SameSite policy: "lax", "strict", or "none"
# "lax" is recommended for most cases (allows top-level navigations)
# "none" requires COOKIE_SECURE=true
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")


def get_token_from_header(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract token from Authorization header"""
    if not authorization:
        return None
    if authorization.startswith("Bearer "):
        return authorization[7:]
    return authorization


def get_token_from_cookie(request: Request) -> Optional[str]:
    """Extract token from HttpOnly cookie"""
    return request.cookies.get(COOKIE_NAME)


def get_token(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Extract token from either HttpOnly cookie or Authorization header.
    Priority: Cookie > Header (cookie is more secure)
    This provides backward compatibility with API clients using headers.
    """
    # First try to get from cookie (more secure)
    token = get_token_from_cookie(request)
    if token:
        return token

    # Fall back to Authorization header for API compatibility
    return get_token_from_header(authorization)


def set_auth_cookie(response: Response, token: str) -> None:
    """
    Set the authentication token in an HttpOnly cookie.
    This is called after successful login.
    """
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,  # Not accessible via JavaScript (XSS protection)
        secure=COOKIE_SECURE,  # Only send over HTTPS in production
        samesite=COOKIE_SAMESITE,  # CSRF protection
        domain=COOKIE_DOMAIN if COOKIE_DOMAIN else None,  # None = current domain
        path="/",  # Cookie valid for all paths
    )
    logger.debug(f"Auth cookie set (secure={COOKIE_SECURE}, samesite={COOKIE_SAMESITE})")


def clear_auth_cookie(response: Response) -> None:
    """
    Clear the authentication cookie.
    This is called on logout.
    """
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN if COOKIE_DOMAIN else None,
        path="/",
    )
    logger.debug("Auth cookie cleared")


# ============== Refresh Token Cookie Functions ==============


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Extract refresh token from HttpOnly cookie"""
    return request.cookies.get(REFRESH_COOKIE_NAME)


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """
    Set the refresh token in an HttpOnly cookie.
    This is called after successful login.
    Refresh tokens have a longer expiry than access tokens.
    """
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,  # Not accessible via JavaScript (XSS protection)
        secure=COOKIE_SECURE,  # Only send over HTTPS in production
        samesite=COOKIE_SAMESITE,  # CSRF protection
        domain=COOKIE_DOMAIN if COOKIE_DOMAIN else None,
        path="/api/auth/refresh",  # Only send to refresh endpoint (reduces exposure)
    )
    logger.debug(f"Refresh cookie set (secure={COOKIE_SECURE}, samesite={COOKIE_SAMESITE})")


def clear_refresh_cookie(response: Response) -> None:
    """
    Clear the refresh token cookie.
    This is called on logout.
    """
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN if COOKIE_DOMAIN else None,
        path="/api/auth/refresh",
    )
    logger.debug("Refresh cookie cleared")


def clear_all_auth_cookies(response: Response) -> None:
    """
    Clear both access and refresh token cookies.
    This is called on full logout.
    """
    clear_auth_cookie(response)
    clear_refresh_cookie(response)
    logger.debug("All auth cookies cleared")


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to get current user from token (cookie or header).
    Returns None if no token or invalid token.
    Use this for optional authentication.
    """
    token = get_token(request, authorization)
    if not token:
        return None

    user = validate_token(db, token)
    return user


async def require_auth(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires a valid authentication token.
    Supports both HttpOnly cookie and Authorization header.
    Raises 401 if no token or invalid token.
    """
    token = get_token(request, authorization)

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
    request: Request,
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires admin role.
    Raises 401 if not authenticated, 403 if not admin.
    """
    user = await require_auth(request, authorization, db)

    if user.get("role") != "admin":
        logger.warning(f"Admin access denied for user: {user.get('username')}")
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return user


async def require_manager_or_admin(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency that requires manager or admin role.
    """
    user = await require_auth(request, authorization, db)

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
        request: Request,
        authorization: Optional[str] = Header(None),
        db: sqlite3.Connection = Depends(get_db)
    ) -> Dict[str, Any]:
        user = await require_auth(request, authorization, db)

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

    Uses Redis-based rate limiting when available, falls back to in-memory.
    """
    limiter = get_rate_limiter()
    is_allowed, retry_after, remaining = limiter.check(client_ip, endpoint)
    return is_allowed


async def rate_limit_login(request: Request):
    """
    Dependency for rate limiting login attempts.
    Uses X-Forwarded-For header when behind a proxy (e.g., Railway, Vercel).
    Supports Redis-based distributed rate limiting.
    """
    await _rate_limit_login_new(request)


def clear_rate_limit(client_ip: str, endpoint: str = "login"):
    """
    Clear rate limit for a client (e.g., after successful login).
    Works with both Redis and in-memory backends.
    """
    limiter = get_rate_limiter()
    limiter.clear(client_ip, endpoint)


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
