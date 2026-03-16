# Rynctl Monitor

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

2. (Optional) Create a `.env` file to override defaults:

   ```bash
   RYNCTL_SECRET=your-random-secret-here
   RYNCTL_PORT=8080
   ```

3. Start the container:

   ```bash
   docker compose up -d
   ```

4. Open `http://localhost:8080` and log in with **admin / admin**. Change the password immediately.

#### Docker Compose file

The default `docker-compose.yml` creates a named volume for the database and logs. To let rsync reach host directories or use SSH keys, uncomment and edit the volume mounts:

```yaml
services:
  rynctl-monitor:
    build: .
    container_name: rynctl-monitor
    ports:
      - "${RYNCTL_PORT:-8080}:8080"
    volumes:
      - rynctl-data:/data
      # Mount host directories you want to sync:
      # - /home/data:/home/data:ro
      # - /backups:/backups
      # Mount SSH keys for remote rsync:
      # - ~/.ssh/id_rsa:/root/.ssh/id_rsa:ro
      # - ~/.ssh/known_hosts:/root/.ssh/known_hosts:ro
    environment:
      - RYNCTL_PORT=8080
      - RYNCTL_SECRET=${RYNCTL_SECRET:-change-me-to-a-random-secret}
    restart: unless-stopped

volumes:
  rynctl-data:
```

### Docker build (manual)

```bash
docker build -t rynctl-monitor .
docker run -d -p 8080:8080 \
  -v rynctl-data:/data \
  -e RYNCTL_SECRET=my-secret \
  --name rynctl-monitor \
  rynctl-monitor
```

The Dockerfile uses a two-stage build: Node 20 builds the Preact frontend with Vite, then the production image is based on Python 3.12-slim with rsync, openssh-client, and cron installed.

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

The frontend is a Preact SPA built with Vite. During development you can rebuild it with:

```bash
cd frontend
npm install
npm run build
```

Built assets are written to `static/dist/` and served by the FastAPI backend. There is no separate dev server — just rebuild and reload.

---

## Environment Variables

All settings are optional. Defaults are designed for a quick local start.

| Variable | Default | Description |
|---|---|---|
| `RYNCTL_PORT` | `8080` | HTTP port the server listens on |
| `RYNCTL_SECRET` | `change-me` | Secret key for signing session tokens — **change this in production** |
| `RYNCTL_DATA_DIR` | `/data` | Directory for the SQLite database and run logs. Falls back to `./data` if `/data` doesn't exist |
| `RYNCTL_LOG_LEVEL` | `INFO` | Python log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `RYNCTL_SESSION_DAYS` | `7` | Number of days before a session token expires |
| `RYNCTL_MAX_LOGIN_ATTEMPTS` | `5` | Failed login attempts before temporary lockout |
| `RYNCTL_LOCKOUT_MINUTES` | `15` | Lockout duration after exceeding max login attempts |
| `RYNCTL_RATE_LIMIT_RPM` | `120` | Maximum API requests per minute per IP |
| `RYNCTL_RETRY_MAX` | `0` | Default retry count for new jobs (0 = no retries) |
| `RYNCTL_RETRY_DELAY` | `30` | Default delay in seconds between retries |
| `RYNCTL_WEBHOOK_URL` | *(empty)* | URL to POST when a job finishes (leave empty to disable) |
| `RYNCTL_WEBHOOK_EVENTS` | `failure` | Which events trigger the webhook: `failure`, `success`, or `all` |
| `RYNCTL_METRICS` | `true` | Enable Prometheus metrics endpoint at `/api/metrics` |

You can also place these in a `.env` file in the project root — it is loaded automatically on startup.

---

## Roles and Permissions

| Role | Can view | Can run jobs | Can create/edit/delete jobs | Can manage users |
|---|---|---|---|---|
| `admin` | Yes | Yes | Yes | Yes |
| `rsync` | Yes | Yes | Yes | No |
| `readonly` | Yes | No | No | No |

The default `admin` account is created on first run with password `admin`. Change it after first login.

---

## Database

SQLite with WAL journal mode. The schema lives in [`backend/schema.sql`](backend/schema.sql) and is applied automatically on startup. Migrations for new columns are handled in `database.py` so existing databases are upgraded in place.

Tables: `users`, `sessions`, `jobs`, `job_runs`, `audit_log`.

---

## API Endpoints

All API routes are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate and receive a session token |
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
| POST | `/api/backup/restore` | Upload and restore a database backup |
| GET | `/api/metrics` | Prometheus-format metrics |
| GET | `/api/health` | Health check |

---

## Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, APScheduler, SQLite
- **Frontend**: Preact, Vite, JetBrains Mono
- **Container**: Docker multi-stage build (Node 20 + Python 3.12-slim)

## License

See [LICENSE](LICENSE).
