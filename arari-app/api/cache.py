"""
CacheAgent - Caching System
In-memory and persistent caching for 粗利 PRO
Supports both SQLite (local) and PostgreSQL (Railway production)
"""

import json
import sqlite3
import threading
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Dict, Optional

from database import USE_POSTGRES

# In-memory cache
_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()


def _q(query: str) -> str:
    """Convert SQLite query to PostgreSQL if needed (? -> %s)"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query


def _get_count(row) -> int:
    """Extract count value from a row (handles dict for PostgreSQL, tuple for SQLite)"""
    if row is None:
        return 0
    if isinstance(row, dict):
        return row.get("count", row.get("COUNT(*)", 0))
    return row[0] if row[0] is not None else 0


def _get_sum(row) -> int:
    """Extract sum value from a row (handles dict for PostgreSQL, tuple for SQLite)"""
    if row is None:
        return 0
    if isinstance(row, dict):
        return row.get("total_hits", row.get("SUM(hit_count)", 0)) or 0
    return row[0] if row[0] is not None else 0


def init_cache_tables(conn):
    """Initialize persistent cache tables"""
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cache_store (
            cache_key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            hit_count INTEGER DEFAULT 0
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_cache_expires
        ON cache_store(expires_at)
    """
    )

    conn.commit()


