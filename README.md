<h1 align="center">Rynctl Monitor</h1>

<p align="center">
  <a href="https://github.com/dragonfoxsl/rynctl-monitor/actions/workflows/docker-publish.yml"><img src="https://github.com/dragonfoxsl/rynctl-monitor/actions/workflows/docker-publish.yml/badge.svg" alt="Build"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0"/></a>
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?logo=python&logoColor=white" alt="Python 3.10+"/>
  <img src="https://img.shields.io/badge/FastAPI-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Docker-ready-2496ED.svg?logo=docker&logoColor=white" alt="Docker"/>
  <a href="https://github.com/dragonfoxsl/rynctl-monitor/pkgs/container/rynctl-monitor"><img src="https://img.shields.io/badge/GHCR-package-blue.svg?logo=github" alt="GHCR"/></a>
  <img src="https://img.shields.io/badge/SQLite-003B57.svg?logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Preact-673AB8.svg?logo=preact&logoColor=white" alt="Preact"/>
</p>

<p align="center">
  <a href="https://ko-fi.com/D5X721S5GY">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"/>
  </a>
</p>

<br>

A self-hosted web UI for managing, scheduling, and monitoring rsync jobs on Linux servers. Runs in Docker or standalone, pairs with [rynctl.com](https://rynctl.com).

---

## Features

- **Job management** — create, edit, delete, and run rsync jobs from the browser
- **Live command preview** — toggle rsync flags and see the full command update in real time
- **Cron scheduling** — schedule jobs with standard cron expressions; plain-English description shown inline
- **SSH connection testing** — test SSH connectivity to remote hosts directly from the job form
- **File browser** — browse local or remote (via SSH) directories to select source/destination paths
- **Run history & logs** — view every run's status, exit code, bytes transferred, and full log output
- **Crontab import** — scan the system crontab for existing rsync entries and import them as jobs
- **Retry on failure** — configure automatic retries with configurable delay per job
- **Webhook notifications** — POST to a URL on job failure, success, or both
- **Prometheus metrics** — expose `/api/metrics` for scraping job run counts and durations
- **Role-based access** — three roles: `admin` (full control), `rsync` (run/create jobs), `readonly` (view only)
- **Audit log** — every action (login, job create, run, delete) is logged with user and timestamp
- **Rate limiting** — configurable requests-per-minute limit to protect the API
- **Backup & restore** — export/import the SQLite database via the API
- **Session management** — token-based sessions with CSRF protection and automatic expiry cleanup
- **Brotli/Gzip compression** — pre-compressed frontend assets served automatically

---

## Quick Start

### Docker Compose (recommended)

1. Clone the repository:

   ```bash
   git clone https://github.com/dragonfoxsl/rynctl-monitor.git
   cd rynctl-monitor
   ```

2. Create a `.env` file with the two required credentials:

   ```bash
   cp .env.example .env
   # Replace both placeholder values before starting.
   openssl rand -hex 32
   ```

3. Start the container:

   ```bash
   docker compose up -d
   ```

4. Open `http://localhost:8080` and log in as `admin` with the configured password.

### Container-only workflow

If you do not want Python or Node installed on the host, you can run builds and tests entirely with Docker:

```bash
make build
make up
make frontend-build
make backend-tests
make e2e-tests
```

Or use Docker Compose directly:

```bash
docker compose build rynctl-monitor
docker compose up -d rynctl-monitor
docker compose exec -T -u 10001 rynctl-monitor sh -lc 'rm -rf /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && mkdir -p /tmp/rynctl-scheduler-src /tmp/rynctl-scheduler-dst && printf scheduler-proof > /tmp/rynctl-scheduler-src/proof.txt'
docker compose --profile tools run --rm frontend-build
docker compose --profile tools run --rm backend-tests
docker compose --profile tools run --rm e2e-tests
docker compose exec -T rynctl-monitor sh -lc 'test "$(cat /tmp/rynctl-scheduler-dst/proof.txt)" = "scheduler-proof"'
```

#### Docker Compose file

The default `docker-compose.yml` creates a named volume for the database and
logs. To let rsync reach host directories or use SSH keys, uncomment and edit
the example volume mounts in that file.

### Pre-built image (GHCR)

Use the pre-built image from GitHub Container Registry — no local build required:

```bash
docker run -d -p 8080:8080 \
  -v rynctl-data:/data \
  -e RYNCTL_SECRET=replace-with-at-least-32-random-characters \
  -e RYNCTL_ADMIN_PASSWORD=ReplaceWithStrong123 \
  --name rynctl-monitor \
  ghcr.io/dragonfoxsl/rynctl-monitor:latest
```

### Docker build (manual)

```bash
docker build -t rynctl-monitor .
docker run -d -p 8080:8080 \
  -v rynctl-data:/data \
  -e RYNCTL_SECRET=replace-with-at-least-32-random-characters \
  -e RYNCTL_ADMIN_PASSWORD=ReplaceWithStrong123 \
  --name rynctl-monitor \
  rynctl-monitor
```

The Dockerfile uses a two-stage build: Node 20 builds the Preact frontend with Vite, then the production image is based on Python 3.12-slim with rsync, openssh-client, and cron installed. The app process runs as the unprivileged `rynctl` user after the entrypoint prepares writable directories.

---

## Development (without Docker)

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend builds)
- rsync and openssh-client on the host

