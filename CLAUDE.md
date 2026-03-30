# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A self-hosted web UI for managing, scheduling, and monitoring rsync jobs on Linux servers. Full-stack app with Python FastAPI backend + Preact SPA frontend, running in Docker with SQLite persistence. Pairs with [rynctl.com](https://rynctl.com) (the command generator).

## Commands

### Docker (recommended)

```bash
docker compose up -d                # start app
docker compose down                 # stop
make build                          # build container
make frontend-build                 # build frontend in container
make backend-tests                  # run backend tests in container
make e2e-tests                      # run e2e tests in container
make verify                         # frontend-build + backend-tests + e2e-tests
```

### Local development (no Docker)

```bash
# Backend
pip install -r requirements.txt
python run.py                       # starts on localhost:8080

# Frontend
cd frontend
npm install
npm run build                       # outputs to static/dist/

# Tests
pip install -r requirements-dev.txt
pytest
```

## Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, APScheduler, SQLite (WAL mode)
- **Frontend**: Preact 10.29 + Preact Signals, Vite 8, hash-based routing
- **Container**: Docker multi-stage (Node 20 build → Python 3.12-slim prod)
- **CI**: GitHub Actions → GHCR (`ghcr.io/dragonfoxsl/rynctl-monitor`)

## Architecture

### Backend (`backend/`)

| File | Purpose |
|------|---------|
| `app.py` | FastAPI app, lifespan (init DB → recover jobs → start scheduler), CompressedStaticFiles, SPA catch-all |
| `config.py` | Env vars + `.env` file loading (singleton) |
| `database.py` | SQLite connection (WAL, foreign keys), schema init, ALTER TABLE migrations, admin seeding |
| `schema.sql` | DDL: users, sessions, jobs, job_runs, audit_log (with CASCADE deletes) |
| `security.py` | PBKDF2-SHA256 (100k iterations), 64-char hex session tokens, CSRF tokens, role checks |
| `middleware.py` | RateLimitMiddleware (per-IP sliding window), CSRFMiddleware, RequestLoggingMiddleware |
| `rsync.py` | `build_rsync_command()`, `parse_rsync_stats()`, `run_rsync_job()` (subprocess + timeout + retry) |
| `job_runner.py` | Thread-safe queue + single worker thread, `enqueue_job()`, prevents duplicate/concurrent runs |
| `scheduler.py` | APScheduler cron triggers, `schedule_job()`, `load_schedules()` on startup |
| `models.py` | Pydantic request models (LoginRequest, JobPayload, SSHTestRequest, BrowseRequest, etc.) |
| `metrics.py` | Prometheus-compatible exporter (counters, gauges, histograms, thread-safe) |
| `notifications.py` | Webhook POST on job success/failure (configurable) |
| `validation.py` | Cron validation (via APScheduler), path normalization against BROWSE_ROOTS whitelist |
| `time_utils.py` | UTC datetime helpers (`utc_now()`, `format_db_timestamp()`, `parse_db_timestamp()`) |
| `logging_config.py` | Structured logging to stdout, quiets APScheduler/Uvicorn noise |

### Backend Routes (`backend/routes/`)

| Route file | Endpoints |
|------------|-----------|
| `auth.py` | POST login/logout, GET me/csrf — session cookie auth, account lockout (5 failures → 15min) |
| `jobs.py` | CRUD + run trigger + preview + per-job runs — joins latest run status, supports tag filtering |
| `runs.py` | GET recent runs (25), GET run log (50KB cap, tail if larger) |
| `stats.py` | Dashboard: totals, success rate, 7-day daily breakdown |
| `users.py` | Admin CRUD — password strength validation (8+ chars, mixed case + digit) |
| `transfer.py` | SSH test, file browser (local with BROWSE_ROOTS whitelist / remote via SSH ls), job export/import, audit log |
| `crontab.py` | Scan system crontab for rsync lines, import as jobs |
| `backup.py` | Download/restore SQLite DB (creates safety backup before restore) |
| `metrics_route.py` | GET /metrics and /api/metrics — Prometheus text format |
| `health.py` | GET /api/health — checks DB connectivity + scheduler status |

### Frontend (`frontend/src/`)

| File/Dir | Purpose |
|----------|---------|
| `App.jsx` | SPA root — session restore via GET /api/auth/me, hash-based routing, admin page guards |
| `lib/api.js` | Fetch wrapper with CSRF token management (auto-fetched on first mutation) |
| `lib/store.js` | Preact Signals: user, page, jobs, stats, runs, modal, theme (dark/light, localStorage) |
| `lib/utils.js` | formatBytes, timeAgo, describeCron (5-field → English), buildRsyncCommand, escapeHtml |
| `lib/flags.js` | 17 rsync flags with descriptions, DEFAULT_FLAGS: [-a, -v, -h] |
| `lib/icons.jsx` | SVG icon components |
| `pages/Login.jsx` | Username/password form |
| `pages/Dashboard.jsx` | 4 stat cards + job performance chart + recent runs |
| `pages/Jobs.jsx` | Job table with search/filter/sort, actions (run/edit/clone/delete) |
| `pages/CreateJob.jsx` | Two-column job form with live command preview, file browser, cron description |
| `pages/Runs.jsx` | Run history table with log viewer modal |
| `pages/Users.jsx` | User management table (admin only) |
| `pages/Settings.jsx` | SSH test, import/export, crontab scan, backup/restore (admin only) |
| `components/` | Sidebar, JobModal, UserModal, StatusBadge, SearchInput, Toast, ConfirmDialog |

