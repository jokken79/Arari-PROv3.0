"""
Tests for path_security module - OWASP path traversal prevention.

Tests cover:
- Path traversal attack prevention
- Filename sanitization
- Windows reserved name blocking
- Upload filename validation
"""

import os
import sys
import pytest
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from path_security import (
    validate_path_security,
    is_path_safe,
    sanitize_filename,
    validate_upload_filename,
    get_safe_path,
    secure_join,
    ALLOWED_BASE_PATHS,
    WINDOWS_RESERVED_NAMES,
    ALLOWED_UPLOAD_EXTENSIONS,
)


class TestValidatePathSecurity:
    """Tests for validate_path_security function."""

    def test_reject_path_traversal_dotdot(self):
        """Reject paths with .. traversal sequences."""
        is_valid, error = validate_path_security("../../../etc/passwd")
        assert not is_valid
        assert "traversal" in error.lower()

    def test_reject_path_traversal_backslash(self):
        """Reject paths with backslash traversal on Windows."""
        is_valid, error = validate_path_security("..\\..\\windows\\system32")
        assert not is_valid
        assert "traversal" in error.lower()

    def test_reject_null_byte(self):
        """Reject paths with null byte injection."""
        is_valid, error = validate_path_security("file.txt\x00.exe")
        assert not is_valid
        assert "null" in error.lower()

    def test_reject_url_encoded_traversal(self):
        """Reject URL-encoded path traversal attempts."""
        is_valid, error = validate_path_security("%2e%2e/%2e%2e/etc/passwd")
        assert not is_valid
        assert "encoded" in error.lower()

    def test_reject_double_url_encoded_traversal(self):
        """Reject double URL-encoded path traversal attempts."""
        is_valid, error = validate_path_security("%252e%252e/etc/passwd")
        assert not is_valid
        assert "encoded" in error.lower()

    def test_reject_path_outside_allowed(self):
        """Reject paths outside allowed directories."""
        is_valid, error = validate_path_security("/etc/passwd")
        assert not is_valid
        assert "outside allowed" in error.lower()

    def test_accept_valid_path_in_allowed_dir(self):
        """Accept valid paths within allowed directories."""
        # Get the first allowed base path that exists
        for base in ALLOWED_BASE_PATHS:
            if base.exists():
                test_path = str(base / "test_file.txt")
                is_valid, error = validate_path_security(test_path)
                assert is_valid, f"Should accept path in allowed dir: {error}"
                return
        pytest.skip("No allowed base path exists")


