"""
Application configuration loaded from environment variables.
Supports .env file loading for local development.
"""

import logging
import os
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Load .env file if it exists (development convenience)
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
PORT = int(os.environ.get("RYNCTL_PORT", 8080))
SECRET = os.environ.get("RYNCTL_SECRET", "").strip()
LOG_LEVEL = os.environ.get("RYNCTL_LOG_LEVEL", "INFO").upper()

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATA_DIR = os.environ.get("RYNCTL_DATA_DIR", "/data")

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
ADMIN_PASSWORD = os.environ.get("RYNCTL_ADMIN_PASSWORD", "").strip()
SESSION_EXPIRY_DAYS = int(os.environ.get("RYNCTL_SESSION_DAYS", 7))
MAX_LOGIN_ATTEMPTS = int(os.environ.get("RYNCTL_MAX_LOGIN_ATTEMPTS", 5))
LOCKOUT_MINUTES = int(os.environ.get("RYNCTL_LOCKOUT_MINUTES", 15))
RATE_LIMIT_RPM = int(os.environ.get("RYNCTL_RATE_LIMIT_RPM", 120))
SESSION_COOKIE_MAX_AGE = SESSION_EXPIRY_DAYS * 86400
# Set the Secure attribute on the session cookie (enable when serving over HTTPS)
SECURE_COOKIES = os.environ.get("RYNCTL_SECURE_COOKIES", "false").lower() in ("1", "true", "yes")
BROWSE_ROOTS = [
    str(Path(p).expanduser().resolve())
    for p in os.environ.get("RYNCTL_BROWSE_ROOTS", "").split(",")
    if p.strip()
]

# ---------------------------------------------------------------------------
# Jobs & Notifications
# ---------------------------------------------------------------------------
JOB_TIMEOUT_SECS = int(os.environ.get("RYNCTL_JOB_TIMEOUT", 0))  # 0 = disabled
RUN_RETENTION_DAYS = int(os.environ.get("RYNCTL_RUN_RETENTION_DAYS", 0))  # 0 = keep forever
WEBHOOK_URL = os.environ.get("RYNCTL_WEBHOOK_URL", "")          # POST on failure
WEBHOOK_EVENTS = os.environ.get("RYNCTL_WEBHOOK_EVENTS", "failure")  # failure,success,all

# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
METRICS_ENABLED = os.environ.get("RYNCTL_METRICS", "true").lower() in ("1", "true", "yes")

# ---------------------------------------------------------------------------
# Refuse credentials that would make a network-exposed first start unsafe.
# ---------------------------------------------------------------------------
_PLACEHOLDERS = {"admin", "change-me", "change-me-to-a-random-secret"}
if len(SECRET) < 32 or SECRET.lower() in _PLACEHOLDERS or SECRET.lower().startswith("replace-with-"):
    raise RuntimeError("RYNCTL_SECRET must be at least 32 characters and not a placeholder")
if not ADMIN_PASSWORD or ADMIN_PASSWORD.lower() in _PLACEHOLDERS or ADMIN_PASSWORD.lower().startswith("replace-with-"):
    raise RuntimeError("RYNCTL_ADMIN_PASSWORD must be set to a non-placeholder password")
if len(ADMIN_PASSWORD) < 8 or not all(re.search(pattern, ADMIN_PASSWORD) for pattern in (r"[A-Z]", r"[a-z]", r"[0-9]")):
    raise RuntimeError("RYNCTL_ADMIN_PASSWORD must be at least 8 characters with upper, lower, and numeric characters")
