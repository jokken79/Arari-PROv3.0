"""
Redis-based Rate Limiter for FastAPI

Provides distributed rate limiting using Redis with sliding window algorithm.
Falls back to in-memory rate limiting if Redis is unavailable.

Usage:
    from rate_limiter import RateLimiter, get_rate_limiter

    limiter = get_rate_limiter()

    # Check rate limit (raises HTTPException if exceeded)
    limiter.check("192.168.1.1", "login")

    # Clear rate limit after successful action
    limiter.clear("192.168.1.1", "login")
"""

import logging
import os
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting on a specific endpoint."""
    max_requests: int
    window_seconds: int

    def __post_init__(self):
        if self.max_requests < 1:
            raise ValueError("max_requests must be at least 1")
        if self.window_seconds < 1:
            raise ValueError("window_seconds must be at least 1")


# Default rate limit configurations per endpoint
DEFAULT_RATE_LIMITS: Dict[str, RateLimitConfig] = {
    # Authentication endpoints - strict limits
    "login": RateLimitConfig(max_requests=5, window_seconds=60),
    "password_reset": RateLimitConfig(max_requests=3, window_seconds=300),
    "register": RateLimitConfig(max_requests=5, window_seconds=300),

    # File upload endpoints - moderate limits
    "upload": RateLimitConfig(max_requests=10, window_seconds=60),
    "upload_salary": RateLimitConfig(max_requests=10, window_seconds=60),
    "upload_employees": RateLimitConfig(max_requests=10, window_seconds=60),

    # Report generation - moderate limits (can be resource-intensive)
    "report_download": RateLimitConfig(max_requests=20, window_seconds=60),
    "report_generate": RateLimitConfig(max_requests=10, window_seconds=60),

    # API endpoints - general limits
    "api_write": RateLimitConfig(max_requests=50, window_seconds=60),
    "api_read": RateLimitConfig(max_requests=100, window_seconds=60),

    # Default fallback
    "default": RateLimitConfig(max_requests=100, window_seconds=60),
}


class RateLimiterBackend(ABC):
    """Abstract base class for rate limiter backends."""

    @abstractmethod
    def check(self, key: str, config: RateLimitConfig) -> tuple[bool, int]:
        """
        Check if request is allowed.

        Args:
            key: Unique identifier for the rate limit (e.g., "192.168.1.1:login")
            config: Rate limit configuration

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        pass

    @abstractmethod
    def clear(self, key: str) -> None:
        """Clear rate limit for a key."""
        pass

    @abstractmethod
    def get_remaining(self, key: str, config: RateLimitConfig) -> int:
        """Get remaining requests for a key."""
        pass


class InMemoryRateLimiter(RateLimiterBackend):
    """
    In-memory rate limiter using sliding window algorithm.

    Suitable for single-instance deployments or as a fallback.
    Note: Rate limits are not shared across multiple instances.
    """

    def __init__(self):
        self._store: Dict[str, List[float]] = defaultdict(list)
        logger.info("Initialized in-memory rate limiter")

    def _cleanup_expired(self, key: str, window_seconds: int) -> None:
        """Remove expired timestamps from the sliding window."""
        current_time = time.time()
        cutoff = current_time - window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]

    def check(self, key: str, config: RateLimitConfig) -> tuple[bool, int]:
        """Check if request is allowed using sliding window algorithm."""
        self._cleanup_expired(key, config.window_seconds)

        current_time = time.time()
        request_count = len(self._store[key])

        if request_count >= config.max_requests:
            # Calculate retry-after based on oldest request in window
            if self._store[key]:
                oldest = min(self._store[key])
                retry_after = int(config.window_seconds - (current_time - oldest)) + 1
            else:
                retry_after = config.window_seconds
            return False, max(1, retry_after)

        # Record this request
        self._store[key].append(current_time)
        return True, 0

    def clear(self, key: str) -> None:
        """Clear rate limit for a key."""
        if key in self._store:
            del self._store[key]

    def get_remaining(self, key: str, config: RateLimitConfig) -> int:
        """Get remaining requests allowed in the current window."""
        self._cleanup_expired(key, config.window_seconds)
        return max(0, config.max_requests - len(self._store[key]))


