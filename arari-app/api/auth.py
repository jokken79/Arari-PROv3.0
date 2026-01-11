"""
AuthAgent - Authentication & Authorization System
JWT-based authentication with role-based access control
Supports both SQLite (local) and PostgreSQL (Railway production)
"""

import os
import secrets
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Dict, Optional

import bcrypt
from dotenv import load_dotenv

from database import USE_POSTGRES

load_dotenv()


def _q(query: str) -> str:
    """Convert SQLite query to PostgreSQL if needed (? -> %s)"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query

# JWT-like token management (simple implementation without external deps)
# In production, use python-jose or PyJWT

# SECRET_KEY is not directly used for password hashing with bcrypt
# It can still be used for JWT tokens if implemented.
# SECRET_KEY = os.environ.get("ARARI_SECRET_KEY", secrets.token_hex(32))
TOKEN_EXPIRE_HOURS = 24
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Refresh tokens last 7 days

# Default credentials detection
DEFAULT_PASSWORDS = ["admin123", "password", "123456", "admin", "password123"]

# Role hierarchy
ROLES = {
    "admin": 100,  # Full access
    "manager": 50,  # View + edit + reports
    "viewer": 10,  # View only
}

ROLE_PERMISSIONS = {
    "admin": ["*"],  # All permissions
    "manager": [
        "view:employees",
        "edit:employees",
        "view:payroll",
        "edit:payroll",
        "view:reports",
        "generate:reports",
        "view:statistics",
        "view:alerts",
        "upload:files",
    ],
    "viewer": [
        "view:employees",
        "view:payroll",
        "view:reports",
        "view:statistics",
    ],
}


def init_auth_tables(conn):
    """Initialize authentication tables (SQLite or PostgreSQL)"""
    cursor = conn.cursor()

    # SQL type mappings for cross-database compatibility
    if USE_POSTGRES:
        PK_TYPE = "SERIAL PRIMARY KEY"
    else:
        PK_TYPE = "INTEGER PRIMARY KEY AUTOINCREMENT"

    # Users table
    users_sql = f"""
        CREATE TABLE IF NOT EXISTS users (
            id {PK_TYPE},
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            role TEXT DEFAULT 'viewer',
            is_active INTEGER DEFAULT 1,
            last_login TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    cursor.execute(users_sql)

    # Sessions/Tokens table (access tokens)
    tokens_sql = f"""
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id {PK_TYPE},
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """
    cursor.execute(tokens_sql)

    # Refresh tokens table (longer-lived tokens for obtaining new access tokens)
    refresh_tokens_sql = f"""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id {PK_TYPE},
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0,
            revoked_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """
    cursor.execute(refresh_tokens_sql)

    # Create indexes
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_users_username
        ON users(username)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tokens_token
        ON auth_tokens(token)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
        ON refresh_tokens(token)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
        ON refresh_tokens(user_id)
    """
    )

    # Create default admin user if not exists
    cursor.execute("SELECT COUNT(*) FROM users WHERE LOWER(username) = 'admin'")
    count_row = cursor.fetchone()
    # Handle both dict (PostgreSQL RealDictCursor) and tuple (SQLite)
    count_val = count_row["count"] if isinstance(count_row, dict) else count_row[0]
    if count_val == 0:
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@arari-pro.local")
        password_hash = hash_password(admin_password)  # Use bcrypt
        cursor.execute(
            _q("""
            INSERT INTO users (username, password_hash, full_name, role, email)
            VALUES (?, ?, ?, ?, ?)
        """),
            (admin_username, password_hash, "Administrator", "admin", admin_email),
        )
        print(
            f"[AUTH] Created default admin user (username: {admin_username})"
        )
    conn.commit()


def is_weak_password(password: str) -> bool:
    """Check if password is weak/default"""
    return password.lower() in [p.lower() for p in DEFAULT_PASSWORDS]


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed_password.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_token() -> str:
    """Generate secure random token"""
    return secrets.token_urlsafe(32)


def create_token(conn, user_id: int) -> Dict[str, Any]:
    """Create new authentication token"""
    token = generate_token()
    expires_at = datetime.now() + timedelta(hours=TOKEN_EXPIRE_HOURS)

    cursor = conn.cursor()
    cursor.execute(
        _q("""
        INSERT INTO auth_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    """),
        (user_id, token, expires_at.isoformat()),
    )
    conn.commit()

    return {
        "token": token,
        "expires_at": expires_at.isoformat(),
        "token_type": "bearer",
    }


def validate_token(conn, token: str) -> Optional[Dict[str, Any]]:
    """Validate token and return user info if valid"""
    cursor = conn.cursor()
    cursor.execute(
        _q("""
        SELECT u.id, u.username, u.role, u.full_name, u.email, t.expires_at
        FROM auth_tokens t
        JOIN users u ON t.user_id = u.id
        WHERE t.token = ? AND u.is_active = 1
    """),
        (token,),
    )

    row = cursor.fetchone()
    if not row:
        return None

    # Check expiration - handle both dict (PostgreSQL) and tuple (SQLite)
    expires_at_val = row["expires_at"] if isinstance(row, dict) else row[5]
    expires_at = datetime.fromisoformat(expires_at_val)
    if datetime.now() > expires_at:
        # Token expired, delete it
        cursor.execute(_q("DELETE FROM auth_tokens WHERE token = ?"), (token,))
        conn.commit()
        return None

    # Return dict - handle both PostgreSQL RealDictCursor and SQLite Row
    if isinstance(row, dict):
        return {
            "user_id": row["id"],
            "username": row["username"],
            "role": row["role"],
            "full_name": row["full_name"],
            "email": row["email"],
            "expires_at": row["expires_at"],
        }
    return {
        "user_id": row[0],
        "username": row[1],
        "role": row[2],
        "full_name": row[3],
        "email": row[4],
        "expires_at": row[5],
    }


def revoke_token(conn, token: str) -> bool:
    """Revoke/delete a token (logout)"""
    cursor = conn.cursor()
    cursor.execute(_q("DELETE FROM auth_tokens WHERE token = ?"), (token,))
    conn.commit()
    return cursor.rowcount > 0


def revoke_all_user_tokens(conn, user_id: int) -> int:
    """Revoke all tokens for a user"""
    cursor = conn.cursor()
    cursor.execute(_q("DELETE FROM auth_tokens WHERE user_id = ?"), (user_id,))
    conn.commit()
    return cursor.rowcount


# ============== REFRESH TOKEN FUNCTIONS ==============


def generate_refresh_token() -> str:
    """Generate secure random refresh token (longer than access token)"""
    return secrets.token_urlsafe(48)


def create_refresh_token(conn, user_id: int) -> Dict[str, Any]:
    """Create new refresh token for a user"""
    token = generate_refresh_token()
    expires_at = datetime.now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    cursor = conn.cursor()
    cursor.execute(
        _q("""
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    """),
        (user_id, token, expires_at.isoformat()),
    )
    conn.commit()

    return {
        "refresh_token": token,
        "refresh_expires_at": expires_at.isoformat(),
    }


def validate_refresh_token(conn, token: str) -> Optional[Dict[str, Any]]:
    """
    Validate refresh token and return user info if valid.
    Returns None if token is invalid, expired, or revoked.
    """
    cursor = conn.cursor()
    cursor.execute(
        _q("""
        SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
               u.username, u.role, u.full_name, u.email, u.is_active
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ?
    """),
        (token,),
    )

    row = cursor.fetchone()
    if not row:
        return None

    # Handle both dict (PostgreSQL) and tuple (SQLite)
    if isinstance(row, dict):
        token_id = row["id"]
        user_id = row["user_id"]
        expires_at_val = row["expires_at"]
        revoked = row["revoked"]
        username = row["username"]
        role = row["role"]
        full_name = row["full_name"]
        email = row["email"]
        is_active = row["is_active"]
    else:
        token_id, user_id, expires_at_val, revoked, username, role, full_name, email, is_active = row

    # Check if revoked
    if revoked:
        return None

    # Check if user is active
    if not is_active:
        return None

    # Check expiration
    expires_at = datetime.fromisoformat(expires_at_val)
    if datetime.now() > expires_at:
        # Token expired - optionally clean up
        cursor.execute(_q("DELETE FROM refresh_tokens WHERE id = ?"), (token_id,))
        conn.commit()
        return None

    return {
        "token_id": token_id,
        "user_id": user_id,
        "username": username,
        "role": role,
        "full_name": full_name,
        "email": email,
        "expires_at": expires_at_val,
    }


def revoke_refresh_token(conn, token: str) -> bool:
    """Revoke a specific refresh token"""
    cursor = conn.cursor()
    cursor.execute(
        _q("""
        UPDATE refresh_tokens
        SET revoked = 1, revoked_at = ?
        WHERE token = ? AND revoked = 0
    """),
        (datetime.now().isoformat(), token),
    )
    conn.commit()
    return cursor.rowcount > 0


def revoke_all_user_refresh_tokens(conn, user_id: int) -> int:
    """Revoke all refresh tokens for a user"""
    cursor = conn.cursor()
    cursor.execute(
        _q("""
        UPDATE refresh_tokens
        SET revoked = 1, revoked_at = ?
        WHERE user_id = ? AND revoked = 0
    """),
        (datetime.now().isoformat(), user_id),
    )
    conn.commit()
    return cursor.rowcount


def cleanup_expired_refresh_tokens(conn) -> int:
    """Clean up expired refresh tokens (maintenance function)"""
    cursor = conn.cursor()
    cursor.execute(
        _q("""
        DELETE FROM refresh_tokens
        WHERE expires_at < ? OR revoked = 1
    """),
        (datetime.now().isoformat(),),
    )
    conn.commit()
    return cursor.rowcount


def rotate_refresh_token(conn, old_token: str) -> Optional[Dict[str, Any]]:
    """
    Rotate refresh token: validate old token, revoke it, and issue new one.
    Returns new tokens if successful, None if old token is invalid.
    This implements refresh token rotation for enhanced security.
    """
    # Validate the old token first
    user_info = validate_refresh_token(conn, old_token)
    if not user_info:
        return None

    user_id = user_info["user_id"]

    # Revoke the old refresh token
    revoke_refresh_token(conn, old_token)

    # Create new access token
    access_token_data = create_token(conn, user_id)

    # Create new refresh token
    refresh_token_data = create_refresh_token(conn, user_id)

    return {
        "user": {
            "id": user_id,
            "username": user_info["username"],
            "role": user_info["role"],
            "full_name": user_info["full_name"],
            "email": user_info["email"],
        },
        **access_token_data,
        **refresh_token_data,
    }


def has_permission(role: str, permission: str) -> bool:
    """Check if role has specific permission"""
    if role not in ROLE_PERMISSIONS:
        return False

    permissions = ROLE_PERMISSIONS[role]
    if "*" in permissions:
        return True

    return permission in permissions


def check_role_level(user_role: str, required_role: str) -> bool:
    """Check if user role level is >= required role level"""
    user_level = ROLES.get(user_role, 0)
    required_level = ROLES.get(required_role, 100)
    return user_level >= required_level


class AuthService:
    """Authentication service for user management"""

    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor()

    def login(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user and return token"""
        self.cursor.execute(
            _q("""
            SELECT id, username, password_hash, role, full_name, email, is_active
            FROM users WHERE username = ?
        """),
            (username,),
        )

        row = self.cursor.fetchone()
        if not row:
            return None

        # Handle both dict (PostgreSQL) and tuple/Row (SQLite)
        if isinstance(row, dict):
            user_id = row["id"]
            username = row["username"]
            password_hash = row["password_hash"]
            role = row["role"]
            full_name = row["full_name"]
            email = row["email"]
            is_active = row["is_active"]
        else:
            user_id, username, password_hash, role, full_name, email, is_active = row

        if not is_active:
            return {"error": "User account is disabled"}

        if not verify_password(password, password_hash):
            return None

        # Update last login
        self.cursor.execute(
            _q("""
            UPDATE users SET last_login = ? WHERE id = ?
        """),
            (datetime.now().isoformat(), user_id),
        )
        self.conn.commit()

        # Check if using weak/default password
        must_change_password = is_weak_password(password)

        # Create access token
        token_data = create_token(self.conn, user_id)

        # Create refresh token
        refresh_token_data = create_refresh_token(self.conn, user_id)

        return {
            "user": {
                "id": user_id,
                "username": username,
                "role": role,
                "full_name": full_name,
                "email": email,
            },
            "must_change_password": must_change_password,
            **token_data,
            **refresh_token_data,
        }

    def logout(self, token: str, refresh_token: str = None) -> bool:
        """Logout user by revoking access token and optionally refresh token"""
        access_revoked = revoke_token(self.conn, token)
        if refresh_token:
            revoke_refresh_token(self.conn, refresh_token)
        return access_revoked

    def create_user(
        self,
        username: str,
        password: str,
        role: str = "viewer",
        full_name: str = None,
        email: str = None,
    ) -> Dict[str, Any]:
        """Create new user"""
        if role not in ROLES:
            return {"error": f"Invalid role. Valid roles: {list(ROLES.keys())}"}

        password_hash = hash_password(password)

        try:
            self.cursor.execute(
                _q("""
                INSERT INTO users (username, password_hash, role, full_name, email)
                VALUES (?, ?, ?, ?, ?)
            """),
                (username, password_hash, role, full_name, email),
            )
            self.conn.commit()

            # Get the last inserted ID (different for SQLite vs PostgreSQL)
            if USE_POSTGRES:
                self.cursor.execute("SELECT lastval()")
                last_id = self.cursor.fetchone()
                user_id = last_id["lastval"] if isinstance(last_id, dict) else last_id[0]
            else:
                user_id = self.cursor.lastrowid

            return {
                "id": user_id,
                "username": username,
                "role": role,
                "full_name": full_name,
                "email": email,
            }
        except Exception as e:
            # Handle both SQLite and PostgreSQL unique constraint errors
            if "UNIQUE" in str(e).upper() or "unique" in str(e).lower() or "duplicate" in str(e).lower():
                return {"error": "Username already exists"}
            raise

    def update_user(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Update user details"""
        allowed_fields = ["email", "full_name", "role", "is_active"]
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return {"error": "No valid fields to update"}

        if "role" in updates and updates["role"] not in ROLES:
            return {"error": f"Invalid role. Valid roles: {list(ROLES.keys())}"}

        # Build placeholder based on database type
        ph = "%s" if USE_POSTGRES else "?"
        set_clause = ", ".join(f"{k} = {ph}" for k in updates.keys())
        values = list(updates.values()) + [user_id]

        self.cursor.execute(
            f"""
            UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = {ph}
        """,
            values,
        )
        self.conn.commit()

        return {"status": "updated", "user_id": user_id}

    def change_password(
        self, user_id: int, old_password: str, new_password: str
    ) -> Dict[str, Any]:
        """Change user password"""
        self.cursor.execute(_q("SELECT password_hash FROM users WHERE id = ?"), (user_id,))
        row = self.cursor.fetchone()

        if not row:
            return {"error": "User not found"}

        # Handle both dict (PostgreSQL) and tuple (SQLite)
        current_hash = row["password_hash"] if isinstance(row, dict) else row[0]
        if not verify_password(old_password, current_hash):
            return {"error": "Current password is incorrect"}

        new_hash = hash_password(new_password)
        self.cursor.execute(
            _q("""
            UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """),
            (new_hash, user_id),
        )
        self.conn.commit()

        # Revoke all tokens (force re-login)
        revoke_all_user_tokens(self.conn, user_id)
        revoke_all_user_refresh_tokens(self.conn, user_id)

        return {"status": "password_changed"}

    def reset_password(self, user_id: int, new_password: str) -> Dict[str, Any]:
        """Reset user password (admin function, no old password required)"""
        self.cursor.execute(_q("SELECT id, username FROM users WHERE id = ?"), (user_id,))
        row = self.cursor.fetchone()

        if not row:
            return {"error": "User not found"}

        new_hash = hash_password(new_password)
        self.cursor.execute(
            _q("""
            UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """),
            (new_hash, user_id),
        )
        self.conn.commit()

        # Revoke all tokens (force re-login)
        revoke_all_user_tokens(self.conn, user_id)
        revoke_all_user_refresh_tokens(self.conn, user_id)

        # Handle both dict (PostgreSQL) and tuple (SQLite)
        username = row["username"] if isinstance(row, dict) else row[1]
        return {"status": "password_reset", "username": username}

    def get_users(self, include_inactive: bool = False) -> list:
        """Get all users"""
        query = """
            SELECT id, username, role, full_name, email, is_active, last_login, created_at
            FROM users
        """
        if not include_inactive:
            query += " WHERE is_active = 1"

        self.cursor.execute(query)

        results = []
        for row in self.cursor.fetchall():
            # Handle both dict (PostgreSQL) and tuple (SQLite)
            if isinstance(row, dict):
                results.append({
                    "id": row["id"],
                    "username": row["username"],
                    "role": row["role"],
                    "full_name": row["full_name"],
                    "email": row["email"],
                    "is_active": bool(row["is_active"]),
                    "last_login": row["last_login"],
                    "created_at": row["created_at"],
                })
            else:
                results.append({
                    "id": row[0],
                    "username": row[1],
                    "role": row[2],
                    "full_name": row[3],
                    "email": row[4],
                    "is_active": bool(row[5]),
                    "last_login": row[6],
                    "created_at": row[7],
                })
        return results

    def delete_user(self, user_id: int, hard_delete: bool = False) -> Dict[str, Any]:
        """Delete or deactivate user"""
        # Don't allow deleting the last admin
        self.cursor.execute(
            """
            SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1
        """
        )
        count_row = self.cursor.fetchone()
        admin_count = count_row["count"] if isinstance(count_row, dict) else count_row[0]

        self.cursor.execute(_q("SELECT role FROM users WHERE id = ?"), (user_id,))
        row = self.cursor.fetchone()
        if not row:
            return {"error": "User not found"}

        user_role = row["role"] if isinstance(row, dict) else row[0]
        if user_role == "admin" and admin_count <= 1:
            return {"error": "Cannot delete the last admin user"}

        if hard_delete:
            revoke_all_user_tokens(self.conn, user_id)
            revoke_all_user_refresh_tokens(self.conn, user_id)
            self.cursor.execute(_q("DELETE FROM users WHERE id = ?"), (user_id,))
        else:
            self.cursor.execute(
                _q("""
                UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """),
                (user_id,),
            )
            revoke_all_user_tokens(self.conn, user_id)
            revoke_all_user_refresh_tokens(self.conn, user_id)

        self.conn.commit()
        return {"status": "deleted" if hard_delete else "deactivated"}


# FastAPI dependency for authentication
def get_current_user(token: str, conn) -> Optional[Dict[str, Any]]:
    """Get current user from token - use as FastAPI dependency"""
    if not token:
        return None

    # Remove "Bearer " prefix if present
    if token.startswith("Bearer "):
        token = token[7:]

    return validate_token(conn, token)


def require_auth(permission: str = None):
    """Decorator to require authentication and optionally specific permission"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would be implemented with FastAPI's Depends
            # For now, return the function as-is
            return await func(*args, **kwargs)

        return wrapper

    return decorator
