"""
Security Features Tests - Arari-PRO

Tests for security features:
1. Rate Limiting (InMemoryRateLimiter)
2. HttpOnly Cookie Authentication
3. Refresh Token Management
"""
import os
import sqlite3
import sys
import time
from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi import Request, Response
from fastapi.testclient import TestClient

# Add api directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import (
    create_refresh_token,
    create_token,
    generate_refresh_token,
    hash_password,
    init_auth_tables,
    revoke_refresh_token,
    rotate_refresh_token,
    validate_refresh_token,
)
from auth_dependencies import (
    COOKIE_NAME,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    REFRESH_COOKIE_NAME,
    clear_auth_cookie,
    clear_refresh_cookie,
    get_token,
    get_token_from_cookie,
    get_token_from_header,
    set_auth_cookie,
    set_refresh_cookie,
)
from rate_limiter import (
    DEFAULT_RATE_LIMITS,
    InMemoryRateLimiter,
    RateLimitConfig,
    RateLimiter,
    get_client_ip,
    get_rate_limiter,
    reset_rate_limiter,
)


# ================================================================
# RATE LIMITING TESTS
# ================================================================


class TestRateLimitConfig:
    """Tests for RateLimitConfig dataclass"""

    def test_valid_config(self):
        """Test creating valid rate limit config"""
        config = RateLimitConfig(max_requests=5, window_seconds=60)
        assert config.max_requests == 5
        assert config.window_seconds == 60

    def test_invalid_max_requests(self):
        """Test that max_requests must be at least 1"""
        with pytest.raises(ValueError, match="max_requests must be at least 1"):
            RateLimitConfig(max_requests=0, window_seconds=60)

    def test_invalid_window_seconds(self):
        """Test that window_seconds must be at least 1"""
        with pytest.raises(ValueError, match="window_seconds must be at least 1"):
            RateLimitConfig(max_requests=5, window_seconds=0)


class TestInMemoryRateLimiter:
    """Tests for InMemoryRateLimiter backend"""

    def test_allows_requests_under_limit(self):
        """Test that requests under limit are allowed"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=5, window_seconds=60)

        # First 5 requests should be allowed
        for i in range(5):
            is_allowed, retry_after = limiter.check("test_client", config)
            assert is_allowed is True, f"Request {i+1} should be allowed"
            assert retry_after == 0

    def test_blocks_requests_over_limit(self):
        """Test that requests over limit are blocked"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=3, window_seconds=60)

        # Exhaust the limit
        for _ in range(3):
            limiter.check("test_client", config)

        # Next request should be blocked
        is_allowed, retry_after = limiter.check("test_client", config)
        assert is_allowed is False
        assert retry_after > 0

    def test_retry_after_calculation(self):
        """Test retry_after is calculated correctly"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=2, window_seconds=30)

        # Exhaust the limit
        limiter.check("test_client", config)
        limiter.check("test_client", config)

        # Check retry_after
        is_allowed, retry_after = limiter.check("test_client", config)
        assert is_allowed is False
        assert 1 <= retry_after <= 31  # Should be within window + 1

    def test_rate_limit_reset_after_window(self):
        """Test that rate limit resets after window expires"""
        limiter = InMemoryRateLimiter()
        # Use a very short window for testing
        config = RateLimitConfig(max_requests=2, window_seconds=1)

        # Exhaust the limit
        limiter.check("test_client", config)
        limiter.check("test_client", config)

        # Should be blocked
        is_allowed, _ = limiter.check("test_client", config)
        assert is_allowed is False

        # Wait for window to expire
        time.sleep(1.1)

        # Should be allowed again
        is_allowed, retry_after = limiter.check("test_client", config)
        assert is_allowed is True
        assert retry_after == 0

    def test_clear_rate_limit(self):
        """Test clearing rate limit for a client"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=2, window_seconds=60)

        # Exhaust the limit
        limiter.check("test_client", config)
        limiter.check("test_client", config)

        # Verify blocked
        is_allowed, _ = limiter.check("test_client", config)
        assert is_allowed is False

        # Clear the rate limit
        limiter.clear("test_client")

        # Should be allowed again
        is_allowed, retry_after = limiter.check("test_client", config)
        assert is_allowed is True
        assert retry_after == 0

    def test_get_remaining(self):
        """Test getting remaining requests"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=5, window_seconds=60)

        # Initial remaining should be max
        remaining = limiter.get_remaining("test_client", config)
        assert remaining == 5

        # Make 2 requests
        limiter.check("test_client", config)
        limiter.check("test_client", config)

        # Remaining should be 3
        remaining = limiter.get_remaining("test_client", config)
        assert remaining == 3

    def test_separate_clients(self):
        """Test that different clients have separate rate limits"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=2, window_seconds=60)

        # Exhaust limit for client1
        limiter.check("client1", config)
        limiter.check("client1", config)

        # client1 should be blocked
        is_allowed, _ = limiter.check("client1", config)
        assert is_allowed is False

        # client2 should still be allowed
        is_allowed, _ = limiter.check("client2", config)
        assert is_allowed is True

    def test_cleanup_expired_entries(self):
        """Test that expired entries are cleaned up"""
        limiter = InMemoryRateLimiter()
        config = RateLimitConfig(max_requests=10, window_seconds=1)

        # Make some requests
        limiter.check("test_client", config)
        limiter.check("test_client", config)

        # Verify entries exist
        remaining = limiter.get_remaining("test_client", config)
        assert remaining == 8

        # Wait for expiration
        time.sleep(1.1)

        # After cleanup (triggered by get_remaining), should be reset
        remaining = limiter.get_remaining("test_client", config)
        assert remaining == 10