class RedisRateLimiter(RateLimiterBackend):
    """
    Redis-based rate limiter using sliding window algorithm.

    Uses sorted sets to implement a sliding window. Each request is stored
    as a member with its timestamp as the score. Expired entries are cleaned
    up on each check.

    Benefits:
    - Shared rate limits across multiple application instances
    - Persistent across restarts (with Redis persistence)
    - Atomic operations prevent race conditions
    """

    def __init__(self, redis_url: str):
        try:
            import redis
            self._redis = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # Test connection
            self._redis.ping()
            self._available = True
            logger.info(f"Connected to Redis for rate limiting: {self._mask_url(redis_url)}")
        except ImportError:
            logger.warning("redis package not installed, rate limiting will use in-memory fallback")
            self._available = False
            self._redis = None
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Using in-memory fallback.")
            self._available = False
            self._redis = None

    @staticmethod
    def _mask_url(url: str) -> str:
        """Mask sensitive parts of Redis URL for logging."""
        if "@" in url:
            # Mask password in URLs like redis://:password@host:port
            parts = url.split("@")
            return f"redis://***@{parts[-1]}"
        return url

    def _get_key(self, key: str) -> str:
        """Get Redis key with prefix."""
        return f"rate_limit:{key}"

    @property
    def is_available(self) -> bool:
        """Check if Redis connection is available."""
        return self._available

    def check(self, key: str, config: RateLimitConfig) -> tuple[bool, int]:
        """
        Check if request is allowed using Redis sorted set.

        Uses ZADD with timestamp scores and ZREMRANGEBYSCORE for cleanup.
        All operations are atomic using Lua script for consistency.
        """
        if not self._available or not self._redis:
            raise RuntimeError("Redis not available")

        redis_key = self._get_key(key)
        current_time = time.time()
        window_start = current_time - config.window_seconds

        # Lua script for atomic rate limiting
        # This ensures consistency even with concurrent requests
        lua_script = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local max_requests = tonumber(ARGV[3])
        local window_seconds = tonumber(ARGV[4])

        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

        -- Count current requests
        local count = redis.call('ZCARD', key)

        if count >= max_requests then
            -- Get oldest timestamp to calculate retry-after
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            if oldest[2] then
                local retry_after = math.ceil(window_seconds - (now - oldest[2]))
                return {0, math.max(1, retry_after)}
            end
            return {0, window_seconds}
        end

        -- Add current request
        redis.call('ZADD', key, now, now .. ':' .. math.random())

        -- Set expiry on the key
        redis.call('EXPIRE', key, window_seconds + 10)

        return {1, 0}
        """

        try:
            result = self._redis.eval(
                lua_script,
                1,
                redis_key,
                str(current_time),
                str(window_start),
                str(config.max_requests),
                str(config.window_seconds),
            )
            is_allowed = bool(result[0])
            retry_after = int(result[1])
            return is_allowed, retry_after
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            raise

    def clear(self, key: str) -> None:
        """Clear rate limit for a key."""
        if not self._available or not self._redis:
            return

        try:
            self._redis.delete(self._get_key(key))
        except Exception as e:
            logger.error(f"Failed to clear Redis rate limit: {e}")

    def get_remaining(self, key: str, config: RateLimitConfig) -> int:
        """Get remaining requests allowed in the current window."""
        if not self._available or not self._redis:
            return config.max_requests

        try:
            redis_key = self._get_key(key)
            window_start = time.time() - config.window_seconds

            # Clean and count
            self._redis.zremrangebyscore(redis_key, "-inf", window_start)
            count = self._redis.zcard(redis_key)

            return max(0, config.max_requests - count)
        except Exception as e:
            logger.error(f"Failed to get remaining rate limit: {e}")
            return config.max_requests


class RateLimiter:
    """
    Main rate limiter class with automatic backend selection.

    Attempts to use Redis if REDIS_URL is configured, otherwise falls back
    to in-memory rate limiting.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        custom_limits: Optional[Dict[str, RateLimitConfig]] = None,
    ):
        """
        Initialize rate limiter.

        Args:
            redis_url: Redis connection URL. If None, uses REDIS_URL env var.
            custom_limits: Custom rate limit configurations to override defaults.
        """
        self._limits = {**DEFAULT_RATE_LIMITS}
        if custom_limits:
            self._limits.update(custom_limits)

        # Try Redis first
        redis_url = redis_url or os.environ.get("REDIS_URL")
        self._redis_backend: Optional[RedisRateLimiter] = None
        self._memory_backend = InMemoryRateLimiter()

        if redis_url:
            self._redis_backend = RedisRateLimiter(redis_url)
        else:
            logger.info("REDIS_URL not configured, using in-memory rate limiting")

    def _get_backend(self) -> RateLimiterBackend:
        """Get the appropriate backend (Redis if available, else in-memory)."""
        if self._redis_backend and self._redis_backend.is_available:
            return self._redis_backend
        return self._memory_backend

    def _get_config(self, endpoint: str) -> RateLimitConfig:
        """Get rate limit configuration for an endpoint."""
        return self._limits.get(endpoint, self._limits["default"])

    def _make_key(self, client_id: str, endpoint: str) -> str:
        """Create a unique key for the rate limit."""
        return f"{client_id}:{endpoint}"

    def check(
        self,
        client_id: str,
        endpoint: str = "default",
        raise_on_limit: bool = True,
    ) -> tuple[bool, int, int]:
        """
        Check if a request is allowed.

        Args:
            client_id: Unique identifier for the client (e.g., IP address)
            endpoint: Endpoint name for rate limit configuration
            raise_on_limit: If True, raises HTTPException when limit exceeded

        Returns:
            Tuple of (is_allowed, retry_after_seconds, remaining_requests)

        Raises:
            HTTPException: If raise_on_limit=True and limit exceeded
        """
        config = self._get_config(endpoint)
        key = self._make_key(client_id, endpoint)
        backend = self._get_backend()

        try:
            is_allowed, retry_after = backend.check(key, config)
        except Exception as e:
            # If Redis fails, fall back to in-memory
            logger.warning(f"Rate limit backend error, using fallback: {e}")
            is_allowed, retry_after = self._memory_backend.check(key, config)

        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for {client_id} on {endpoint} "
                f"(limit: {config.max_requests}/{config.window_seconds}s)"
            )
            if raise_on_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests. Try again in {retry_after} seconds.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(config.max_requests),
                        "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    },
                )

        remaining = self.get_remaining(client_id, endpoint)
        return is_allowed, retry_after, remaining

    def clear(self, client_id: str, endpoint: str = "default") -> None:
        """
        Clear rate limit for a client/endpoint combination.

        Useful after successful actions (e.g., after successful login).
        """
        key = self._make_key(client_id, endpoint)

        # Clear from both backends to ensure consistency
        if self._redis_backend:
            self._redis_backend.clear(key)
        self._memory_backend.clear(key)

        logger.debug(f"Cleared rate limit for {client_id}:{endpoint}")

    def get_remaining(self, client_id: str, endpoint: str = "default") -> int:
        """Get remaining requests allowed for a client/endpoint."""
        config = self._get_config(endpoint)
        key = self._make_key(client_id, endpoint)
        backend = self._get_backend()

        try:
            return backend.get_remaining(key, config)
        except Exception:
            return self._memory_backend.get_remaining(key, config)

    def add_limit(self, endpoint: str, config: RateLimitConfig) -> None:
        """Add or update a rate limit configuration."""
        self._limits[endpoint] = config

    @property
    def is_using_redis(self) -> bool:
        """Check if currently using Redis backend."""
        return self._redis_backend is not None and self._redis_backend.is_available


