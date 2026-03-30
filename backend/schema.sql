-- rynctl-monitor database schema
-- SQLite with WAL journal mode for concurrent reads.
-- Executed on first startup to bootstrap all required tables.

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'readonly',
    failed_login_attempts INTEGER DEFAULT 0,
    lockout_until TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    last_login    TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    csrf_token TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS jobs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    source           TEXT NOT NULL,
    destination      TEXT NOT NULL,
    remote_host      TEXT DEFAULT '',
    ssh_port         TEXT DEFAULT '',
    ssh_key          TEXT DEFAULT '',
    flags            TEXT DEFAULT '-avh',
    exclude_patterns TEXT DEFAULT '',
    bandwidth_limit  TEXT DEFAULT '',
    custom_flags     TEXT DEFAULT '',
    tags             TEXT DEFAULT '',
    schedule_cron    TEXT DEFAULT '',
    schedule_enabled INTEGER DEFAULT 0,
    retry_max        INTEGER DEFAULT 0,
    retry_delay      INTEGER DEFAULT 30,
    max_runtime      INTEGER DEFAULT 0,
    created_by       INTEGER REFERENCES users(id),
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_runs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id            INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status            TEXT DEFAULT 'running',
    attempt           INTEGER DEFAULT 1,
    started_at        TEXT DEFAULT (datetime('now')),
    finished_at       TEXT,
    exit_code         INTEGER,
    bytes_transferred INTEGER DEFAULT 0,
    files_transferred INTEGER DEFAULT 0,
    total_size        INTEGER DEFAULT 0,
    log_file          TEXT,
    error_message     TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    username    TEXT,
    action      TEXT NOT NULL,
    target_type TEXT,
    target_id   TEXT,
    details     TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now'))
);