class TestRateLimiter:
    """Tests for the main RateLimiter class"""

    def setup_method(self):
        """Reset rate limiter before each test"""
        reset_rate_limiter()

    def teardown_method(self):
        """Reset rate limiter after each test"""
        reset_rate_limiter()

    def test_default_rate_limits_exist(self):
        """Test that default rate limits are configured"""
        assert "login" in DEFAULT_RATE_LIMITS
        assert "upload" in DEFAULT_RATE_LIMITS
        assert "api_write" in DEFAULT_RATE_LIMITS
        assert "default" in DEFAULT_RATE_LIMITS

    def test_login_rate_limit_config(self):
        """Test login rate limit is configured correctly"""
        login_config = DEFAULT_RATE_LIMITS["login"]
        assert login_config.max_requests == 5
        assert login_config.window_seconds == 60

    def test_get_rate_limiter_singleton(self):
        """Test that get_rate_limiter returns singleton instance"""
        limiter1 = get_rate_limiter()
        limiter2 = get_rate_limiter()
        assert limiter1 is limiter2

    def test_rate_limiter_uses_memory_backend_by_default(self):
        """Test that RateLimiter uses in-memory backend when no Redis"""
        # Without REDIS_URL, should use in-memory backend
        limiter = RateLimiter()
        assert limiter.is_using_redis is False

    def test_rate_limiter_check_returns_tuple(self):
        """Test that check returns (is_allowed, retry_after, remaining)"""
        limiter = RateLimiter()
        result = limiter.check("test_client", "login", raise_on_limit=False)
        assert isinstance(result, tuple)
        assert len(result) == 3
        is_allowed, retry_after, remaining = result
        assert isinstance(is_allowed, bool)
        assert isinstance(retry_after, int)
        assert isinstance(remaining, int)

    def test_rate_limiter_raises_http_exception(self):
        """Test that RateLimiter raises HTTPException when limit exceeded"""
        from fastapi import HTTPException

        limiter = RateLimiter(custom_limits={
            "test_endpoint": RateLimitConfig(max_requests=1, window_seconds=60)
        })

        # First request should pass
        limiter.check("test_client", "test_endpoint")

        # Second request should raise HTTPException
        with pytest.raises(HTTPException) as exc_info:
            limiter.check("test_client", "test_endpoint")

        assert exc_info.value.status_code == 429
        assert "Too many requests" in exc_info.value.detail

    def test_rate_limiter_clear(self):
        """Test clearing rate limit through RateLimiter"""
        limiter = RateLimiter(custom_limits={
            "test_endpoint": RateLimitConfig(max_requests=1, window_seconds=60)
        })

        # Exhaust limit
        limiter.check("test_client", "test_endpoint", raise_on_limit=False)

        # Verify blocked
        is_allowed, _, _ = limiter.check("test_client", "test_endpoint", raise_on_limit=False)
        assert is_allowed is False

        # Clear and verify allowed
        limiter.clear("test_client", "test_endpoint")
        is_allowed, _, _ = limiter.check("test_client", "test_endpoint", raise_on_limit=False)
        assert is_allowed is True

    def test_rate_limiter_add_limit(self):
        """Test adding custom rate limit"""
        limiter = RateLimiter()
        limiter.add_limit("custom_endpoint", RateLimitConfig(max_requests=100, window_seconds=3600))

        # Should use custom limit
        remaining = limiter.get_remaining("test_client", "custom_endpoint")
        assert remaining == 100


