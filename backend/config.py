"""
Application configuration loaded from environment variables.
Supports .env file loading for local development.
"""

import os
from pathlib import Path

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

# ---------------------------------------------------------------------------
# Retry & Notifications
# ---------------------------------------------------------------------------
RETRY_MAX = int(os.environ.get("RYNCTL_RETRY_MAX", 0))          # 0 = disabled
RETRY_DELAY_SECS = int(os.environ.get("RYNCTL_RETRY_DELAY", 30))
WEBHOOK_URL = os.environ.get("RYNCTL_WEBHOOK_URL", "")          # POST on failure
WEBHOOK_EVENTS = os.environ.get("RYNCTL_WEBHOOK_EVENTS", "failure")  # failure,success,all

# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
METRICS_ENABLED = os.environ.get("RYNCTL_METRICS", "true").lower() in ("1", "true", "yes")