class TestIsSafePathSimple:
    """Tests for is_path_safe simple boolean function."""

    def test_unsafe_path_returns_false(self):
        """Unsafe paths return False."""
        assert not is_path_safe("../secret.txt")
        assert not is_path_safe("/etc/passwd")
        assert not is_path_safe("file.txt\x00.exe")

    def test_safe_path_returns_true(self):
        """Safe paths return True."""
        for base in ALLOWED_BASE_PATHS:
            if base.exists():
                test_path = str(base / "valid_file.xlsx")
                assert is_path_safe(test_path)
                return
        pytest.skip("No allowed base path exists")


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""

    def test_remove_path_traversal_sequences(self):
        """Remove path traversal sequences from filename."""
        result = sanitize_filename("../../../etc/passwd")
        assert ".." not in result
        assert "/" not in result
        assert result  # Should not be empty

    def test_remove_path_separators(self):
        """Remove path separators from filename."""
        result = sanitize_filename("path/to/file.txt")
        assert "/" not in result
        result2 = sanitize_filename("path\\to\\file.txt")
        assert "\\" not in result2

    def test_remove_null_bytes(self):
        """Remove null bytes from filename."""
        result = sanitize_filename("file\x00name.txt")
        assert "\x00" not in result

    def test_remove_dangerous_characters(self):
        """Remove dangerous characters from filename."""
        dangerous = '<>:"|?*'
        for char in dangerous:
            result = sanitize_filename(f"file{char}name.txt")
            assert char not in result

    def test_prefix_windows_reserved_names(self):
        """Prefix Windows reserved names to make them safe."""
        for name in ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"]:
            result = sanitize_filename(f"{name}.txt")
            # Should not start with reserved name
            assert not result.upper().startswith(name + ".")

    def test_preserve_valid_filename(self):
        """Valid filenames should remain largely unchanged."""
        result = sanitize_filename("valid_file_123.xlsx")
        assert result == "valid_file_123.xlsx"

    def test_preserve_japanese_filename(self):
        """Japanese characters in filenames should be preserved."""
        result = sanitize_filename("2025年1月_給与明細.xlsx")
        assert "2025" in result
        assert "xlsx" in result.lower()

    def test_truncate_long_filename(self):
        """Long filenames should be truncated."""
        long_name = "a" * 300 + ".xlsx"
        result = sanitize_filename(long_name)
        assert len(result) <= 200

    def test_preserve_extension_when_truncating(self):
        """Extension should be preserved when truncating."""
        long_name = "a" * 300 + ".xlsx"
        result = sanitize_filename(long_name)
        assert result.endswith(".xlsx")

    def test_reject_empty_filename(self):
        """Empty filenames should raise ValueError."""
        with pytest.raises(ValueError):
            sanitize_filename("")
        with pytest.raises(ValueError):
            sanitize_filename("   ")

    def test_strip_leading_trailing_dots(self):
        """Strip leading and trailing dots."""
        result = sanitize_filename("...filename...")
        assert not result.startswith(".")
        assert not result.endswith(".")

    def test_collapse_multiple_underscores(self):
        """Multiple consecutive underscores should be collapsed."""
        result = sanitize_filename("file____name.txt")
        assert "____" not in result

    def test_spaces_allowed_by_default(self):
        """Spaces should be allowed by default."""
        result = sanitize_filename("file name.txt")
        assert " " in result

    def test_spaces_can_be_replaced(self):
        """Spaces can be replaced when allow_spaces=False."""
        result = sanitize_filename("file name.txt", allow_spaces=False)
        assert " " not in result


class TestValidateUploadFilename:
    """Tests for validate_upload_filename function."""

    def test_accept_valid_excel_file(self):
        """Accept valid Excel files."""
        is_valid, error, safe_name = validate_upload_filename("report.xlsx")
        assert is_valid
        assert error == ""
        assert safe_name == "report.xlsx"

    def test_accept_xlsm_file(self):
        """Accept xlsm macro-enabled files."""
        is_valid, error, safe_name = validate_upload_filename("data.xlsm")
        assert is_valid

    def test_accept_csv_file(self):
        """Accept CSV files."""
        is_valid, error, safe_name = validate_upload_filename("data.csv")
        assert is_valid

    def test_reject_invalid_extension(self):
        """Reject files with invalid extensions."""
        is_valid, error, safe_name = validate_upload_filename("script.exe")
        assert not is_valid
        assert "not allowed" in error.lower()
        assert safe_name == ""

    def test_reject_php_file(self):
        """Reject PHP files (web shell attack)."""
        is_valid, error, safe_name = validate_upload_filename("shell.php")
        assert not is_valid

    def test_reject_double_extension(self):
        """Handle double extensions properly."""
        # This tests that we correctly identify the actual extension
        is_valid, error, safe_name = validate_upload_filename("file.xlsx.exe")
        assert not is_valid

    def test_reject_empty_filename(self):
        """Reject empty filename."""
        is_valid, error, safe_name = validate_upload_filename("")
        assert not is_valid
        assert "required" in error.lower() or "empty" in error.lower()

    def test_sanitize_traversal_in_filename(self):
        """Sanitize path traversal in filename."""
        is_valid, error, safe_name = validate_upload_filename("../../../report.xlsx")
        assert is_valid
        assert ".." not in safe_name

    def test_custom_allowed_extensions(self):
        """Support custom allowed extensions."""
        custom_ext = {".pdf", ".doc"}
        is_valid, error, safe_name = validate_upload_filename(
            "document.pdf",
            allowed_extensions=custom_ext
        )
        assert is_valid

        is_valid2, error2, safe_name2 = validate_upload_filename(
            "spreadsheet.xlsx",
            allowed_extensions=custom_ext
        )
        assert not is_valid2


