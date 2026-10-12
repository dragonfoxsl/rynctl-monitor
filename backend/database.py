"""
Database initialization and connection helpers.
Uses SQLite with WAL journal mode for concurrent reads.
"""

import logging
import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

from backend.security import hash_password

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths — honor explicit RYNCTL_DATA_DIR, otherwise prefer /data in Docker
# and fall back to ./data locally.
# ---------------------------------------------------------------------------

_configured_data_dir = os.environ.get("RYNCTL_DATA_DIR")
if _configured_data_dir:
    DATA_DIR = Path(_configured_data_dir)
else:
    default_data_dir = Path("/data")
    DATA_DIR = default_data_dir if default_data_dir.exists() else Path(__file__).resolve().parent.parent / "data"

LOGS_DIR = DATA_DIR / "logs"
DB_PATH = DATA_DIR / "rynctl.db"
_maintenance_condition = threading.Condition()
_active_connections = 0
_maintenance_active = False


def _leave_connection():
    global _active_connections
    with _maintenance_condition:
        _active_connections -= 1
        if not _active_connections:
            _maintenance_condition.notify_all()


class _Connection(sqlite3.Connection):
    def close(self):
        if getattr(self, "_holds_maintenance_lock", False):
            self._holds_maintenance_lock = False
            try:
                super().close()
            finally:
                _leave_connection()


@contextmanager
def maintenance_boundary():
    """Exclude all application DB connections during database replacement."""
    global _maintenance_active
    with _maintenance_condition:
        while _maintenance_active:
            _maintenance_condition.wait()
        _maintenance_active = True
        while _active_connections:
            _maintenance_condition.wait()
    try:
        yield
    finally:
        with _maintenance_condition:
            _maintenance_active = False
            _maintenance_condition.notify_all()


def get_db() -> sqlite3.Connection:
    """Return a new SQLite connection with Row factory and WAL mode."""
    global _active_connections
    with _maintenance_condition:
        while _maintenance_active:
            _maintenance_condition.wait()
        _active_connections += 1
    conn = None
    try:
        conn = sqlite3.connect(str(DB_PATH), timeout=10, factory=_Connection)
        conn._holds_maintenance_lock = True
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
    except Exception:
        if conn is not None:
            conn.close()
        else:
            _leave_connection()
        raise
    return conn


def init_db():
    """Create tables and seed the default admin user if needed."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_db()
    try:
        prepare_database(conn)
    finally:
        conn.close()

    logger.info("Database initialized at %s", DB_PATH)


def prepare_database(conn: sqlite3.Connection) -> None:
    """Apply the current schema and migrations to an open database."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    conn.executescript(schema_path.read_text(encoding="utf-8"))

    _migrate_column(conn, "sessions", "csrf_token", "TEXT DEFAULT ''")
    _migrate_column(conn, "jobs", "tags", "TEXT DEFAULT ''")
    _migrate_column(conn, "jobs", "retry_max", "INTEGER DEFAULT 0")
    _migrate_column(conn, "jobs", "retry_delay", "INTEGER DEFAULT 30")
    _migrate_column(conn, "jobs", "max_runtime", "INTEGER DEFAULT 0")
    _migrate_column(conn, "job_runs", "attempt", "INTEGER DEFAULT 1")
    _migrate_column(conn, "users", "failed_login_attempts", "INTEGER DEFAULT 0")
    _migrate_column(conn, "users", "lockout_until", "TEXT")

    conn.execute("CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id, id DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)")

    row = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()
    if row["c"] == 0:
        from backend.config import ADMIN_PASSWORD

        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ("admin", hash_password(ADMIN_PASSWORD), "admin"),
        )
        logger.info("Seeded admin user")
    conn.commit()


def validate_database_schema(conn: sqlite3.Connection) -> None:
    """Reject databases missing columns required by the current schema."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    expected = sqlite3.connect(":memory:")
    try:
        expected.executescript(schema_path.read_text(encoding="utf-8"))
        tables = ("users", "sessions", "jobs", "job_runs", "audit_log")
        for table in tables:
            expected_columns = {row[1] for row in expected.execute(f"PRAGMA table_info({table})")}
            actual_columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
            missing = expected_columns - actual_columns
            if missing:
                raise ValueError(f"{table} missing column(s): {', '.join(sorted(missing))}")
    finally:
        expected.close()


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


def prune_old_runs(retention_days: int) -> int:
    """Delete job_runs finished more than retention_days ago and remove their
    log files. retention_days <= 0 disables pruning (returns 0)."""
    if retention_days <= 0:
        return 0

    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, log_file FROM job_runs "
            "WHERE finished_at IS NOT NULL "
            "AND finished_at < datetime('now', ?)",
            (f"-{int(retention_days)} days",),
        ).fetchall()
        if not rows:
            return 0

        for r in rows:
            log_file = r["log_file"]
            if log_file:
                try:
                    Path(log_file).unlink(missing_ok=True)
                except OSError:
                    pass

        ids = [r["id"] for r in rows]
        conn.execute(
            f"DELETE FROM job_runs WHERE id IN ({','.join('?' * len(ids))})", ids
        )
        conn.commit()
        logger.info("Pruned %d job run(s) older than %d days", len(ids), retention_days)
        return len(ids)
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