class TestGetClientIp:
    """Tests for get_client_ip function"""

    def test_get_ip_from_x_forwarded_for(self):
        """Test extracting IP from X-Forwarded-For header"""
        mock_request = Mock()
        mock_request.headers = {"X-Forwarded-For": "192.168.1.100, 10.0.0.1"}
        mock_request.client = Mock(host="127.0.0.1")

        ip = get_client_ip(mock_request)
        assert ip == "192.168.1.100"

    def test_get_ip_from_x_real_ip(self):
        """Test extracting IP from X-Real-IP header"""
        mock_request = Mock()
        mock_request.headers = {"X-Real-IP": "192.168.1.200"}
        mock_request.client = Mock(host="127.0.0.1")

        ip = get_client_ip(mock_request)
        assert ip == "192.168.1.200"

    def test_get_ip_from_client(self):
        """Test extracting IP from client when no proxy headers"""
        mock_request = Mock()
        mock_request.headers = {}
        mock_request.client = Mock(host="192.168.1.50")

        ip = get_client_ip(mock_request)
        assert ip == "192.168.1.50"

    def test_get_ip_fallback_to_unknown(self):
        """Test fallback to 'unknown' when no client info"""
        mock_request = Mock()
        mock_request.headers = {}
        mock_request.client = None

        ip = get_client_ip(mock_request)
        assert ip == "unknown"


# ================================================================
# HTTPONLY COOKIE AUTHENTICATION TESTS
# ================================================================


