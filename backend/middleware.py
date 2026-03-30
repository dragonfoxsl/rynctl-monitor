"""
FastAPI middleware — API rate limiting and request logging.
"""

import logging
import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import RATE_LIMIT_RPM
from backend.security import get_csrf_token_for_session

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple sliding-window rate limiter per IP address.
    Only applies to /api/* routes. Returns 429 when exceeded.
    """

    def __init__(self, app, rpm: int = RATE_LIMIT_RPM):
        super().__init__(app)
        self.rpm = rpm
        self.window = 60  # seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit API endpoints
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        cutoff = now - self.window

        # Prune old entries and add current
        hits = self._hits[client_ip]
        self._hits[client_ip] = [t for t in hits if t > cutoff]
        self._hits[client_ip].append(now)

        if len(self._hits[client_ip]) > self.rpm:
            logger.warning("Rate limit exceeded for %s", client_ip)
            return Response(
                content='{"detail":"Rate limit exceeded. Try again later."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )

        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log each API request with method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start) * 1000

        logger.info(
            "%s %s %d %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Enforce CSRF tokens for state-changing API requests that rely on cookie auth.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
    EXEMPT_PATHS = {
        "/api/auth/login",
        "/api/health",
        "/api/metrics",
        "/metrics",
    }

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        if request.method in self.SAFE_METHODS or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        session_token = request.cookies.get("session_token")
        if not session_token:
            return await call_next(request)

        expected = get_csrf_token_for_session(session_token)
        provided = request.headers.get("X-CSRF-Token", "")
        if not expected or provided != expected:
            return Response(
                content='{"detail":"CSRF token missing or invalid"}',
                status_code=403,
                media_type="application/json",
            )

        return await call_next(request)
