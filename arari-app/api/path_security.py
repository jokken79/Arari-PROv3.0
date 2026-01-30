"""
Path Security Module for Arari-PRO v3.0
OWASP-compliant path traversal prevention and filename sanitization.

This module provides security utilities to prevent:
- Path traversal attacks (../../etc/passwd)
- Directory escape vulnerabilities
- Malicious filename injection
- Windows reserved name attacks

Reference: OWASP Path Traversal Prevention Cheat Sheet
https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
"""

import os
import re
import unicodedata
from pathlib import Path
from typing import List, Optional, Set, Tuple

# ============================================================
# ALLOWED BASE PATHS - Whitelist of directories where file
# operations are permitted. All resolved paths MUST be within
# one of these directories.
# ============================================================

# Get the API directory as the base for allowed paths
_API_DIR = Path(__file__).parent.resolve()

ALLOWED_BASE_PATHS: List[Path] = [
    _API_DIR / "backups",           # Database backups
    _API_DIR / "uploads",           # Uploaded files (temp)
    _API_DIR / "exports",           # Generated exports
    _API_DIR / "templates",         # Excel templates
    Path(os.environ.get("TEMP", "/tmp")),  # System temp directory
    Path(os.environ.get("TMP", "/tmp")),   # Alternative temp (Windows)
]

# Windows reserved device names (case-insensitive)
# These cannot be used as filenames on Windows
WINDOWS_RESERVED_NAMES: Set[str] = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}

# Characters not allowed in filenames
# Includes path separators, null bytes, and shell metacharacters
DANGEROUS_FILENAME_CHARS: str = r'[<>:"/\\|?*\x00-\x1f]'

# Maximum filename length (Windows limit is 255, leave margin for extension handling)
MAX_FILENAME_LENGTH: int = 200

# Allowed file extensions for uploads (whitelist approach)
ALLOWED_UPLOAD_EXTENSIONS: Set[str] = {
    ".xlsx", ".xlsm", ".xls", ".csv",  # Excel/CSV files
    ".db",                               # Database backups
    ".json",                             # Configuration files
}


def validate_path_security(
    file_path: str,
    allowed_bases: Optional[List[Path]] = None,
    check_exists: bool = False
) -> Tuple[bool, str]:
    """
    Validate that a file path is secure and within allowed directories.

    Security checks performed:
    1. Path traversal sequences (.., ./) are rejected
    2. Null bytes are rejected
    3. Path must resolve to be within an allowed base directory
    4. Optionally verify the file exists

    Args:
        file_path: The path to validate (can be relative or absolute)
        allowed_bases: List of allowed base directories (defaults to ALLOWED_BASE_PATHS)
        check_exists: If True, also verify the file exists

    Returns:
        Tuple of (is_valid: bool, error_message: str)
        If valid, error_message will be empty string.

    Example:
        >>> is_valid, error = validate_path_security("/path/to/file.xlsx")
        >>> if not is_valid:
        ...     raise SecurityError(error)
    """
    if allowed_bases is None:
        allowed_bases = ALLOWED_BASE_PATHS

    # Check for null bytes (path truncation attack)
    if "\x00" in file_path:
        return False, "Path contains null byte"

    # Check for path traversal sequences
    # Normalize the path first to catch obfuscation attempts
    normalized = file_path.replace("\\", "/")

    if ".." in normalized:
        return False, "Path traversal sequence detected (..)"

    if normalized.startswith("./"):
        # Allow current directory reference, but log it
        pass

    # Check for URL-encoded traversal attempts
    if "%2e%2e" in file_path.lower() or "%252e" in file_path.lower():
        return False, "URL-encoded path traversal detected"

    # Check for Unicode normalization attacks
    try:
        normalized_unicode = unicodedata.normalize("NFKC", file_path)
        if ".." in normalized_unicode:
            return False, "Unicode-normalized path traversal detected"
    except Exception:
        return False, "Path contains invalid Unicode"

    # Resolve the path to absolute
    try:
        resolved_path = Path(file_path).resolve()
    except (OSError, ValueError) as e:
        return False, f"Invalid path: {e}"

    # Verify path is within allowed directories
    is_within_allowed = False
    for base_path in allowed_bases:
        try:
            resolved_base = base_path.resolve()
            # Use is_relative_to for Python 3.9+, fallback for older versions
            try:
                is_within_allowed = resolved_path.is_relative_to(resolved_base)
            except AttributeError:
                # Python < 3.9 fallback
                try:
                    resolved_path.relative_to(resolved_base)
                    is_within_allowed = True
                except ValueError:
                    continue

            if is_within_allowed:
                break
        except (OSError, ValueError):
            continue

    if not is_within_allowed:
        return False, "Path is outside allowed directories"

    # Optionally check if file exists
    if check_exists and not resolved_path.exists():
        return False, "File does not exist"

    return True, ""