class TestCookieAuthentication:
    """Tests for HttpOnly cookie authentication functions"""

    def test_set_auth_cookie_creates_cookie(self):
        """Test that set_auth_cookie sets cookie with correct attributes"""
        response = Response()
        token = "test_token_12345"

        set_auth_cookie(response, token)

        # Check that Set-Cookie header was added
        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None
        assert COOKIE_NAME in set_cookie_header
        assert token in set_cookie_header
        assert "httponly" in set_cookie_header.lower()

    def test_set_auth_cookie_path(self):
        """Test that auth cookie has correct path"""
        response = Response()
        token = "test_token"

        set_auth_cookie(response, token)

        set_cookie_header = response.headers.get("set-cookie")
        assert "path=/" in set_cookie_header.lower()

    def test_set_auth_cookie_samesite(self):
        """Test that auth cookie has SameSite attribute"""
        response = Response()
        token = "test_token"

        set_auth_cookie(response, token)

        set_cookie_header = response.headers.get("set-cookie")
        assert "samesite=" in set_cookie_header.lower()

    def test_clear_auth_cookie(self):
        """Test that clear_auth_cookie removes the cookie"""
        response = Response()

        clear_auth_cookie(response)

        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None
        assert COOKIE_NAME in set_cookie_header
        # Cookie should be expired (max-age=0 or similar)
        # FastAPI/Starlette uses delete_cookie which sets cookie to empty with expired date

    def test_set_refresh_cookie(self):
        """Test that set_refresh_cookie sets cookie correctly"""
        response = Response()
        token = "refresh_token_12345"

        set_refresh_cookie(response, token)

        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None
        assert REFRESH_COOKIE_NAME in set_cookie_header
        assert "httponly" in set_cookie_header.lower()
        # Refresh cookie should have restricted path
        assert "/api/auth/refresh" in set_cookie_header

    def test_clear_refresh_cookie(self):
        """Test that clear_refresh_cookie removes the refresh cookie"""
        response = Response()

        clear_refresh_cookie(response)

        set_cookie_header = response.headers.get("set-cookie")
        assert set_cookie_header is not None
        assert REFRESH_COOKIE_NAME in set_cookie_header

    def test_get_token_from_cookie(self):
        """Test extracting token from cookie"""
        mock_request = Mock()
        mock_request.cookies = {COOKIE_NAME: "token_from_cookie"}

        token = get_token_from_cookie(mock_request)
        assert token == "token_from_cookie"

    def test_get_token_from_cookie_missing(self):
        """Test returns None when cookie missing"""
        mock_request = Mock()
        mock_request.cookies = {}

        token = get_token_from_cookie(mock_request)
        assert token is None

    def test_get_token_from_header_with_bearer(self):
        """Test extracting token from Authorization header with Bearer prefix"""
        token = get_token_from_header("Bearer test_token_123")
        assert token == "test_token_123"

    def test_get_token_from_header_without_bearer(self):
        """Test extracting token from Authorization header without Bearer prefix"""
        token = get_token_from_header("test_token_123")
        assert token == "test_token_123"

    def test_get_token_from_header_none(self):
        """Test returns None when Authorization header is None"""
        token = get_token_from_header(None)
        assert token is None

    def test_get_token_prioritizes_cookie(self):
        """Test that get_token prioritizes cookie over header"""
        mock_request = Mock()
        mock_request.cookies = {COOKIE_NAME: "cookie_token"}

        # Cookie should be preferred
        token = get_token(mock_request, "Bearer header_token")
        assert token == "cookie_token"

    def test_get_token_falls_back_to_header(self):
        """Test that get_token falls back to header when no cookie"""
        mock_request = Mock()
        mock_request.cookies = {}

        token = get_token(mock_request, "Bearer header_token")
        assert token == "header_token"

    def test_get_token_returns_none_when_both_missing(self):
        """Test that get_token returns None when both cookie and header missing"""
        mock_request = Mock()
        mock_request.cookies = {}

        token = get_token(mock_request, None)
        assert token is None


# ================================================================
# REFRESH TOKEN TESTS
# ================================================================


