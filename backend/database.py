"""
Database initialization and connection helpers.
Uses SQLite with WAL journal mode for concurrent reads.
"""

import os
import sqlite3
from pathlib import Path

from backend.security import hash_password

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

    conn = get_db()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'readonly',
                created_at TEXT DEFAULT (datetime('now')),
                last_login TEXT
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                csrf_token TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                destination TEXT NOT NULL,
                remote_host TEXT DEFAULT '',
                ssh_port TEXT DEFAULT '',
                ssh_key TEXT DEFAULT '',
                flags TEXT DEFAULT '-avh',
                exclude_patterns TEXT DEFAULT '',
                bandwidth_limit TEXT DEFAULT '',
                custom_flags TEXT DEFAULT '',
                schedule_cron TEXT DEFAULT '',
                schedule_enabled INTEGER DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS job_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'running',
                started_at TEXT DEFAULT (datetime('now')),
                finished_at TEXT,
                exit_code INTEGER,
                bytes_transferred INTEGER DEFAULT 0,
                files_transferred INTEGER DEFAULT 0,
                total_size INTEGER DEFAULT 0,
                log_file TEXT,
                error_message TEXT
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                action TEXT NOT NULL,
                target_type TEXT,
                target_id TEXT,
                details TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)

        # Add csrf_token column to existing sessions table if missing
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(sessions)").fetchall()]
        if "csrf_token" not in cols:
            conn.execute("ALTER TABLE sessions ADD COLUMN csrf_token TEXT DEFAULT ''")
            conn.commit()

        # Seed default admin (admin/admin) when DB is empty
        row = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()
        if row["c"] == 0:
            pw_hash = hash_password("admin")
            conn.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                ("admin", pw_hash, "admin"),
            )
            conn.commit()
    finally:
        conn.close()


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
        conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")
        conn.commit()
    finally:
        conn.close()
