"""
2FA (Two-Factor Authentication) Routes
TOTP-based 2FA management endpoints
"""

import json
import sqlite3
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import AuthService
from auth_dependencies import require_auth
from database import get_db
from totp_service import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp_code,
    generate_backup_codes,
    verify_backup_code,
    get_backup_codes_remaining,
)

router = APIRouter(prefix="/api/2fa", tags=["2FA"])


# ============== Pydantic Models ==============


class TwoFASetupResponse(BaseModel):
    """Response from 2FA setup"""

    totp_secret: str
    qr_uri: str
    backup_codes: list[str]


class TwoFAVerifyRequest(BaseModel):
    """Request to verify and enable 2FA"""

    totp_code: str
    backup_codes: list[str]


class TwoFAVerifyCodeRequest(BaseModel):
    """Request to verify TOTP code (for login)"""

    totp_code: Optional[str] = None
    backup_code: Optional[str] = None


class TwoFADisableRequest(BaseModel):
    """Request to disable 2FA"""

    password: str


class TwoFAStatusResponse(BaseModel):
    """Response with 2FA status"""

    totp_enabled: bool
    backup_codes_remaining: int




# ============== Routes ==============


@router.post("/setup", response_model=TwoFASetupResponse)
async def setup_2fa(
    current_user: Dict[str, Any] = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Generate TOTP secret and backup codes for 2FA setup
    Returns: secret, QR URI, and backup codes
    Stores temporary secret in database for verification step
    """
    user_id = current_user["user_id"]

    # Generate secret and backup codes
    secret = generate_totp_secret()
    backup_codes = generate_backup_codes()
    qr_uri = get_totp_uri(secret, f"User {user_id}", "ArariPRO")

    # Store temporary secret for verification (will be moved to totp_secret after verification)
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET totp_temp_secret = ? WHERE id = ?",
        (secret, user_id)
    )
    db.commit()

    return TwoFASetupResponse(
        totp_secret=secret,
        qr_uri=qr_uri,
        backup_codes=backup_codes,
    )


@router.post("/verify")
async def verify_2fa(
    request: TwoFAVerifyRequest,
    current_user: Dict[str, Any] = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Verify TOTP code and enable 2FA for user
    Validates code against temporary secret from setup step
    Stores secret and backup codes in database upon success
    """
    user_id = current_user["user_id"]

    # Verify code format
    if not request.totp_code or not request.totp_code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid code format")

    if len(request.totp_code) != 6 or not request.totp_code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    cursor = db.cursor()

    try:
        # Get temporary secret from database (stored during /setup)
        cursor.execute(
            "SELECT totp_temp_secret FROM users WHERE id = ?",
            (user_id,)
        )
        result = cursor.fetchone()

        if not result or not result[0]:
            raise HTTPException(status_code=400, detail="No 2FA setup in progress. Call /setup first.")

        temp_secret = result[0]

        # Verify the provided code against the temporary secret
        if not verify_totp_code(temp_secret, request.totp_code):
            raise HTTPException(status_code=400, detail="Invalid TOTP code")

        # Code verified successfully - store permanent secret and backup codes
        backup_codes_json = json.dumps(request.backup_codes)

        cursor.execute(
            """
            UPDATE users
            SET totp_secret = ?, totp_enabled = 1, backup_codes = ?, totp_temp_secret = NULL
            WHERE id = ?
        """,
            (temp_secret, backup_codes_json, user_id),
        )
        db.commit()

        return {"status": "2fa_enabled"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-code")
async def verify_code(
    request: TwoFAVerifyCodeRequest,
    current_user: Dict[str, Any] = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Verify TOTP or backup code during login
    Returns success if code is valid
    """
    user_id = current_user["user_id"]
    cursor = db.cursor()

    try:
        # Get user's 2FA info
        cursor.execute(
            "SELECT totp_secret, backup_codes FROM users WHERE id = ?",
            (user_id,),
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        totp_secret = result[0]
        backup_codes_json = result[1]

        # Verify TOTP code
        if request.totp_code:
            if not totp_secret:
                raise HTTPException(status_code=400, detail="2FA not enabled")

            if not verify_totp_code(totp_secret, request.totp_code):
                raise HTTPException(status_code=400, detail="Invalid TOTP code")

            return {"status": "verified"}

        # Verify backup code
        if request.backup_code:
            if not backup_codes_json:
                raise HTTPException(status_code=400, detail="No backup codes")

            backup_codes = json.loads(backup_codes_json)
            used_codes = []  # TODO: Track used codes properly

            if not verify_backup_code(request.backup_code, backup_codes, used_codes):
                raise HTTPException(status_code=400, detail="Invalid backup code")

            # Update used codes (TODO: persist this)
            # cursor.execute(
            #     "UPDATE users SET backup_codes_used = ? WHERE id = ?",
            #     (json.dumps(used_codes), user_id)
            # )
            # db.commit()

            return {"status": "verified"}

        raise HTTPException(status_code=400, detail="No code provided")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disable")
async def disable_2fa(
    request: TwoFADisableRequest,
    current_user: Dict[str, Any] = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Disable 2FA for user (requires password verification)
    """
    user_id = current_user["user_id"]

    try:
        # Verify password
        cursor = db.cursor()
        cursor.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user_id,),
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        password_hash = result[0]

        # Import verify_password
        from auth import verify_password

        if not verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")

        # Disable 2FA
        cursor.execute(
            """
            UPDATE users
            SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL
            WHERE id = ?
        """,
            (user_id,),
        )
        db.commit()

        return {"status": "2fa_disabled"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=TwoFAStatusResponse)
async def get_2fa_status(
    current_user: Dict[str, Any] = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Get current 2FA status for user
    Returns: enabled/disabled, remaining backup codes
    """
    user_id = current_user["user_id"]
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT totp_enabled, backup_codes FROM users WHERE id = ?",
            (user_id,),
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        totp_enabled = bool(result[0])
        backup_codes_json = result[1]

        backup_codes = []
        if backup_codes_json:
            backup_codes = json.loads(backup_codes_json)

        return TwoFAStatusResponse(
            totp_enabled=totp_enabled,
            backup_codes_remaining=len(backup_codes),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