### Backend

```bash
pip install -r requirements.txt
python run.py
```

The server starts on `http://localhost:8080`. The SQLite database is created automatically in `./data/rynctl.db` on first run.

### Frontend

The frontend is a Preact SPA built with Vite. During development you need a frontend build present in `static/dist/`. Rebuild it with:

```bash
cd frontend
npm ci --legacy-peer-deps
npm run build
```

Built assets are written to `static/dist/` and served by the FastAPI backend. There is no separate dev server — just rebuild and reload.

### Tests

For backend unit tests:

```bash
pip install -r requirements-dev.txt
pytest
```

To run those tests in containers only:

```bash
make backend-tests
```

The backend test suite includes regression coverage for authentication cookies,
CSRF protection, rsync option validation, crontab imports, backup integrity
checks, scheduler behavior, and security headers.

For full local verification:

```bash
make verify
```

`make e2e-tests` prepares temporary scheduler fixture directories in the app
container, runs the Dockerized Playwright browser/API suite, and verifies that a
scheduled rsync job copied the expected file.

---

## Environment Variables

`RYNCTL_SECRET` and `RYNCTL_ADMIN_PASSWORD` are required. Startup requires a
32-character secret and an admin password with at least eight characters,
uppercase, lowercase, and a number.

| Variable | Default | Description |
|---|---|---|
| `RYNCTL_PORT` | `8080` | HTTP port the server listens on |
| `RYNCTL_SECRET` | *(required)* | HMAC key of at least 32 characters used to sign session cookies |
| `RYNCTL_ADMIN_PASSWORD` | *(required)* | Policy-compliant initial password for the seeded `admin` user (only used when the database is first created) |
| `RYNCTL_SECURE_COOKIES` | `false` | Set the `Secure` flag on the session cookie — enable when serving over HTTPS |
| `RYNCTL_DATA_DIR` | `/data` | Directory for the SQLite database and run logs. Falls back to `./data` if `/data` doesn't exist |
| `RYNCTL_LOG_LEVEL` | `INFO` | Python log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `RYNCTL_SESSION_DAYS` | `7` | Number of days before a session token expires |
| `RYNCTL_MAX_LOGIN_ATTEMPTS` | `5` | Failed login attempts before temporary lockout |
| `RYNCTL_LOCKOUT_MINUTES` | `15` | Lockout duration after exceeding max login attempts |
| `RYNCTL_RATE_LIMIT_RPM` | `120` | Maximum API requests per minute per IP |
| `RYNCTL_BROWSE_ROOTS` | *(empty)* | Optional comma-separated local directory roots allowed for `/api/browse`; when empty, local browsing is unrestricted |
| `RYNCTL_JOB_TIMEOUT` | `0` | Default maximum runtime for new jobs in seconds (0 = no timeout) |
| `RYNCTL_RUN_RETENTION_DAYS` | `0` | Prune job runs and their log files older than N days (0 = keep forever) |
| `RYNCTL_WEBHOOK_URL` | *(empty)* | URL to POST when a job finishes (leave empty to disable) |
| `RYNCTL_WEBHOOK_EVENTS` | `failure` | Which events trigger the webhook: `failure`, `success`, or `all` |
| `RYNCTL_METRICS` | `true` | Enable Prometheus metrics endpoint at `/api/metrics` |