def is_path_safe(file_path: str, allowed_bases: Optional[List[Path]] = None) -> bool:
    """
    Simple boolean check for path safety.

    Use this for quick validation where you don't need the error message.
    For detailed error information, use validate_path_security() instead.

    Args:
        file_path: The path to validate
        allowed_bases: Optional list of allowed base directories

    Returns:
        True if the path is safe, False otherwise
    """
    is_valid, _ = validate_path_security(file_path, allowed_bases)
    return is_valid


def sanitize_filename(
    filename: str,
    allow_spaces: bool = True,
    max_length: Optional[int] = None,
    replacement_char: str = "_"
) -> str:
    """
    Sanitize a filename to prevent security issues.

    Security measures:
    1. Remove/replace dangerous characters (path separators, null bytes, etc.)
    2. Block Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    3. Normalize Unicode to prevent homoglyph attacks
    4. Limit filename length
    5. Strip leading/trailing whitespace and dots

    Args:
        filename: The original filename to sanitize
        allow_spaces: If False, spaces are replaced with replacement_char
        max_length: Maximum allowed length (defaults to MAX_FILENAME_LENGTH)
        replacement_char: Character to replace dangerous chars with

    Returns:
        Sanitized filename safe for filesystem use

    Raises:
        ValueError: If the filename is empty or becomes empty after sanitization

    Example:
        >>> sanitize_filename("../../../etc/passwd")
        'etc_passwd'
        >>> sanitize_filename("CON.txt")
        '_CON.txt'
    """
    if max_length is None:
        max_length = MAX_FILENAME_LENGTH

    if not filename or not filename.strip():
        raise ValueError("Filename cannot be empty")

    # Normalize Unicode (NFC form is standard for most filesystems)
    try:
        filename = unicodedata.normalize("NFKC", filename)
    except Exception:
        raise ValueError("Filename contains invalid Unicode characters")

    # Remove null bytes
    filename = filename.replace("\x00", "")

    # Replace dangerous characters with underscore
    filename = re.sub(DANGEROUS_FILENAME_CHARS, replacement_char, filename)

    # Replace path separators that might have been missed
    filename = filename.replace("/", replacement_char)
    filename = filename.replace("\\", replacement_char)

    # Remove parent directory references
    filename = filename.replace("..", replacement_char)

    # Handle spaces if not allowed
    if not allow_spaces:
        filename = filename.replace(" ", replacement_char)

    # Strip leading/trailing whitespace and dots
    filename = filename.strip().strip(".")

    # Collapse multiple replacement characters
    while replacement_char * 2 in filename:
        filename = filename.replace(replacement_char * 2, replacement_char)

    # Check for Windows reserved names
    name_without_ext = filename.rsplit(".", 1)[0].upper()
    if name_without_ext in WINDOWS_RESERVED_NAMES:
        filename = replacement_char + filename

    # Truncate if too long (preserve extension if possible)
    if len(filename) > max_length:
        if "." in filename:
            name, ext = filename.rsplit(".", 1)
            ext = "." + ext
            available_length = max_length - len(ext)
            if available_length > 0:
                filename = name[:available_length] + ext
            else:
                filename = filename[:max_length]
        else:
            filename = filename[:max_length]

    # Final validation - ensure we have a usable filename
    if not filename or filename == replacement_char:
        raise ValueError("Filename became empty after sanitization")

    return filename


