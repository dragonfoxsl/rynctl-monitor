# rynctl-monitor Roadmap

> Feature roadmap and implementation plan for rynctl-monitor.
> Last updated: 2026-03-19

---

## Phase 1 — Core Functionality

| # | Feature | Scope | Status |
|---|---------|-------|--------|
| 1.1 | **WebSocket live job output** — Real-time streaming of rsync output while jobs are running, replacing polling | Backend (WebSocket endpoint) + Frontend (live log viewer) | Pending |
| 1.2 | **Per-job webhook configuration** — Each job can optionally have its own webhook URL and event triggers (success, failure, all), overriding the global webhook | DB schema migration + JobModal UI + rsync.py notification logic | Pending |
| 1.3 | **Dry-run mode** — `rsync --dry-run` button to preview what would be transferred before committing to a real sync | UI button on job card + backend endpoint returning parsed dry-run output | Pending |
| 1.4 | **Keyboard shortcuts** — Global shortcuts for common actions: `n` = new job, `r` = refresh, `/` = search, `Esc` = close modals | Frontend event listener | Pending |
| 1.5 | **Mobile responsive layout** — Responsive CSS so the app is usable on tablets and phones; collapsible sidebar, stacked tables on small screens | CSS media queries + layout refactor | Pending |

---

## Phase 2 — UX Improvements

| # | Feature | Scope | Status |
|---|---------|-------|--------|
| 2.1 | **Job groups / folders** — Organize jobs into named groups (e.g., by server, project, or environment) with collapsible sections in the job list | DB: `job_groups` table + UI: group selector in JobModal, grouped list view | Pending |
| 2.2 | **Bulk actions** — Select multiple jobs and run, pause, or delete them in one action | Jobs page: checkbox column, floating action bar | Pending |
| 2.3 | **Job history graphs** — Visual sparkline or bar chart showing transfer size and duration over the last N runs for each job | Frontend charting (lightweight, no heavy library) | Pending |
| 2.4 | **Dark / light theme toggle** — User-selectable theme with persistence; dark theme is current default | CSS variables + theme context + Settings page toggle | Pending |

---

## Phase 3 — Security & Operations

| # | Feature | Scope | Status |
|---|---------|-------|--------|
| 3.1 | **Encrypted SSH key storage** — Store SSH key paths encrypted at rest in the database using AES-256, decrypted only at job execution time | Backend crypto module + DB migration | Pending |
| 3.2 | **Session timeout configuration** — Expose session expiry duration in the Settings UI (admin only), persisted to config | Settings page UI + backend config endpoint | Pending |
| 3.3 | **Scheduled DB self-backup** — Automatic periodic SQLite backup to a configurable location with retention policy | Backend scheduler task + config options | Pending |
| 3.4 | **Multi-node support** — Register remote "agent" nodes and dispatch rsync jobs to run from different source servers, not just the host running the web UI | Major architecture: agent protocol, node registration, job routing | Pending |

---

## Phase 4 — Testing & CI

| # | Feature | Scope | Status |
|---|---------|-------|--------|
| 4.1 | **Expand Playwright E2E tests** — Full coverage of all UI flows: login, job CRUD, SSH toggle, dry-run, bulk actions, theme toggle, responsive breakpoints | tests/e2e/ test specs | Pending |
| 4.2 | **Python pytest unit tests** — API endpoint coverage with pytest: auth, jobs, runs, stats, users, webhooks, health | tests/unit/ with pytest + httpx | Pending |
| 4.3 | **CI pipeline** — GitHub Actions workflow: lint (ruff + eslint), run pytest, run Playwright, build Docker image on push/PR | .github/workflows/ci.yml | Pending |

---

## Completed Features (already implemented)

- Health check endpoint (`GET /api/health`)
- Global webhook notifications (configurable via env vars)
- Rate limiting middleware
- Audit logging (user actions tracked in `audit_log` table)
- SSH connection test button in job modal
- File browser (local + remote via SSH)
- Job import/export (JSON)
- Database backup/restore (download/upload)
- Cron schedule with plain English description
- Playwright test scaffolding
- Docker multi-stage build + GHCR publish workflow
- Role-based access control (admin / rsync / readonly)
- CSRF protection
- Login lockout after failed attempts

---

## Excluded

- **2FA / TOTP** — Not planned for this release
- **Prometheus metrics** — Removed from scope