class CacheService:
    """Service for caching"""

    def __init__(self, conn: sqlite3.Connection = None, default_ttl: int = 300):
        """
        Initialize cache service

        Args:
            conn: SQLite connection for persistent cache (optional)
            default_ttl: Default time-to-live in seconds (default: 5 minutes)
        """
        self.conn = conn
        self.default_ttl = default_ttl

    # ==================== In-Memory Cache ====================

    def get(self, key: str) -> Optional[Any]:
        """Get value from in-memory cache"""
        with _cache_lock:
            if key not in _cache:
                return None

            entry = _cache[key]

            # Check expiration
            if entry.get("expires_at"):
                if datetime.now() > datetime.fromisoformat(entry["expires_at"]):
                    del _cache[key]
                    return None

            entry["hits"] = entry.get("hits", 0) + 1
            return entry["value"]

    def set(self, key: str, value: Any, ttl: int = None) -> None:
        """Set value in in-memory cache"""
        ttl = ttl or self.default_ttl
        expires_at = (
            (datetime.now() + timedelta(seconds=ttl)).isoformat() if ttl else None
        )

        with _cache_lock:
            _cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": datetime.now().isoformat(),
                "hits": 0,
            }

    def delete(self, key: str) -> bool:
        """Delete from in-memory cache"""
        with _cache_lock:
            if key in _cache:
                del _cache[key]
                return True
            return False

    def clear(self, pattern: str = None) -> int:
        """Clear cache, optionally by pattern"""
        with _cache_lock:
            if pattern:
                import re

                regex = re.compile(pattern.replace("*", ".*"))
                keys_to_delete = [k for k in _cache.keys() if regex.match(k)]
                for key in keys_to_delete:
                    del _cache[key]
                return len(keys_to_delete)
            else:
                count = len(_cache)
                _cache.clear()
                return count

    def get_stats(self) -> Dict[str, Any]:
        """Get in-memory cache statistics"""
        with _cache_lock:
            total_entries = len(_cache)
            total_hits = sum(e.get("hits", 0) for e in _cache.values())

            # Count expired
            now = datetime.now()
            expired = sum(
                1
                for e in _cache.values()
                if e.get("expires_at") and datetime.fromisoformat(e["expires_at"]) < now
            )

            return {
                "total_entries": total_entries,
                "active_entries": total_entries - expired,
                "expired_entries": expired,
                "total_hits": total_hits,
            }

    # ==================== Persistent Cache ====================

    def get_persistent(self, key: str) -> Optional[Any]:
        """Get value from persistent cache"""
        if not self.conn:
            return None

        cursor = self.conn.cursor()
        cursor.execute(
            _q("SELECT value, expires_at FROM cache_store WHERE cache_key = ?"),
            (key,),
        )

        row = cursor.fetchone()
        if not row:
            return None

        # Handle both tuple (SQLite) and dict (PostgreSQL) row formats
        if isinstance(row, dict):
            value = row.get("value")
            expires_at = row.get("expires_at")
        else:
            value, expires_at = row

        # Check expiration
        if expires_at:
            exp_str = str(expires_at) if not isinstance(expires_at, str) else expires_at
            if datetime.now() > datetime.fromisoformat(exp_str.replace('+00:00', '').replace('Z', '')):
                cursor.execute(_q("DELETE FROM cache_store WHERE cache_key = ?"), (key,))
                self.conn.commit()
                return None

        # Update hit count
        cursor.execute(
            _q("UPDATE cache_store SET hit_count = hit_count + 1 WHERE cache_key = ?"),
            (key,),
        )
        self.conn.commit()

        return json.loads(value)

    def set_persistent(self, key: str, value: Any, ttl: int = None) -> None:
        """Set value in persistent cache"""
        if not self.conn:
            return

        ttl = ttl or self.default_ttl
        expires_at = (
            (datetime.now() + timedelta(seconds=ttl)).isoformat() if ttl else None
        )

        cursor = self.conn.cursor()
        json_value = json.dumps(value)

        if USE_POSTGRES:
            # PostgreSQL: use INSERT ... ON CONFLICT
            cursor.execute(
                """
                INSERT INTO cache_store (cache_key, value, expires_at, hit_count)
                VALUES (%s, %s, %s, 0)
                ON CONFLICT (cache_key) DO UPDATE SET
                    value = EXCLUDED.value,
                    expires_at = EXCLUDED.expires_at,
                    hit_count = 0
                """,
                (key, json_value, expires_at),
            )
        else:
            # SQLite: use INSERT OR REPLACE
            cursor.execute(
                """
                INSERT OR REPLACE INTO cache_store (cache_key, value, expires_at)
                VALUES (?, ?, ?)
                """,
                (key, json_value, expires_at),
            )
        self.conn.commit()

    def delete_persistent(self, key: str) -> bool:
        """Delete from persistent cache"""
        if not self.conn:
            return False

        cursor = self.conn.cursor()
        cursor.execute(_q("DELETE FROM cache_store WHERE cache_key = ?"), (key,))
        self.conn.commit()
        return cursor.rowcount > 0

    def clear_persistent(self, pattern: str = None) -> int:
        """Clear persistent cache"""
        if not self.conn:
            return 0

        cursor = self.conn.cursor()

        if pattern:
            # Convert glob pattern to SQL LIKE
            sql_pattern = pattern.replace("*", "%")
            cursor.execute(
                _q("DELETE FROM cache_store WHERE cache_key LIKE ?"), (sql_pattern,)
            )
        else:
            cursor.execute("DELETE FROM cache_store")

        self.conn.commit()
        return cursor.rowcount

    def cleanup_expired(self) -> int:
        """Remove expired entries from persistent cache"""
        if not self.conn:
            return 0

        cursor = self.conn.cursor()
        cursor.execute(
            _q("""
            DELETE FROM cache_store
            WHERE expires_at IS NOT NULL AND expires_at < ?
            """),
            (datetime.now().isoformat(),),
        )
        self.conn.commit()
        return cursor.rowcount

    def get_persistent_stats(self) -> Dict[str, Any]:
        """Get persistent cache statistics"""
        if not self.conn:
            return {"error": "No database connection"}

        cursor = self.conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM cache_store")
        total = _get_count(cursor.fetchone())

        cursor.execute(
            _q("""
            SELECT COUNT(*) FROM cache_store
            WHERE expires_at IS NOT NULL AND expires_at < ?
        """),
            (datetime.now().isoformat(),),
        )
        expired = _get_count(cursor.fetchone())

        cursor.execute("SELECT SUM(hit_count) as total_hits FROM cache_store")
        total_hits = _get_sum(cursor.fetchone())

        return {
            "total_entries": total,
            "active_entries": total - expired,
            "expired_entries": expired,
            "total_hits": total_hits,
        }

    # ==================== Cache Decorator ====================

    def cached(
        self, key_prefix: str = "", ttl: int = None, use_persistent: bool = False
    ):
        """
        Decorator for caching function results

        Usage:
            @cache_service.cached("stats", ttl=60)
            def get_statistics(period):
                ...
        """

        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                key_parts = [key_prefix or func.__name__]
                key_parts.extend(str(a) for a in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = ":".join(key_parts)

                # Try to get from cache
                if use_persistent:
                    cached_value = self.get_persistent(cache_key)
                else:
                    cached_value = self.get(cache_key)

                if cached_value is not None:
                    return cached_value

                # Call function and cache result
                result = func(*args, **kwargs)

                if use_persistent:
                    self.set_persistent(cache_key, result, ttl)
                else:
                    self.set(cache_key, result, ttl)

                return result

            return wrapper

        return decorator


# ==================== Cached Statistics Functions ====================


def cache_key_for_stats(period: str = None) -> str:
    """Generate cache key for statistics"""
    return f"stats:{period or 'all'}"


def cache_key_for_employees(search: str = None, company: str = None) -> str:
    """Generate cache key for employee list"""
    parts = ["employees"]
    if search:
        parts.append(f"s={search}")
    if company:
        parts.append(f"c={company}")
    return ":".join(parts)


def invalidate_stats_cache(cache_service: CacheService):
    """Invalidate all statistics caches"""
    cache_service.clear("stats:*")
    cache_service.clear_persistent("stats:*")


def invalidate_employee_cache(cache_service: CacheService, employee_id: str = None):
    """Invalidate employee caches"""
    if employee_id:
        cache_service.clear(f"employee:{employee_id}*")
        cache_service.clear_persistent(f"employee:{employee_id}*")
    else:
        cache_service.clear("employees:*")
        cache_service.clear_persistent("employees:*")


# ==================== Pre-computed Statistics ====================


class StatisticsCache:
    """Pre-computed statistics for fast dashboard loading"""

    def __init__(self, conn: sqlite3.Connection, cache_service: CacheService):
        self.conn = conn
        self.cache = cache_service

    def precompute_period_stats(self, period: str) -> Dict[str, Any]:
        """Pre-compute and cache statistics for a period"""
        cursor = self.conn.cursor()

        # This would normally call the statistics service
        # For now, just return a placeholder
        cursor.execute(
            """
            SELECT
                COUNT(*) as employee_count,
                SUM(billing_amount) as total_revenue,
                SUM(gross_profit) as total_profit,
                AVG(profit_margin) as avg_margin
            FROM payroll_records
            WHERE period = ?
        """,
            (period,),
        )

        row = cursor.fetchone()
        stats = {
            "period": period,
            "employee_count": row[0] or 0,
            "total_revenue": row[1] or 0,
            "total_profit": row[2] or 0,
            "avg_margin": row[3] or 0,
            "computed_at": datetime.now().isoformat(),
        }

        # Cache for 10 minutes
        self.cache.set(cache_key_for_stats(period), stats, ttl=600)
        self.cache.set_persistent(cache_key_for_stats(period), stats, ttl=600)

        return stats

    def get_cached_stats(self, period: str) -> Optional[Dict[str, Any]]:
        """Get cached statistics"""
        # Try memory first
        stats = self.cache.get(cache_key_for_stats(period))
        if stats:
            return stats

        # Try persistent
        stats = self.cache.get_persistent(cache_key_for_stats(period))
        if stats:
            # Populate memory cache
            self.cache.set(cache_key_for_stats(period), stats, ttl=600)
            return stats

        return None