Built assets → `static/dist/`, served by FastAPI with Brotli/Gzip content negotiation.

### Rsync Execution Flow

1. `enqueue_job(job_id)` → checks not already running/queued → adds to `_queue`
2. Worker thread dequeues → `run_rsync_job(job_id)`
3. Creates `job_runs` row (status=running) with thread lock
4. `build_rsync_command()` → `subprocess.Popen` with stdout/stderr capture
5. `communicate(timeout=max_runtime)` → parse stats → update row (success/failed)
6. If failed + retry configured → re-enqueue with attempt count
7. Send webhook if configured
8. Log to `{DATA_DIR}/logs/job_{id}_{timestamp}.log`

Exit codes: 0=success, -1=exception, -2=timeout, -3=stale/interrupted

### Database Schema (SQLite)

| Table | Key columns |
|-------|------------|
| `users` | id, username, password_hash, role (admin/rsync/readonly), failed_login_attempts, lockout_until |
| `sessions` | token (PK, 64-char hex), user_id, csrf_token, expires_at |
| `jobs` | id, name, source, destination, remote_host, ssh_port/key, flags, exclude_patterns, bandwidth_limit, custom_flags, tags, schedule_cron/enabled, retry_max/delay, max_runtime |
| `job_runs` | id, job_id, status, attempt, started/finished_at, exit_code, bytes/files_transferred, total_size, log_file, error_message |
| `audit_log` | id, user_id, username, action, target_type/id, details, created_at |

Schema auto-applied on first startup. New columns added via `ALTER TABLE IF NOT EXISTS` pattern in `database.py`. Default admin `admin/admin` seeded if DB is empty.

### Roles

| Role | View | Run jobs | Create/Edit/Delete | Manage users |
|------|------|----------|-------------------|--------------|
| `admin` | Yes | Yes | Yes | Yes |
| `rsync` | Yes | Yes | Yes | No |
| `readonly` | Yes | No | No | No |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RYNCTL_PORT` | `8080` | HTTP port |
| `RYNCTL_SECRET` | `change-me` | Session signing key (**change in production**) |
| `RYNCTL_DATA_DIR` | `/data` | SQLite DB + logs directory |
| `RYNCTL_LOG_LEVEL` | `INFO` | Python log level |
| `RYNCTL_RATE_LIMIT_RPM` | `120` | API rate limit per IP |
| `RYNCTL_SESSION_DAYS` | `7` | Session token expiry |
| `RYNCTL_MAX_LOGIN_ATTEMPTS` | `5` | Lockout threshold |
| `RYNCTL_LOCKOUT_MINUTES` | `15` | Lockout duration |
| `RYNCTL_RETRY_MAX` | `0` | Default job retry count |
| `RYNCTL_RETRY_DELAY` | `30` | Seconds between retries |
| `RYNCTL_JOB_TIMEOUT` | `0` | Job timeout (0=disabled) |
| `RYNCTL_WEBHOOK_URL` | — | POST on job finish (empty=disabled) |
| `RYNCTL_WEBHOOK_EVENTS` | `failure` | `failure`, `success`, or `all` |
| `RYNCTL_BROWSE_ROOTS` | — | Comma-separated allowed local browse paths |
| `RYNCTL_METRICS` | `true` | Enable Prometheus `/api/metrics` |

## Security

- **Passwords**: PBKDF2-SHA256, 100k iterations, random 16-byte salt
- **Sessions**: 64-char hex tokens, HttpOnly cookies, SameSite=Lax
- **CSRF**: Separate per-session tokens, required on all mutations (except login)
- **Rate limiting**: Per-IP sliding window (60s), configurable RPM
- **Account lockout**: 5 failed attempts → 15min lockout
- **Path browsing**: Validated against BROWSE_ROOTS whitelist + symlink resolution
- **Subprocess**: rsync commands built from validated job data, `--stats` always appended

## Key Conventions

- All API routes prefixed with `/api`
- SQLite schema auto-migrates on startup via `database.py`
- Frontend built separately → `static/dist/` → served by FastAPI with Brotli/Gzip
- Hash-based routing (`#dashboard`, `#jobs`, etc.)
- Preact Signals for reactive state (no Redux)
- Forms use `document.getElementById()` pattern (not controlled components)
- CSS variables for theming (dark/light, accent colors)
- JetBrains Mono for code, Inter for UI text
- Middleware order: RequestLogging → RateLimit → CSRF (outermost first)
- Startup lifespan: init DB → recover interrupted runs → start scheduler → load cron schedules
- Remote origin: `git@github.com:dragonfoxsl/rynctl-monitor.git`
