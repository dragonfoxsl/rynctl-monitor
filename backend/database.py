"""
Database initialization and connection helpers.
Uses SQLite with WAL journal mode for concurrent reads.
"""

import logging
import os
import sqlite3
from pathlib import Path

from backend.security import hash_password

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths — /data in Docker, ./data locally
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.environ.get("RYNCTL_DATA_DIR", "/data"))
if not DATA_DIR.exists():
    DATA_DIR = Path(__file__).resolve().parent.parent / "data"

LOGS_DIR = DATA_DIR / "logs"
DB_PATH = DATA_DIR / "rynctl.db"


def get_db() -> sqlite3.Connection:
    """Return a new SQLite connection with Row factory and WAL mode."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables and seed the default admin user if needed."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    # Load schema from external SQL file
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")

    conn = get_db()
    try:
        conn.executescript(schema_sql)

        # Schema migrations — add columns if missing on existing databases
        _migrate_column(conn, "sessions", "csrf_token", "TEXT DEFAULT ''")
        _migrate_column(conn, "jobs", "tags", "TEXT DEFAULT ''")
        _migrate_column(conn, "jobs", "retry_max", "INTEGER DEFAULT 0")
        _migrate_column(conn, "jobs", "retry_delay", "INTEGER DEFAULT 30")
        _migrate_column(conn, "job_runs", "attempt", "INTEGER DEFAULT 1")

        # Seed default admin (admin/admin) when DB is empty
        row = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()
        if row["c"] == 0:
            pw_hash = hash_password("admin")
            conn.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                ("admin", pw_hash, "admin"),
            )
            conn.commit()
            logger.info("Seeded default admin user (admin/admin)")
            logger.warning(
                "Default admin password is 'admin' — change it immediately "
                "after first login"
            )
    finally:
        conn.close()

    logger.info("Database initialized at %s", DB_PATH)


def _migrate_column(conn, table: str, column: str, col_type: str):
    """Add a column to a table if it doesn't already exist."""
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        conn.commit()
        logger.info("Migrated: added %s.%s", table, column)


def log_audit(user: dict | None, action: str, target_type: str = "", target_id: str = "", details: str = ""):
    """Insert an entry into the audit_log table."""
    user_id = user["id"] if user else None
    username = user["username"] if user else "system"
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO audit_log (user_id, username, action, target_type, target_id, details) VALUES (?,?,?,?,?,?)",
            (user_id, username, action, target_type, str(target_id), details),
        )
        conn.commit()
    finally:
        conn.close()


def cleanup_expired_sessions():
    """Delete all expired sessions."""
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")
        conn.commit()
        if cur.rowcount > 0:
            logger.info("Cleaned up %d expired sessions", cur.rowcount)
    finally:
        conn.close()
