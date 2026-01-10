"""
Auth Router - Authentication and user management endpoints
"""
import logging
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from auth import AuthService, validate_token
from auth_dependencies import (
    clear_rate_limit,
    log_action,
    rate_limit_login,
    require_admin,
    require_auth,
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
    """Login and get token (rate limited: 5 attempts per minute)"""
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

    return result


@router.post("/api/auth/logout")
async def logout(
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """Logout and revoke token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.replace("Bearer ", "")
    service = AuthService(db)

    if service.logout(token):
        return {"message": "Logged out successfully"}
    return {"message": "Token not found or already revoked"}


@router.get("/api/auth/me")
async def get_current_user_info(
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """Get current user info"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.replace("Bearer ", "")
    user = validate_token(db, token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


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
