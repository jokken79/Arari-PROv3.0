"""
Test-Driven Development (TDD) for 2FA Database Models
Tests for storing and retrieving TOTP secrets and backup codes
"""

import json
import pytest
import uuid
from database import get_connection


@pytest.fixture
def conn():
    """Get a database connection for testing with clean state"""
    connection = get_connection()

    # Clear test users from previous runs
    cursor = connection.cursor()
    cursor.execute("DELETE FROM users WHERE username LIKE 'testuser_%'")
    connection.commit()

    yield connection
    connection.close()


@pytest.fixture
def unique_username():
    """Generate unique username for each test"""
    return f"testuser_{uuid.uuid4().hex[:8]}"


class TestTwoFADatabaseSchema:
    """Test 2FA table creation and schema"""

    def test_users_table_has_totp_secret_field(self, conn):
        """Users table should have totp_secret field"""
        from auth import init_auth_tables

        # Initialize tables (includes 2FA fields)
        init_auth_tables(conn)

        cursor = conn.cursor()
        # Get table structure
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()

        column_names = [col[1] for col in columns]
        assert "totp_secret" in column_names

    def test_users_table_has_totp_enabled_field(self, conn):
        """Users table should have totp_enabled boolean field"""
        from auth import init_auth_tables

        init_auth_tables(conn)

        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()

        column_names = [col[1] for col in columns]
        assert "totp_enabled" in column_names

    def test_users_table_has_backup_codes_field(self, conn):
        """Users table should have backup_codes JSON field"""
        from auth import init_auth_tables

        init_auth_tables(conn)

        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()

        column_names = [col[1] for col in columns]
        assert "backup_codes" in column_names

    def test_totp_secret_defaults_to_null(self, conn, unique_username):
        """New users should have NULL totp_secret"""
        from auth import init_auth_tables, AuthService

        init_auth_tables(conn)

        # Create a test user
        service = AuthService(conn)
        user_data = service.create_user(unique_username, "password123")

        # Verify user was created
        assert "id" in user_data
        assert "error" not in user_data

        # Verify totp_secret is NULL
        cursor = conn.cursor()
        cursor.execute("SELECT totp_secret FROM users WHERE id = ?", (user_data["id"],))
        result = cursor.fetchone()

        assert result is not None
        # Handle both tuple and sqlite3.Row
        totp_secret = result[0]
        assert totp_secret is None

    def test_totp_enabled_defaults_to_false(self, conn, unique_username):
        """New users should have totp_enabled = 0 (false)"""
        from auth import init_auth_tables, AuthService

        init_auth_tables(conn)

        service = AuthService(conn)
        user_data = service.create_user(unique_username, "password123")

        assert "id" in user_data
        assert "error" not in user_data

        cursor = conn.cursor()
        cursor.execute("SELECT totp_enabled FROM users WHERE id = ?", (user_data["id"],))
        result = cursor.fetchone()

        assert result is not None
        totp_enabled = result[0]
        assert totp_enabled == 0  # False/disabled

    def test_backup_codes_defaults_to_empty_json(self, conn, unique_username):
        """New users should have empty backup_codes JSON"""
        from auth import init_auth_tables, AuthService

        init_auth_tables(conn)

        service = AuthService(conn)
        user_data = service.create_user(unique_username, "password123")

        assert "id" in user_data
        assert "error" not in user_data

        cursor = conn.cursor()
        cursor.execute("SELECT backup_codes FROM users WHERE id = ?", (user_data["id"],))
        result = cursor.fetchone()

        assert result is not None
        backup_codes = result[0]

        # Should be empty JSON array or NULL
        if backup_codes:
            parsed = json.loads(backup_codes)
            assert isinstance(parsed, list)
            assert len(parsed) == 0
        else:
            assert backup_codes is None or backup_codes == ""