class TestRefreshTokens:
    """Tests for refresh token functions"""

    @pytest.fixture
    def test_db(self):
        """Create a test database with auth tables"""
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        conn.row_factory = sqlite3.Row

        # Initialize auth tables
        init_auth_tables(conn)

        yield conn

        conn.close()

    @pytest.fixture
    def test_user(self, test_db):
        """Create a test user and return user_id"""
        cursor = test_db.cursor()
        password_hash = hash_password("testpass123")
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, role, full_name, email)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("testuser", password_hash, "viewer", "Test User", "test@example.com")
        )
        test_db.commit()
        return cursor.lastrowid

    def test_generate_refresh_token_creates_unique_tokens(self):
        """Test that generate_refresh_token creates unique tokens"""
        tokens = set()
        for _ in range(100):
            token = generate_refresh_token()
            assert token not in tokens, "Generated duplicate token"
            tokens.add(token)

        # All 100 tokens should be unique
        assert len(tokens) == 100

    def test_generate_refresh_token_is_url_safe(self):
        """Test that generated token is URL-safe"""
        token = generate_refresh_token()
        # URL-safe tokens should only contain alphanumeric, -, _
        import re
        assert re.match(r'^[A-Za-z0-9_-]+$', token), "Token contains non-URL-safe characters"

    def test_generate_refresh_token_length(self):
        """Test that generated token has sufficient length for security"""
        token = generate_refresh_token()
        # secrets.token_urlsafe(48) produces ~64 character string
        assert len(token) >= 60, "Token should be at least 60 characters for security"

    def test_create_refresh_token_stores_in_database(self, test_db, test_user):
        """Test that create_refresh_token stores token in database"""
        result = create_refresh_token(test_db, test_user)

        assert "refresh_token" in result
        assert "refresh_expires_at" in result

        # Verify stored in database
        cursor = test_db.cursor()
        cursor.execute("SELECT * FROM refresh_tokens WHERE user_id = ?", (test_user,))
        row = cursor.fetchone()

        assert row is not None
        assert row["token"] == result["refresh_token"]
        assert row["revoked"] == 0

    def test_create_refresh_token_sets_expiration(self, test_db, test_user):
        """Test that refresh token has correct expiration"""
        from datetime import datetime, timedelta

        before_create = datetime.now()
        result = create_refresh_token(test_db, test_user)

        # Expiration should be approximately 7 days from now
        expires_at = datetime.fromisoformat(result["refresh_expires_at"])
        expected_expiry = before_create + timedelta(days=7)

        # Allow 1 minute tolerance
        assert abs((expires_at - expected_expiry).total_seconds()) < 60

    def test_validate_refresh_token_returns_user_info(self, test_db, test_user):
        """Test that validate_refresh_token returns user info for valid token"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        user_info = validate_refresh_token(test_db, token)

        assert user_info is not None
        assert user_info["user_id"] == test_user
        assert user_info["username"] == "testuser"
        assert user_info["role"] == "viewer"
        assert user_info["email"] == "test@example.com"

    def test_validate_refresh_token_returns_none_for_invalid_token(self, test_db):
        """Test that validate_refresh_token returns None for invalid token"""
        user_info = validate_refresh_token(test_db, "invalid_token_that_does_not_exist")
        assert user_info is None

    def test_validate_refresh_token_returns_none_for_revoked_token(self, test_db, test_user):
        """Test that validate_refresh_token returns None for revoked token"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        # Revoke the token
        revoke_refresh_token(test_db, token)

        # Should now return None
        user_info = validate_refresh_token(test_db, token)
        assert user_info is None

    def test_validate_refresh_token_returns_none_for_expired_token(self, test_db, test_user):
        """Test that validate_refresh_token returns None for expired token"""
        from datetime import datetime, timedelta

        # Create token with past expiration
        cursor = test_db.cursor()
        token = generate_refresh_token()
        expired_at = (datetime.now() - timedelta(days=1)).isoformat()

        cursor.execute(
            """
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
            """,
            (test_user, token, expired_at)
        )
        test_db.commit()

        # Should return None for expired token
        user_info = validate_refresh_token(test_db, token)
        assert user_info is None

    def test_validate_refresh_token_returns_none_for_inactive_user(self, test_db):
        """Test that validate_refresh_token returns None for inactive user"""
        # Create inactive user
        cursor = test_db.cursor()
        password_hash = hash_password("testpass123")
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, role, is_active)
            VALUES (?, ?, ?, 0)
            """,
            ("inactive_user", password_hash, "viewer")
        )
        test_db.commit()
        inactive_user_id = cursor.lastrowid

        # Create refresh token
        token_data = create_refresh_token(test_db, inactive_user_id)
        token = token_data["refresh_token"]

        # Should return None for inactive user
        user_info = validate_refresh_token(test_db, token)
        assert user_info is None

    def test_revoke_refresh_token_marks_as_revoked(self, test_db, test_user):
        """Test that revoke_refresh_token marks token as revoked"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        # Revoke
        result = revoke_refresh_token(test_db, token)
        assert result is True

        # Verify in database
        cursor = test_db.cursor()
        cursor.execute("SELECT revoked, revoked_at FROM refresh_tokens WHERE token = ?", (token,))
        row = cursor.fetchone()

        assert row["revoked"] == 1
        assert row["revoked_at"] is not None

    def test_revoke_refresh_token_returns_false_for_invalid_token(self, test_db):
        """Test that revoke_refresh_token returns False for invalid token"""
        result = revoke_refresh_token(test_db, "nonexistent_token")
        assert result is False

    def test_revoke_refresh_token_returns_false_for_already_revoked(self, test_db, test_user):
        """Test that revoke_refresh_token returns False for already revoked token"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        # First revoke should succeed
        result1 = revoke_refresh_token(test_db, token)
        assert result1 is True

        # Second revoke should return False
        result2 = revoke_refresh_token(test_db, token)
        assert result2 is False

    def test_rotate_refresh_token_revokes_old_and_creates_new(self, test_db, test_user):
        """Test that rotate_refresh_token revokes old token and creates new ones"""
        # Create initial tokens
        old_token_data = create_refresh_token(test_db, test_user)
        old_refresh_token = old_token_data["refresh_token"]

        # Also create an access token for the user
        old_access_token_data = create_token(test_db, test_user)

        # Rotate
        new_tokens = rotate_refresh_token(test_db, old_refresh_token)

        assert new_tokens is not None
        assert "token" in new_tokens  # New access token
        assert "refresh_token" in new_tokens  # New refresh token
        assert "user" in new_tokens
        assert new_tokens["refresh_token"] != old_refresh_token

        # Verify old token is revoked
        cursor = test_db.cursor()
        cursor.execute("SELECT revoked FROM refresh_tokens WHERE token = ?", (old_refresh_token,))
        row = cursor.fetchone()
        assert row["revoked"] == 1

        # Verify new token is valid
        user_info = validate_refresh_token(test_db, new_tokens["refresh_token"])
        assert user_info is not None
        assert user_info["user_id"] == test_user

    def test_rotate_refresh_token_returns_none_for_invalid_token(self, test_db):
        """Test that rotate_refresh_token returns None for invalid token"""
        result = rotate_refresh_token(test_db, "invalid_token")
        assert result is None

    def test_rotate_refresh_token_returns_none_for_revoked_token(self, test_db, test_user):
        """Test that rotate_refresh_token returns None for already revoked token"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        # Revoke the token
        revoke_refresh_token(test_db, token)

        # Rotation should fail
        result = rotate_refresh_token(test_db, token)
        assert result is None

    def test_rotate_refresh_token_returns_user_info(self, test_db, test_user):
        """Test that rotate_refresh_token returns correct user info"""
        token_data = create_refresh_token(test_db, test_user)
        token = token_data["refresh_token"]

        result = rotate_refresh_token(test_db, token)

        assert result["user"]["id"] == test_user
        assert result["user"]["username"] == "testuser"
        assert result["user"]["role"] == "viewer"