You can also place these in a `.env` file in the project root — it is loaded automatically on startup.

Use `.env.example` as the starting point and replace both `replace-with-...`
placeholders before startup.

---

## Production Operations

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for the production checklist,
including container hardening, backup/restore drill, Prometheus scrape example,
Docker log rotation, release, and rollback commands.

The GitHub workflows run:

- backend unit tests,
- frontend dependency audit and production build,
- Playwright test package audit,
- Dockerized browser/API e2e tests,
- scheduled-job smoke verification before release image publishing.

### Validation and backup safety

Job payloads are validated before storage and before import. Rsync options that
can execute arbitrary commands (`-e`, `--rsh`, `--rsync-path`) are rejected in
normal job forms, JSON imports, and crontab imports. Path-like values that would
be interpreted as command-line options are rejected.

Database backup downloads use SQLite's backup API to create a consistent
snapshot. Restore uploads are size-limited, checked for a SQLite header, verified
with `PRAGMA integrity_check`, and must include the expected Rynctl tables. The
live database is then replaced atomically while application database connections
are excluded; new connections use the restored database immediately.

---

## Roles and Permissions

| Role | Can view | Can run jobs | Can create/edit/delete jobs | Can manage users |
|---|---|---|---|---|
| `admin` | Yes | Yes | Yes | Yes |
| `rsync` | Yes | Yes | Yes | No |
| `readonly` | Yes | No | No | No |

The `admin` account is created on first run with the required
`RYNCTL_ADMIN_PASSWORD`. The final admin cannot be demoted or deleted, and an
admin cannot delete their own account.

> **Deployment note:** the in-process job runner (a single worker thread) and the in-memory rate limiter are **per-process**. Run the app with a single Uvicorn worker. Running multiple workers would duplicate scheduled job execution and split rate-limit state across processes.

---

## Database

SQLite with WAL journal mode. The schema lives in [`backend/schema.sql`](backend/schema.sql) and is applied automatically on startup. Migrations for new columns are handled in `database.py` so existing databases are upgraded in place.

Tables: `users`, `sessions`, `jobs`, `job_runs`, `audit_log`.

---

## API Endpoints

All API routes are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate and set the session cookie |
| POST | `/api/auth/logout` | Invalidate the current session |
| GET | `/api/auth/me` | Return the current user |
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create a new job |
| PUT | `/api/jobs/:id` | Update a job |
| DELETE | `/api/jobs/:id` | Delete a job |
| POST | `/api/jobs/:id/run` | Trigger a job run |
| GET | `/api/runs` | List recent runs (with optional `job_id` filter) |
| GET | `/api/runs/:id/log` | Stream the log file for a run |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/crontab` | List rsync entries from the system crontab |
| POST | `/api/crontab/import` | Import a crontab entry as a job |
| GET | `/api/users` | List users (admin only) |
| POST | `/api/users` | Create a user (admin only) |
| DELETE | `/api/users/:id` | Delete a user (admin only) |
| POST | `/api/ssh/test` | Test SSH connectivity to a remote host |
| POST | `/api/browse` | Browse local or remote directory contents |
| GET | `/api/backup` | Download the SQLite database |
| GET | `/api/backup/download` | Download the SQLite database |
| POST | `/api/backup/restore` | Upload and restore a database backup |
| GET | `/api/metrics` | Prometheus-format metrics |
| GET | `/metrics` | Prometheus-format metrics (legacy path) |
| GET | `/api/health` | Health check |

---

## Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, APScheduler, SQLite
- **Frontend**: Preact, Vite, JetBrains Mono
- **Container**: Docker multi-stage build (Node 20 + Python 3.12-slim)

## License

See [LICENSE](LICENSE).
