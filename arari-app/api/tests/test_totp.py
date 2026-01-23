"""
Test-Driven Development (TDD) for 2FA TOTP implementation
RED phase: Write failing tests FIRST
"""

import pytest
import re
from datetime import datetime, timedelta


class TestTOTPGeneration:
    """Test TOTP secret generation and QR code"""

    def test_generate_totp_secret_returns_base32_string(self):
        """Should generate a valid base32 TOTP secret"""
        from totp_service import generate_totp_secret

        secret = generate_totp_secret()

        # BASE32 characters only (A-Z, 2-7, =)
        assert re.match(r'^[A-Z2-7=]+$', secret)
        assert len(secret) > 10  # Should be reasonably long

    def test_get_totp_uri_returns_valid_otpauth_uri(self):
        """Should return valid otpauth:// URI for QR code"""
        from totp_service import generate_totp_secret, get_totp_uri

        secret = generate_totp_secret()
        username = "testuser"
        issuer = "ArariPRO"

        uri = get_totp_uri(secret, username, issuer)

        # Must be valid otpauth URI
        assert uri.startswith("otpauth://totp/")
        assert username in uri
        assert issuer in uri
        assert secret in uri

    def test_get_totp_uri_is_deterministic(self):
        """Same inputs should produce same URI"""
        from totp_service import generate_totp_secret, get_totp_uri

        secret = "JBSWY3DPEHPK3PXP"  # Fixed secret for test
        username = "testuser"
        issuer = "ArariPRO"

        uri1 = get_totp_uri(secret, username, issuer)
        uri2 = get_totp_uri(secret, username, issuer)

        assert uri1 == uri2


class TestTOTPVerification:
    """Test TOTP code verification"""

    def test_verify_totp_code_accepts_valid_code(self):
        """Should accept a valid TOTP code"""
        from totp_service import generate_totp_secret, verify_totp_code
        import pyotp

        # Use fixed secret for deterministic testing
        secret = "JBSWY3DPEHPK3PXP"

        # Generate code using pyotp library directly
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Should verify successfully
        result = verify_totp_code(secret, valid_code)
        assert result is True

    def test_verify_totp_code_rejects_invalid_code(self):
        """Should reject an invalid TOTP code"""
        from totp_service import verify_totp_code

        secret = "JBSWY3DPEHPK3PXP"
        invalid_code = "000000"

        result = verify_totp_code(secret, invalid_code)
        assert result is False

    def test_verify_totp_code_rejects_empty_code(self):
        """Should reject empty codes"""
        from totp_service import verify_totp_code

        secret = "JBSWY3DPEHPK3PXP"

        result = verify_totp_code(secret, "")
        assert result is False

    def test_verify_totp_code_rejects_non_numeric_code(self):
        """Should reject non-numeric codes"""
        from totp_service import verify_totp_code

        secret = "JBSWY3DPEHPK3PXP"

        result = verify_totp_code(secret, "ABCDEF")
        assert result is False

    def test_verify_totp_code_accepts_6_digit_code(self):
        """Should accept 6-digit codes"""
        from totp_service import verify_totp_code
        import pyotp

        secret = "JBSWY3DPEHPK3PXP"
        totp = pyotp.TOTP(secret)

        # Get 6-digit code and ensure it's exactly 6 digits
        code = totp.now()
        assert len(code) == 6

        result = verify_totp_code(secret, code)
        assert result is True


class TestBackupCodes:
    """Test backup code generation and verification"""

    def test_generate_backup_codes_returns_list(self):
        """Should generate a list of backup codes"""
        from totp_service import generate_backup_codes

        codes = generate_backup_codes()

        assert isinstance(codes, list)
        assert len(codes) > 0

    def test_backup_codes_are_unique(self):
        """All backup codes should be unique"""
        from totp_service import generate_backup_codes

        codes = generate_backup_codes()

        assert len(codes) == len(set(codes))

    def test_backup_codes_are_8_characters(self):
        """Each backup code should be 8 characters"""
        from totp_service import generate_backup_codes

        codes = generate_backup_codes()

        for code in codes:
            assert len(code) == 8

    def test_backup_codes_contain_only_alphanumeric(self):
        """Backup codes should only contain alphanumeric characters"""
        from totp_service import generate_backup_codes

        codes = generate_backup_codes()

        for code in codes:
            assert re.match(r'^[A-Z0-9]{8}$', code)

    def test_verify_backup_code_accepts_valid_code(self):
        """Should verify a valid backup code"""
        from totp_service import generate_backup_codes, verify_backup_code

        codes = generate_backup_codes()
        first_code = codes[0]
        used_codes = []

        result = verify_backup_code(first_code, codes, used_codes)

        assert result is True
        assert first_code in used_codes

    def test_verify_backup_code_rejects_already_used(self):
        """Should reject already-used backup codes"""
        from totp_service import generate_backup_codes, verify_backup_code

        codes = generate_backup_codes()
        first_code = codes[0]
        used_codes = [first_code]  # Already used

        result = verify_backup_code(first_code, codes, used_codes)

        assert result is False

    def test_verify_backup_code_rejects_invalid_code(self):
        """Should reject codes not in the list"""
        from totp_service import generate_backup_codes, verify_backup_code

        codes = generate_backup_codes()
        invalid_code = "NOTVALID"
        used_codes = []

        result = verify_backup_code(invalid_code, codes, used_codes)

        assert result is False

    def test_generate_backup_codes_generates_10_codes_by_default(self):
        """Should generate 10 backup codes by default"""
        from totp_service import generate_backup_codes

        codes = generate_backup_codes()

        assert len(codes) == 10


class TestTOTPIntegration:
    """Integration tests for TOTP setup flow"""

    def test_full_2fa_setup_workflow(self):
        """Should support complete 2FA setup workflow"""
        from totp_service import generate_totp_secret, get_totp_uri, generate_backup_codes, verify_totp_code
        import pyotp

        # Step 1: Generate secret
        secret = generate_totp_secret()
        assert secret

        # Step 2: Get QR URI
        uri = get_totp_uri(secret, "testuser", "ArariPRO")
        assert uri.startswith("otpauth://")

        # Step 3: Generate backup codes
        backup_codes = generate_backup_codes()
        assert len(backup_codes) == 10

        # Step 4: Verify TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()
        assert verify_totp_code(secret, code) is True

    def test_2fa_can_be_disabled_by_changing_secret(self):
        """Should support disabling 2FA"""
        from totp_service import generate_totp_secret

        secret1 = generate_totp_secret()
        secret2 = generate_totp_secret()

        # Different secrets should be generated
        assert secret1 != secret2