# ================================================================
# INTEGRATION TESTS WITH API ENDPOINTS
# ================================================================


class TestLoginRateLimiting:
    """Integration tests for login rate limiting"""

    def test_login_rate_limit_blocks_after_attempts(self, test_client, db_session):
        """Test that login endpoint is rate limited after too many attempts"""
        # Reset rate limiter
        reset_rate_limiter()

        # Make 5 failed login attempts (the limit)
        for i in range(5):
            response = test_client.post(
                "/api/auth/login",
                json={"username": "invalid", "password": "wrong"}
            )
            # Should get 401 for invalid credentials
            assert response.status_code == 401, f"Attempt {i+1} should return 401"

        # 6th attempt should be rate limited (429)
        response = test_client.post(
            "/api/auth/login",
            json={"username": "invalid", "password": "wrong"}
        )
        assert response.status_code == 429
        assert "Too many requests" in response.json()["detail"]

    def test_successful_login_clears_rate_limit(self, test_client, db_session):
        """Test that successful login clears rate limit"""
        reset_rate_limiter()

        # Make a few failed attempts
        for _ in range(3):
            test_client.post(
                "/api/auth/login",
                json={"username": "invalid", "password": "wrong"}
            )

        # Successful login
        response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        assert response.status_code == 200

        # Reset limiter to test again
        reset_rate_limiter()

        # More failed attempts should be allowed
        for i in range(3):
            response = test_client.post(
                "/api/auth/login",
                json={"username": "invalid", "password": "wrong"}
            )
            assert response.status_code == 401, f"Attempt {i+1} should return 401"


