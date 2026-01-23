"""
TOTP-based 2FA Service
Uses pyotp for TOTP generation and verification
"""

import secrets
import string
from typing import List, Optional

import pyotp


def generate_totp_secret(length: int = 32) -> str:
    """Generate a new TOTP secret (base32 encoded)"""
    secret = pyotp.random_base32()
    return secret


def get_totp_uri(secret: str, username: str, issuer: str = "ArariPRO") -> str:
    """
    Get the otpauth URI for generating QR codes

    Args:
        secret: The TOTP secret
        username: The username for display
        issuer: The issuer name (app name)

    Returns:
        otpauth:// URI suitable for QR code generation
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=issuer)


def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
    """
    Verify a TOTP code

    Args:
        secret: The TOTP secret
        code: The 6-digit code to verify
        window: Number of 30-second windows to check (for clock skew)

    Returns:
        True if code is valid, False otherwise
    """
    try:
        # Validate code format
        if not code or not isinstance(code, str):
            return False

        if not code.isdigit() or len(code) != 6:
            return False

        totp = pyotp.TOTP(secret)
        # totp.verify() checks current window and adjacent windows
        return totp.verify(code, valid_window=window)
    except Exception:
        return False


def generate_backup_codes(count: int = 10, length: int = 8) -> List[str]:
    """
    Generate backup/recovery codes

    Args:
        count: Number of codes to generate (default 10)
        length: Length of each code (default 8)

    Returns:
        List of backup codes in format: XXXXXXXX
    """
    codes = []
    # Use uppercase alphanumeric (excluding O, I, l, 1, 0 to avoid confusion)
    chars = string.ascii_uppercase + string.digits.replace('0', '').replace('1', '')

    for _ in range(count):
        code = ''.join(secrets.choice(chars) for _ in range(length))
        codes.append(code)

    return codes


def verify_backup_code(code: str, backup_codes: List[str], used_codes: List[str]) -> bool:
    """
    Verify a backup/recovery code

    Args:
        code: The backup code to verify
        backup_codes: List of all valid backup codes
        used_codes: List of already-used backup codes (modified in-place)

    Returns:
        True if code is valid and not used, False otherwise
    """
    if not code or code not in backup_codes:
        return False

    if code in used_codes:
        return False

    # Mark code as used
    used_codes.append(code)
    return True


def get_totp_current_code(secret: str) -> str:
    """
    Get the current TOTP code (for testing/debugging)

    Args:
        secret: The TOTP secret

    Returns:
        Current 6-digit TOTP code
    """
    totp = pyotp.TOTP(secret)
    return totp.now()


def get_backup_codes_remaining(all_codes: List[str], used_codes: List[str]) -> int:
    """
    Get the number of remaining backup codes

    Args:
        all_codes: List of all backup codes
        used_codes: List of used codes

    Returns:
        Number of codes still available
    """
    return len(all_codes) - len(used_codes)
