# RynctlMonitor

Self-hosted web UI for managing rsync jobs on any Linux server. Companion to [rynctl.com](https://rynctl.com).

## Quick Start

```bash
docker compose up -d
```

Open `http://localhost:8080` — login with **admin / admin**.

## Features

- Create, edit, and schedule rsync jobs via web UI
- Cron-based scheduling with APScheduler
- Real-time command preview with flag toggles
- Run history with full log viewer
- System crontab scanner for existing rsync entries
- Role-based access control (admin / rsync / readonly)
- SQLite database — zero configuration

## Stack

- **Backend**: Python / FastAPI
- **Frontend**: Vanilla JS SPA (no build step)
- **Database**: SQLite
- **Container**: Docker

## Development

```bash
pip install -r requirements.txt
python -m backend.app
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RYNCTL_PORT` | `8080` | Server port |
| `RYNCTL_SECRET` | `change-me` | Session secret |

## Volumes

Mount host directories and SSH keys in `docker-compose.yml` to enable rsync access.