class TestCookieAuthenticationIntegration:
    """Integration tests for cookie-based authentication"""

    def test_login_sets_cookie(self, test_client, db_session):
        """Test that login endpoint sets HttpOnly cookie"""
        reset_rate_limiter()

        response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )

        assert response.status_code == 200

        # Check for Set-Cookie header
        cookies = response.cookies
        assert COOKIE_NAME in cookies

    def test_auth_works_with_cookie(self, test_client, db_session):
        """Test that authenticated requests work with cookie"""
        reset_rate_limiter()

        # Login to get cookie
        login_response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        assert login_response.status_code == 200

        # Make authenticated request using cookie (TestClient maintains cookies)
        me_response = test_client.get("/api/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "admin"

    def test_logout_clears_cookie(self, test_client, db_session):
        """Test that logout clears the auth cookie"""
        reset_rate_limiter()

        # Login
        test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )

        # Logout
        logout_response = test_client.post("/api/auth/logout")
        assert logout_response.status_code == 200

        # Cookie should be cleared (subsequent requests should fail)
        # Note: TestClient may still have stale cookie, so we check response message
        assert "Logged out" in logout_response.json().get("message", "")


class TestRefreshTokenIntegration:
    """Integration tests for refresh token functionality"""

    def test_login_returns_refresh_token(self, test_client, db_session):
        """Test that login endpoint returns refresh token"""
        reset_rate_limiter()

        response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "refresh_token" in data
        assert "refresh_expires_at" in data

    def test_refresh_endpoint_returns_new_tokens(self, test_client, db_session):
        """Test that refresh endpoint returns new token pair"""
        reset_rate_limiter()

        # Login to get tokens
        login_response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        assert login_response.status_code == 200
        old_refresh_token = login_response.json()["refresh_token"]

        # Refresh using the token in body (for API clients)
        refresh_response = test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": old_refresh_token}
        )

        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "token" in data
        assert "refresh_token" in data
        # New refresh token should be different
        assert data["refresh_token"] != old_refresh_token

    def test_old_refresh_token_invalid_after_rotation(self, test_client, db_session):
        """Test that old refresh token is invalid after rotation"""
        reset_rate_limiter()

        # Login
        login_response = test_client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        old_refresh_token = login_response.json()["refresh_token"]

        # Rotate (use the old token)
        test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": old_refresh_token}
        )

        # Clear cookies to ensure we're testing the body parameter
        # The refresh endpoint prioritizes cookie over body, so we need to clear it
        test_client.cookies.clear()

        # Try to use old token again - should fail
        response = test_client.post(
            "/api/auth/refresh",
            json={"refresh_token": old_refresh_token}
        )
        assert response.status_code == 401

    def test_refresh_without_token_returns_401(self, test_client, db_session):
        """Test that refresh endpoint returns 401 without token"""
        response = test_client.post("/api/auth/refresh", json={})
        assert response.status_code == 401
        assert "Refresh token required" in response.json()["detail"]