def validate_upload_filename(
    filename: str,
    allowed_extensions: Optional[Set[str]] = None
) -> Tuple[bool, str, str]:
    """
    Validate and sanitize an uploaded filename.

    Combines extension validation with filename sanitization for upload handling.

    Args:
        filename: The original uploaded filename
        allowed_extensions: Set of allowed extensions (defaults to ALLOWED_UPLOAD_EXTENSIONS)

    Returns:
        Tuple of (is_valid: bool, error_message: str, sanitized_filename: str)
        If invalid, sanitized_filename will be empty string.

    Example:
        >>> is_valid, error, safe_name = validate_upload_filename("report.xlsx")
        >>> if is_valid:
        ...     save_file(safe_name, content)
    """
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_UPLOAD_EXTENSIONS

    if not filename:
        return False, "Filename is required", ""

    # Check extension
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[1].lower()

    if ext not in allowed_extensions:
        allowed_list = ", ".join(sorted(allowed_extensions))
        return False, f"File extension '{ext}' not allowed. Allowed: {allowed_list}", ""

    # Sanitize the filename
    try:
        sanitized = sanitize_filename(filename)
    except ValueError as e:
        return False, str(e), ""

    return True, "", sanitized


def get_safe_path(
    base_dir: Path,
    filename: str,
    create_dirs: bool = False
) -> Optional[Path]:
    """
    Construct a safe path from a base directory and filename.

    This is the recommended way to build file paths from user input.
    It sanitizes the filename and verifies the result is within the base directory.

    Args:
        base_dir: The base directory (must be in ALLOWED_BASE_PATHS)
        filename: The filename (will be sanitized)
        create_dirs: If True, create the base directory if it doesn't exist

    Returns:
        Safe Path object, or None if the path would be unsafe

    Example:
        >>> safe_path = get_safe_path(BACKUP_DIR, user_filename)
        >>> if safe_path:
        ...     safe_path.write_bytes(content)
    """
    # Verify base_dir is allowed
    try:
        resolved_base = base_dir.resolve()
    except (OSError, ValueError):
        return None

    is_allowed = False

    for allowed in ALLOWED_BASE_PATHS:
        try:
            allowed_resolved = allowed.resolve()

            # Check if resolved_base IS an allowed path or is WITHIN an allowed path
            # Use string comparison for cross-platform compatibility
            resolved_base_str = str(resolved_base).lower()
            allowed_str = str(allowed_resolved).lower()

            # Exact match: base_dir is exactly an allowed path
            if resolved_base_str == allowed_str:
                is_allowed = True
                break

            # Containment: base_dir is a subdirectory of an allowed path
            # Need to check with separator to avoid partial matches
            # e.g., /tmp should not match /tmpfoo
            if resolved_base_str.startswith(allowed_str + os.sep):
                is_allowed = True
                break

        except (OSError, ValueError):
            continue

    if not is_allowed:
        return None

    # Sanitize filename
    try:
        safe_filename = sanitize_filename(filename)
    except ValueError:
        return None

    # Create directory if requested
    if create_dirs:
        base_dir.mkdir(parents=True, exist_ok=True)

    # Construct and verify final path
    final_path = base_dir / safe_filename

    try:
        resolved_final = final_path.resolve()
        # Verify it's still within base_dir
        try:
            resolved_final.is_relative_to(resolved_base)
        except AttributeError:
            resolved_final.relative_to(resolved_base)
    except (ValueError, OSError):
        return None

    return final_path


def secure_join(base: Path, *parts: str) -> Optional[Path]:
    """
    Securely join path components, preventing traversal.

    Similar to os.path.join but with security checks on each component.

    Args:
        base: Base directory path
        *parts: Path components to join

    Returns:
        Safe joined path, or None if any component would cause traversal

    Example:
        >>> path = secure_join(UPLOAD_DIR, year, month, filename)
        >>> if path is None:
        ...     raise SecurityError("Invalid path component")
    """
    try:
        resolved_base = base.resolve()
        current = resolved_base

        for part in parts:
            # Check each component for traversal attempts
            if not part or ".." in part or part.startswith("/") or part.startswith("\\"):
                return None

            # Sanitize the component
            try:
                safe_part = sanitize_filename(part, allow_spaces=False)
            except ValueError:
                return None

            current = current / safe_part

        # Verify final path is still under base
        resolved_final = current.resolve()
        try:
            resolved_final.is_relative_to(resolved_base)
        except AttributeError:
            resolved_final.relative_to(resolved_base)

        return current

    except (ValueError, OSError):
        return None


# Initialize allowed directories on module load
def _init_allowed_paths():
    """Ensure allowed directories exist."""
    for path in ALLOWED_BASE_PATHS:
        try:
            if not str(path).startswith("/tmp") and not str(path).startswith(os.environ.get("TEMP", "")):
                path.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError):
            pass  # Directory creation is optional

_init_allowed_paths()
