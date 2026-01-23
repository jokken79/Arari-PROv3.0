"""
Test-Driven Development (TDD) for 2FA API Endpoints
Tests for /api/2fa/* endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from database import get_connection


@pytest.fixture
def auth_token(test_client):
    """Get auth token using default admin credentials"""
    # Login with default admin user
    login_response = test_client.post(
        "/api/auth/login",
        json={
            "username": "admin",
            "password": "admin123"
        }
    )

    assert login_response.status_code == 200, f"Login failed: {login_response.json()}"
    token = login_response.json()["token"]
    return token


class TestTwoFASetupEndpoint:
    """Test POST /api/2fa/setup endpoint"""

    def test_setup_2fa_returns_secret_and_uri(self, test_client, auth_token):
        """POST /api/2fa/setup should return TOTP secret and QR URI"""
        response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Should contain secret and QR URI
        assert "totp_secret" in data
        assert "qr_uri" in data
        assert "backup_codes" in data
        assert isinstance(data["backup_codes"], list)
        assert len(data["backup_codes"]) == 10

    def test_setup_2fa_returns_valid_otpauth_uri(self, test_client, auth_token):
        """QR URI should be valid otpauth:// format"""
        response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # QR URI must start with otpauth://
        assert data["qr_uri"].startswith("otpauth://totp/")

    def test_setup_2fa_requires_authentication(self, test_client):
        """Setup endpoint should require authentication"""
        response = test_client.post("/api/2fa/setup")

        assert response.status_code == 401 or response.status_code == 403

    def test_setup_2fa_backup_codes_are_unique(self, test_client, auth_token):
        """Backup codes should all be unique"""
        response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        data = response.json()
        backup_codes = data["backup_codes"]

        # All codes should be unique
        assert len(backup_codes) == len(set(backup_codes))


class TestTwoFAVerifyEndpoint:
    """Test POST /api/2fa/verify endpoint"""

    def test_verify_2fa_with_valid_code(self, test_client, auth_token):
        """POST /api/2fa/verify should enable 2FA with valid TOTP code"""
        # Step 1: Setup 2FA
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        secret = setup_data["totp_secret"]
        backup_codes = setup_data["backup_codes"]

        # Step 2: Generate valid code
        import pyotp
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Step 3: Verify with code
        response = test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": valid_code,
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "2fa_enabled"

    def test_verify_2fa_rejects_invalid_code(self, test_client, auth_token):
        """POST /api/2fa/verify should reject invalid TOTP code"""
        # Setup 2FA first
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        backup_codes = setup_data["backup_codes"]

        # Try to verify with invalid code
        response = test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": "000000",  # Invalid code
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    def test_verify_2fa_requires_authentication(self, test_client):
        """Verify endpoint should require authentication"""
        response = test_client.post(
            "/api/2fa/verify",
            json={"totp_code": "123456", "backup_codes": []}
        )

        assert response.status_code == 401 or response.status_code == 403


class TestTwoFAVerifyCodeEndpoint:
    """Test POST /api/2fa/verify-code endpoint (for login)"""

    def test_verify_code_with_valid_totp(self, test_client, auth_token):
        """POST /api/2fa/verify-code should accept valid TOTP during login"""
        # First enable 2FA
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        secret = setup_data["totp_secret"]
        backup_codes = setup_data["backup_codes"]

        # Verify to enable
        verify_response = test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": _get_valid_code(secret),
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200

        # Now verify code endpoint
        response = test_client.post(
            "/api/2fa/verify-code",
            json={
                "totp_code": _get_valid_code(secret)
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "verified"

    def test_verify_code_rejects_invalid_totp(self, test_client, auth_token):
        """POST /api/2fa/verify-code should reject invalid TOTP"""
        response = test_client.post(
            "/api/2fa/verify-code",
            json={"totp_code": "000000"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 400

    def test_verify_code_accepts_backup_code(self, test_client, auth_token):
        """POST /api/2fa/verify-code should accept backup codes"""
        # Enable 2FA first
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        secret = setup_data["totp_secret"]
        backup_codes = setup_data["backup_codes"]

        # Verify to enable
        verify_response = test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": _get_valid_code(secret),
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200

        # Use first backup code
        response = test_client.post(
            "/api/2fa/verify-code",
            json={
                "backup_code": backup_codes[0]
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "verified"


class TestTwoFADisableEndpoint:
    """Test POST /api/2fa/disable endpoint"""

    def test_disable_2fa_with_password(self, test_client, auth_token):
        """POST /api/2fa/disable should work with correct password"""
        # Enable 2FA first
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        secret = setup_data["totp_secret"]
        backup_codes = setup_data["backup_codes"]

        # Verify to enable
        verify_response = test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": _get_valid_code(secret),
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.status_code == 200

        # Disable 2FA
        response = test_client.post(
            "/api/2fa/disable",
            json={
                "password": "password123"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "2fa_disabled"

    def test_disable_2fa_rejects_wrong_password(self, test_client, auth_token):
        """POST /api/2fa/disable should reject wrong password"""
        response = test_client.post(
            "/api/2fa/disable",
            json={
                "password": "wrong_password"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 401

    def test_disable_2fa_requires_authentication(self, test_client):
        """Disable endpoint should require authentication"""
        response = test_client.post(
            "/api/2fa/disable",
            json={"password": "password123"}
        )

        assert response.status_code == 401 or response.status_code == 403


class TestTwoFAStatusEndpoint:
    """Test GET /api/2fa/status endpoint"""

    def test_status_returns_2fa_disabled_by_default(self, test_client, auth_token):
        """GET /api/2fa/status should show 2FA disabled by default"""
        response = test_client.get(
            "/api/2fa/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["totp_enabled"] is False
        assert data["backup_codes_remaining"] == 0

    def test_status_shows_2fa_enabled_after_setup(self, test_client, auth_token):
        """GET /api/2fa/status should show enabled after setup/verify"""
        # Setup and verify
        setup_response = test_client.post(
            "/api/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        setup_data = setup_response.json()
        secret = setup_data["totp_secret"]
        backup_codes = setup_data["backup_codes"]

        test_client.post(
            "/api/2fa/verify",
            json={
                "totp_code": _get_valid_code(secret),
                "backup_codes": backup_codes
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        # Check status
        response = test_client.get(
            "/api/2fa/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["totp_enabled"] is True
        assert data["backup_codes_remaining"] == 10

    def test_status_requires_authentication(self, test_client):
        """Status endpoint should require authentication"""
        response = test_client.get("/api/2fa/status")

        assert response.status_code == 401 or response.status_code == 403


# Helper function
def _get_valid_code(secret: str) -> str:
    """Generate current valid TOTP code"""
    import pyotp
    totp = pyotp.TOTP(secret)
    return totp.now()