# Singleton instance
_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter


def reset_rate_limiter() -> None:
    """Reset the global rate limiter (mainly for testing)."""
    global _rate_limiter
    _rate_limiter = None


def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request, handling proxies.

    Checks X-Forwarded-For header for proxy environments (Railway, Vercel, etc.)
    """
    # Check X-Forwarded-For header (set by reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client)
        # Format: "client, proxy1, proxy2"
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header (some proxies use this)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


# FastAPI dependency functions
async def rate_limit_login(request: Request) -> None:
    """
    FastAPI dependency for rate limiting login attempts.

    Usage:
        @app.post("/api/auth/login")
        async def login(_: None = Depends(rate_limit_login)):
            ...
    """
    limiter = get_rate_limiter()
    client_ip = get_client_ip(request)
    limiter.check(client_ip, "login")


async def rate_limit_upload(request: Request) -> None:
    """FastAPI dependency for rate limiting file uploads."""
    limiter = get_rate_limiter()
    client_ip = get_client_ip(request)
    limiter.check(client_ip, "upload")


async def rate_limit_api_write(request: Request) -> None:
    """FastAPI dependency for rate limiting write operations."""
    limiter = get_rate_limiter()
    client_ip = get_client_ip(request)
    limiter.check(client_ip, "api_write")


async def rate_limit_report(request: Request) -> None:
    """FastAPI dependency for rate limiting report generation."""
    limiter = get_rate_limiter()
    client_ip = get_client_ip(request)
    limiter.check(client_ip, "report_download")


def create_rate_limit_dependency(endpoint: str):
    """
    Factory function to create a rate limit dependency for any endpoint.

    Usage:
        @app.post("/api/custom")
        async def custom_endpoint(_: None = Depends(create_rate_limit_dependency("custom"))):
            ...
    """
    async def rate_limit_dependency(request: Request) -> None:
        limiter = get_rate_limiter()
        client_ip = get_client_ip(request)
        limiter.check(client_ip, endpoint)

    return rate_limit_dependency