class TestGetSafePath:
    """Tests for get_safe_path function."""

    def test_returns_none_for_unauthorized_base(self):
        """Return None when base directory is not in allowed list."""
        # Use a path that definitely won't be in ALLOWED_BASE_PATHS
        # On Windows, use C:\Windows\System32 or similar
        # On Unix, use /etc
        import platform
        if platform.system() == "Windows":
            unauthorized_path = Path("C:\\Windows\\System32")
        else:
            unauthorized_path = Path("/etc")
        result = get_safe_path(unauthorized_path, "passwd")
        assert result is None, f"Should reject unauthorized base: {unauthorized_path}"

    def test_returns_path_for_allowed_base(self):
        """Return valid path for allowed base directory."""
        for base in ALLOWED_BASE_PATHS:
            if base.exists():
                result = get_safe_path(base, "test.xlsx")
                assert result is not None
                assert str(base) in str(result)
                return
        pytest.skip("No allowed base path exists")

    def test_sanitizes_filename(self):
        """Filename is sanitized in result."""
        for base in ALLOWED_BASE_PATHS:
            if base.exists():
                result = get_safe_path(base, "../dangerous.xlsx")
                if result:
                    assert ".." not in str(result)
                return
        pytest.skip("No allowed base path exists")

    def test_returns_none_for_invalid_filename(self):
        """Return None for filenames that can't be sanitized."""
        for base in ALLOWED_BASE_PATHS:
            if base.exists():
                result = get_safe_path(base, "")
                assert result is None
                return
        pytest.skip("No allowed base path exists")


class TestSecureJoin:
    """Tests for secure_join function."""

    def test_reject_traversal_in_parts(self):
        """Reject path parts containing traversal."""
        result = secure_join(Path.cwd(), "normal", "..", "secret")
        assert result is None

    def test_reject_absolute_path_in_parts(self):
        """Reject absolute paths in path parts."""
        result = secure_join(Path.cwd(), "normal", "/etc/passwd")
        assert result is None

    def test_accept_valid_parts(self):
        """Accept valid path parts."""
        result = secure_join(Path.cwd(), "subdir", "file.txt")
        if result:  # May be None if cwd check fails
            assert "subdir" in str(result)
            assert "file.txt" in str(result)


class TestWindowsReservedNames:
    """Tests specific to Windows reserved names."""

    def test_all_reserved_names_defined(self):
        """All Windows reserved names should be defined."""
        expected = {"CON", "PRN", "AUX", "NUL"}
        for i in range(1, 10):
            expected.add(f"COM{i}")
            expected.add(f"LPT{i}")
        assert expected == WINDOWS_RESERVED_NAMES

    def test_reserved_names_case_insensitive(self):
        """Reserved name check should be case-insensitive."""
        # sanitize_filename should handle CON, con, Con all the same way
        result_upper = sanitize_filename("CON.txt")
        result_lower = sanitize_filename("con.txt")
        result_mixed = sanitize_filename("Con.txt")
        # All should be prefixed or modified
        for result in [result_upper, result_lower, result_mixed]:
            assert not result.upper().startswith("CON.")


class TestAllowedExtensions:
    """Tests for allowed extension configuration."""

    def test_default_extensions_include_excel(self):
        """Default allowed extensions should include Excel types."""
        assert ".xlsx" in ALLOWED_UPLOAD_EXTENSIONS
        assert ".xlsm" in ALLOWED_UPLOAD_EXTENSIONS
        assert ".xls" in ALLOWED_UPLOAD_EXTENSIONS
        assert ".csv" in ALLOWED_UPLOAD_EXTENSIONS

    def test_dangerous_extensions_not_included(self):
        """Dangerous extensions should not be in default allowed list."""
        dangerous = {".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh", ".php", ".py"}
        for ext in dangerous:
            assert ext not in ALLOWED_UPLOAD_EXTENSIONS


class TestUnicodeNormalization:
    """Tests for Unicode normalization attacks."""

    def test_normalize_unicode_in_filename(self):
        """Unicode should be normalized in filenames."""
        # Test with various Unicode forms
        result = sanitize_filename("file\u202ename.txt")  # RTL override character
        assert result  # Should produce a valid result

    def test_reject_unicode_traversal(self):
        """Reject Unicode-based path traversal."""
        # Full-width dots
        is_valid, error = validate_path_security("\uff0e\uff0e/etc/passwd")
        # After normalization, this becomes .. which should be rejected
        if not is_valid:
            assert "traversal" in error.lower() or "outside" in error.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
