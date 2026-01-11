"""
Auth Router - Authentication and user management endpoints
Supports HttpOnly cookie-based authentication for enhanced XSS protection
Includes refresh token functionality for secure token rotation
"""
import logging
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from auth import (
    AuthService,
    validate_token,
    rotate_refresh_token,
    revoke_refresh_token,
    cleanup_expired_refresh_tokens,
)
from auth_dependencies import (
    clear_all_auth_cookies,
    clear_auth_cookie,
    clear_rate_limit,
    clear_refresh_cookie,
    get_refresh_token_from_cookie,
    get_token,
    log_action,
    rate_limit_login,
    require_admin,
    require_auth,
    set_auth_cookie,
    set_refresh_cookie,
    COOKIE_NAME,
    REFRESH_COOKIE_NAME,
)
from database import get_db

router = APIRouter(tags=["auth"])


@router.post("/api/auth/login")
async def login(
    request: Request,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    _: None = Depends(rate_limit_login)
):
    """
    Login and get token (rate limited: 5 attempts per minute).

    Sets an HttpOnly cookie with the auth token for enhanced XSS protection.
    Also returns the token in the response body for backward compatibility
    with API clients that use Authorization headers.
    """
    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    service = AuthService(db)
    result = service.login(username, password)

    if not result:
        logging.warning(f"Failed login attempt for user: {username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if "error" in result:
        raise HTTPException(status_code=403, detail=result["error"])

    # Clear rate limit on successful login
    client_ip = request.client.host if request.client else "unknown"
    clear_rate_limit(client_ip, "login")
    logging.info(f"User logged in: {username}")

    # Create response with HttpOnly cookies
    response = JSONResponse(content=result)

    # Set the HttpOnly cookie with the access token
    # This protects against XSS attacks as JavaScript cannot access the token
    set_auth_cookie(response, result["token"])

    # Set the HttpOnly cookie with the refresh token
    # Refresh token is stored separately with restricted path for security
    if "refresh_token" in result:
        set_refresh_cookie(response, result["refresh_token"])

    return response


@router.post("/api/auth/logout")
async def logout(
    request: Request,
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Logout and revoke both access and refresh tokens.

    Supports both cookie and header-based authentication.
    Clears all HttpOnly auth cookies on logout.
    """
    # Get access token from cookie or header
    token = get_token(request, authorization)

    # Get refresh token from cookie
    refresh_token = get_refresh_token_from_cookie(request)

    if not token and not refresh_token:
        raise HTTPException(status_code=401, detail="No token provided")

    service = AuthService(db)

    # Revoke access token
    token_revoked = False
    if token:
        token_revoked = service.logout(token, refresh_token)

    # Revoke refresh token if present (handles case where only refresh token exists)
    if refresh_token and not token:
        revoke_refresh_token(db, refresh_token)

    # Create response and clear all auth cookies
    response_data = {
        "message": "Logged out successfully" if token_revoked or refresh_token else "Token not found or already revoked"
    }
    response = JSONResponse(content=response_data)

    # Always clear all auth cookies on logout attempt
    clear_all_auth_cookies(response)

    return response


@router.get("/api/auth/me")
async def get_current_user_info(
    request: Request,
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Get current user info.

    Supports both cookie and header-based authentication.
    """
    # Get token from cookie or header
    token = get_token(request, authorization)

    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    user = validate_token(db, token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


@router.post("/api/auth/refresh")
async def refresh_tokens(
    request: Request,
    payload: Optional[dict] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Refresh access token using a valid refresh token.

    The refresh token can be provided via:
    1. HttpOnly cookie (preferred, most secure)
    2. Request body as {"refresh_token": "..."} (for API clients)

    This endpoint implements refresh token rotation for enhanced security:
    - The old refresh token is revoked after use
    - A new access token and refresh token pair is issued

    Returns:
    - New access token
    - New refresh token
    - User info
    """
    # Try to get refresh token from cookie first (most secure)
    refresh_token = get_refresh_token_from_cookie(request)

    # Fall back to request body for API clients
    if not refresh_token and payload:
        refresh_token = payload.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token required. Provide via cookie or request body."
        )

    # Rotate the refresh token (validate, revoke old, issue new)
    result = rotate_refresh_token(db, refresh_token)

    if not result:
        logging.warning("Token refresh failed: Invalid or expired refresh token")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. Please login again."
        )

    logging.info(f"Token refreshed for user: {result['user']['username']}")

    # Create response with new tokens in HttpOnly cookies
    response = JSONResponse(content=result)

    # Set new access token cookie
    set_auth_cookie(response, result["token"])

    # Set new refresh token cookie
    if "refresh_token" in result:
        set_refresh_cookie(response, result["refresh_token"])

    return response


@router.post("/api/auth/revoke-refresh")
async def revoke_user_refresh_token(
    request: Request,
    payload: Optional[dict] = None,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """
    Revoke a specific refresh token without full logout.

    Useful for:
    - Revoking refresh tokens from other devices
    - Security: invalidating compromised tokens

    The refresh token to revoke can be provided via:
    1. Request body as {"refresh_token": "..."}
    2. HttpOnly cookie (revokes current refresh token)

    Requires authentication.
    """
    # Get refresh token from body or cookie
    refresh_token = None
    if payload:
        refresh_token = payload.get("refresh_token")

    if not refresh_token:
        refresh_token = get_refresh_token_from_cookie(request)

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Refresh token required"
        )

    revoked = revoke_refresh_token(db, refresh_token)

    response_data = {
        "revoked": revoked,
        "message": "Refresh token revoked" if revoked else "Token not found or already revoked"
    }
    response = JSONResponse(content=response_data)

    # Clear the refresh cookie if it was the one being revoked
    cookie_token = get_refresh_token_from_cookie(request)
    if cookie_token == refresh_token:
        clear_refresh_cookie(response)

    return response


@router.get("/api/users")
async def get_users(
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Get all users (requires admin)"""
    service = AuthService(db)
    return service.get_users()


@router.post("/api/users")
async def create_user(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Create new user (requires admin)"""
    service = AuthService(db)
    result = service.create_user(
        username=payload.get("username"),
        password=payload.get("password"),
        role=payload.get("role", "viewer"),
        full_name=payload.get("full_name"),
        email=payload.get("email")
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    log_action(db, current_user, "create", "user", payload.get("username", ""), "Created new user")
    return result


@router.put("/api/users/change-password")
async def change_password(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Change current user's password"""
    old_password = payload.get("old_password")
    new_password = payload.get("new_password")

    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Old and new password required")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    service = AuthService(db)
    result = service.change_password(
        user_id=current_user.get("user_id"),
        old_password=old_password,
        new_password=new_password
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    log_action(db, current_user, "update", "user", current_user.get("username", ""), "Changed password")
    return result


@router.put("/api/users/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Reset user password (admin only)"""
    new_password = payload.get("new_password")

    if not new_password:
        raise HTTPException(status_code=400, detail="New password required")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    service = AuthService(db)
    result = service.reset_password(user_id=user_id, new_password=new_password)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    log_action(db, current_user, "update", "user", str(user_id), "Reset password (admin)")
    return result
