"""
Application configuration loaded from environment variables.
Supports .env file loading for local development.
"""

import logging
import os
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
SECRET = os.environ.get("RYNCTL_SECRET", "change-me")
LOG_LEVEL = os.environ.get("RYNCTL_LOG_LEVEL", "INFO").upper()

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATA_DIR = os.environ.get("RYNCTL_DATA_DIR", "/data")

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SESSION_EXPIRY_DAYS = int(os.environ.get("RYNCTL_SESSION_DAYS", 7))
MAX_LOGIN_ATTEMPTS = int(os.environ.get("RYNCTL_MAX_LOGIN_ATTEMPTS", 5))
LOCKOUT_MINUTES = int(os.environ.get("RYNCTL_LOCKOUT_MINUTES", 15))
RATE_LIMIT_RPM = int(os.environ.get("RYNCTL_RATE_LIMIT_RPM", 120))
SESSION_COOKIE_MAX_AGE = SESSION_EXPIRY_DAYS * 86400
BROWSE_ROOTS = [
    str(Path(p).expanduser().resolve())
    for p in os.environ.get("RYNCTL_BROWSE_ROOTS", "").split(",")
    if p.strip()
]

# ---------------------------------------------------------------------------
# Retry & Notifications
# ---------------------------------------------------------------------------
RETRY_MAX = int(os.environ.get("RYNCTL_RETRY_MAX", 0))          # 0 = disabled
RETRY_DELAY_SECS = int(os.environ.get("RYNCTL_RETRY_DELAY", 30))
JOB_TIMEOUT_SECS = int(os.environ.get("RYNCTL_JOB_TIMEOUT", 0))  # 0 = disabled
WEBHOOK_URL = os.environ.get("RYNCTL_WEBHOOK_URL", "")          # POST on failure
WEBHOOK_EVENTS = os.environ.get("RYNCTL_WEBHOOK_EVENTS", "failure")  # failure,success,all

# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
METRICS_ENABLED = os.environ.get("RYNCTL_METRICS", "true").lower() in ("1", "true", "yes")

# ---------------------------------------------------------------------------
# Startup warnings for insecure defaults
# ---------------------------------------------------------------------------
if SECRET == "change-me":
    logger.warning(
        "RYNCTL_SECRET is set to the default value — set a strong random "
        "secret via RYNCTL_SECRET before exposing this instance to the network"
    )