class TestTwoFAEnableDisable:
    """Test enabling and disabling 2FA for a user"""

    def test_enable_2fa_stores_secret_and_codes(self, conn, unique_username):
        """Enabling 2FA should store secret and backup codes"""
        from auth import init_auth_tables, AuthService
        from totp_service import generate_totp_secret, generate_backup_codes

        init_auth_tables(conn)

        # Create user
        service = AuthService(conn)
        user_result = service.create_user(unique_username, "password123")
        user_id = user_result["id"]

        # Generate 2FA data
        secret = generate_totp_secret()
        backup_codes = generate_backup_codes()

        # Store in database
        cursor = conn.cursor()
        backup_codes_json = json.dumps(backup_codes)
        cursor.execute(
            """
            UPDATE users
            SET totp_secret = ?, backup_codes = ?, totp_enabled = 1
            WHERE id = ?
        """,
            (secret, backup_codes_json, user_id),
        )
        conn.commit()

        # Verify stored correctly
        cursor.execute(
            """
            SELECT totp_secret, backup_codes, totp_enabled
            FROM users WHERE id = ?
        """,
            (user_id,),
        )
        result = cursor.fetchone()

        # sqlite3.Row objects support indexing
        stored_secret = result[0]
        stored_codes_json = result[1]
        totp_enabled = result[2]

        assert stored_secret == secret
        assert json.loads(stored_codes_json) == backup_codes
        assert totp_enabled == 1

    def test_disable_2fa_clears_secret_and_codes(self, conn, unique_username):
        """Disabling 2FA should clear secret and codes"""
        from auth import init_auth_tables, AuthService
        from totp_service import generate_totp_secret, generate_backup_codes

        init_auth_tables(conn)

        # Create user with 2FA
        service = AuthService(conn)
        user_result = service.create_user(unique_username, "password123")
        user_id = user_result["id"]

        # Store 2FA data
        secret = generate_totp_secret()
        backup_codes = generate_backup_codes()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET totp_secret = ?, backup_codes = ?, totp_enabled = 1
            WHERE id = ?
        """,
            (secret, json.dumps(backup_codes), user_id),
        )
        conn.commit()

        # Disable 2FA
        cursor.execute(
            """
            UPDATE users
            SET totp_secret = NULL, backup_codes = NULL, totp_enabled = 0
            WHERE id = ?
        """,
            (user_id,),
        )
        conn.commit()

        # Verify cleared
        cursor.execute(
            "SELECT totp_secret, backup_codes, totp_enabled FROM users WHERE id = ?",
            (user_id,),
        )
        result = cursor.fetchone()

        # sqlite3.Row objects support indexing
        totp_secret = result[0]
        backup_codes_val = result[1]
        totp_enabled = result[2]

        assert totp_secret is None
        assert backup_codes_val is None
        assert totp_enabled == 0


class TestTwoFAUsageTracking:
    """Test tracking of used backup codes"""

    def test_track_used_backup_codes(self, conn, unique_username):
        """Should track which backup codes have been used"""
        from auth import init_auth_tables, AuthService
        from totp_service import generate_backup_codes

        init_auth_tables(conn)

        # Create user with backup codes
        service = AuthService(conn)
        user_result = service.create_user(unique_username, "password123")
        user_id = user_result["id"]

        backup_codes = generate_backup_codes(count=3)  # Just 3 for test
        used_codes = [backup_codes[0]]  # Mark first as used

        # Store
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET backup_codes = ?
            WHERE id = ?
        """,
            (json.dumps(backup_codes), user_id),
        )
        conn.commit()

        # Simulate tracking used codes in app logic
        # (In real implementation, would have separate table or JSON field)
        all_codes = json.loads(
            cursor.execute(
                "SELECT backup_codes FROM users WHERE id = ?", (user_id,)
            ).fetchone()[0]
        )
        used_set = set(used_codes)
        remaining = [code for code in all_codes if code not in used_set]

        assert len(remaining) == 2
        assert backup_codes[0] not in remaining
        assert backup_codes[1] in remaining
        assert backup_codes[2] in remaining
