# Test Plan — rynctl-monitor

Comprehensive test plan for the rynctl-monitor full-stack application (FastAPI
backend + Preact SPA, SQLite, single in-process job runner). Covers automated
and manual testing across functional, security, accessibility, data-integrity,
execution-engine, performance, and operational dimensions.

Test case IDs are stable (`TC-<area>-<n>`) for traceability. Status tags:
**[auto]** covered by an automated test, **[manual]** manual only,
**[gap]** known gap / not yet implemented.

---

## 1. Strategy & scope

### 1.1 Test pyramid

| Layer | Tool | Location | Speed | What it proves |
|-------|------|----------|-------|----------------|
| Unit (backend) | pytest | `tests/unit/` | fast | pure logic, validation, security helpers, job-runner state |
| Integration (API) | Playwright `request` | `tests/e2e/*.spec.js` | medium | HTTP contract, auth, RBAC, DB side effects |
| Browser (UI) | Playwright + Chromium | `tests/e2e/ui-flows.spec.js` | slow | rendered SPA behavior, interactions, routing |
| Accessibility | axe-core | `tests/e2e/a11y.spec.js` | slow | WCAG 2 A/AA structural rules |
| Manual | this doc | §§ below | — | exploratory, visual, cross-browser, ops |

### 1.2 How to run

```bash
# Backend unit (host)
pip install -r requirements-dev.txt && pytest          # or: make backend-tests

# Full browser + API suite in Docker (no local Chrome required)
make e2e-tests
# If host port 8080 is busy, override for ALL compose commands:
export RYNCTL_PORT=8087
docker compose up -d rynctl-monitor
docker compose --profile tools run --rm e2e-tests
docker compose down

# Frontend build check
make frontend-build         # or: cd frontend && npm run build

# Everything
make verify                 # frontend-build + backend-tests + e2e-tests
```

### 1.3 Environments

- **Browsers:** Chromium (CI default). Firefox + WebKit via added Playwright projects (Docker image bundles all three).
- **Themes:** every visual case runs in **dark and light** (toggle persists in localStorage).
- **Viewports:** desktop (≥1280px) primary; ≥768px tablet for responsive checks (§13). The app is desktop-first by design.
- **Data states:** empty DB (fresh seed), small dataset, large dataset (≥500 jobs / ≥5k runs) for performance.

### 1.4 Entry / exit criteria

- **Entry:** code builds; `make frontend-build` and `make backend-tests` pass locally.
- **Exit (release):** §1.1 automated layers green; §3 RBAC matrix passes for all roles; §11 security cases pass; no open P0/P1 (§16 severity); known gaps tracked here are unchanged or reduced.

### 1.5 Severity

| Sev | Definition | Examples |
|-----|------------|----------|
| P0 | data loss, auth bypass, RCE, app won't start | rsync flag injection, session forgery |
| P1 | core flow broken, no workaround | can't create/run jobs, running status never updates |
| P2 | broken with workaround, or significant UX/a11y failure | no focus ring, fake control |
| P3 | minor/cosmetic | copy, spacing, awkward wording |

---

## 2. Coverage snapshot (current automated tests)

**Backend unit (`tests/unit/`, 44 tests, green on pytest 9):**
- Auth: login/me, CSRF enforcement, account lockout (5 fails), expired session.
- Auth hardening: `verify_password` roundtrip, signed-cookie issuance, tampered/unsigned cookie rejection, `Secure` flag, admin password from `RYNCTL_ADMIN_PASSWORD`.
- Jobs/transfer: CRUD + last-run join, invalid cron rejected, export/import roundtrip, browse-root enforcement, overlap/queue dedupe, stale-run recovery, timeout, ssh_port + dangerous-flag validation, retry re-enqueue directive.
- Middleware: rate-limiter idle-IP eviction.
- Scheduling: cron register/replace/unregister on create/update/delete.

**Playwright API:** auth, health, jobs CRUD + preview + runs + tags, stats.
**Playwright UI:** login, sidebar nav, theme toggle, health pill, job create→appears, ConfirmDialog Escape, icon-button names, keyboard switch.
**axe-core:** dashboard/jobs/runs/flags (serious+critical gate, `color-contrast` excluded — tracked §10 TC-A11Y-05).

---

## 3. Role-based access control (RBAC)

Three roles: `admin`, `rsync`, `readonly`. For each action verify **both** the UI
(control hidden/disabled) **and** the API (correct status for a direct call).

| TC | Action | admin | rsync | readonly | unauth |
|----|--------|:-----:|:-----:|:--------:|:------:|
| TC-RBAC-01 | GET dashboard/jobs/runs/stats | 200 | 200 | 200 | 401 |
| TC-RBAC-02 | POST /api/jobs/{id}/run | 200 | 200 | 403 | 401 |
| TC-RBAC-03 | POST/PUT/DELETE /api/jobs | 200 | 200 | 403 | 401 |
| TC-RBAC-04 | GET/POST/PUT/DELETE /api/users | 200 | 403 | 403 | 401 |
| TC-RBAC-05 | POST /api/ssh/test, /api/browse | 200 | 200 | per-policy | 401 |
| TC-RBAC-06 | GET /api/backup/download, POST /api/backup/restore | 200 | 403 | 403 | 401 |
| TC-RBAC-07 | GET /api/jobs/export, POST /api/jobs/import | export: all view; import: admin only | | | 401 |
| TC-RBAC-08 | GET /api/audit | admin | 403 | 403 | 401 |

- TC-RBAC-09 **[manual]** readonly UI: no Run/Edit/Delete/New buttons rendered; Users/Settings nav hidden.
- TC-RBAC-10 Privilege escalation: a `rsync` user cannot change their own role via `PUT /api/users/{self}` (403, not 200).

---

## 4. Authentication & session security

- TC-AUTH-01 **[auto]** Valid login → 200, sets `session_token` cookie: `HttpOnly`, `SameSite=Lax`, signed `token.signature`, `Secure` when `RYNCTL_SECURE_COOKIES=true`.
- TC-AUTH-02 **[auto]** Wrong password → 401 "Invalid credentials"; failed count increments.
- TC-AUTH-03 **[auto]** 5 failures → account locked 15 min (`RYNCTL_LOCKOUT_MINUTES`); correct password during lockout → 403 with minutes remaining.
- TC-AUTH-04 Lockout auto-clears after the window; successful login resets `failed_login_attempts` to 0.
- TC-AUTH-05 **[auto]** Expired session → 401 on next request; row deleted.
- TC-AUTH-06 **[auto]** Raw DB token used as cookie (no signature) → 401 (cannot be replayed).
- TC-AUTH-07 **[auto]** Tampered cookie signature → 401.
- TC-AUTH-08 Bearer token (`Authorization: Bearer <raw>`) still authenticates API clients (documented path).
- TC-AUTH-09 Logout deletes the session row and clears the cookie; the old token no longer authenticates.
- TC-AUTH-10 **[auto]** Password/CSRF comparisons are constant-time (`secrets.compare_digest`).
- TC-AUTH-11 Concurrent sessions: logging in twice yields two valid tokens; logout of one does not invalidate the other.
- TC-AUTH-12 `RYNCTL_SECRET` change invalidates all existing signed cookies (forces re-login) — expected on secret rotation.
- TC-AUTH-13 **[auto]** Fresh DB seeds admin from `RYNCTL_ADMIN_PASSWORD`; default `admin/admin` only when unset (logs a warning).

---

## 5. CSRF, rate limiting, headers

- TC-SEC-01 **[auto]** Mutation without `X-CSRF-Token` (cookie auth) → 403; with valid token → success.
- TC-SEC-02 CSRF exempt paths: `/api/auth/login`, `/api/health`, `/api/metrics`, `/metrics` accept POST/GET without a token.
- TC-SEC-03 CSRF token is per-session; a token from session A rejected on session B.
- TC-SEC-04 **[auto]** Rate limiter: exceeding `RYNCTL_RATE_LIMIT_RPM` in 60s → 429 with `Retry-After`.
- TC-SEC-05 **[auto]** Rate-limiter memory does not grow unbounded across distinct IPs (idle eviction).
- TC-SEC-06 Rate limit applies only to `/api/*`, not static assets.
- TC-SEC-07 **[gap]** Security response headers present on all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, a restrictive `Content-Security-Policy`, and `Strict-Transport-Security` when HTTPS. *Currently none are set — see §15.*
- TC-SEC-08 Middleware order observable: RequestLogging → RateLimit → CSRF (a 429 is logged; a CSRF 403 is rate-limited).

---

## 6. Input validation & injection

- TC-VAL-01 **[auto]** `ssh_port` non-numeric (`"22; rm -rf /"`) → 400; out-of-range (`70000`) → 400; valid `2222` → 200.
- TC-VAL-02 **[auto]** `flags`/`custom_flags` containing `-e`, `--rsh`, or `--rsync-path` → 400 "not allowed" (command-injection guard) on create, update, and import (import skips the bad job).
- TC-VAL-03 **[auto]** Invalid cron expression on a scheduled job → 400.
- TC-VAL-04 **[auto]** Path browse outside `RYNCTL_BROWSE_ROOTS` → 403 (symlink-resolved).
- TC-VAL-05 Required fields (name/source/destination) missing → 400.
- TC-VAL-06 `extra="forbid"` on `JobPayload`: unknown fields → 422.
- TC-VAL-07 Path traversal in browse (`../../etc`) normalized and rejected against the whitelist.
- TC-VAL-08 Rsync command argv is built as a list (no shell), so source/dest with spaces or `;` are passed literally, not interpreted — verify via `/preview`.
- TC-VAL-09 SQL injection attempts in search/tag/name params are parameterized (no error, treated as literal text).
- TC-VAL-10 XSS: a job name like `<img src=x onerror=...>` renders as text in the table, not executed (Preact escapes; verify `escapeHtml` paths).
- TC-VAL-11 Password strength on user create/update: <8 chars / no upper / no lower / no digit → 400.
- TC-VAL-12 Oversized inputs (very long name/exclude list) handled without 500.

---

## 7. Job execution engine (rsync.py / job_runner.py)

- TC-EXEC-01 **[auto]** Enqueue dedupe: second enqueue of a queued job → "queued"; of a running job → "running".
- TC-EXEC-02 **[auto]** Manual run while running → 409 "already running"; while queued → 409 "already queued".
- TC-EXEC-03 **[auto]** Timeout: a job exceeding `max_runtime` is killed, status `failed`, exit code `-2`, "Timed out" message.
- TC-EXEC-04 **[auto]** Retry: a failed job with `retry_max>0` returns a `RetryScheduled` directive and creates exactly one run row per attempt (no recursion/sleep on the worker).
- TC-EXEC-05 **[auto]** A failed job with no retries returns `None` (no directive).
- TC-EXEC-06 Retry actually re-runs after `retry_delay` via the runner timer; attempt counter increments to `retry_max` then stops.
- TC-EXEC-07 **[auto]** Startup recovery: a `running` run left by a crash is marked `failed`, exit code `-3`, "application restart".
- TC-EXEC-08 Successful run records bytes/files/total_size parsed from `--stats`; status `success`, exit 0.
- TC-EXEC-09 Exit codes mapped: 0 success, -1 exception, -2 timeout, -3 stale.
- TC-EXEC-10 Log file written to `{DATA_DIR}/logs/job_{id}_{ts}.log` with command, timestamps, attempt, output.
- TC-EXEC-11 Worker is single-threaded: two jobs enqueued run sequentially, never concurrently (verify run timestamps don't overlap).
- TC-EXEC-12 A retry delay does **not** block other queued jobs (regression for the recursive-sleep bug).
- TC-EXEC-13 `--stats` always appended even if user omits it.
- TC-EXEC-14 SSH transport: `ssh_port`/`ssh_key` render as a single `-e "ssh -p N -i K"` arg (verify `/preview`).
- TC-EXEC-15 Webhook fired on finish per `RYNCTL_WEBHOOK_EVENTS` (failure/success/all); 10s timeout; a webhook failure does not fail the job.
- TC-EXEC-16 **[gap]** Webhook URL pointing at an internal address (SSRF) — currently unrestricted (admin-trusted); document risk.

---

## 8. Scheduler (APScheduler)

- TC-SCH-01 **[auto]** Creating a job with `schedule_enabled=1` + valid cron registers a trigger.
- TC-SCH-02 **[auto]** Updating cron replaces the existing trigger (no duplicates).
- TC-SCH-03 **[auto]** Disabling the schedule (or clearing cron) unregisters the job.
- TC-SCH-04 **[auto]** Deleting a job unschedules it.
- TC-SCH-05 On startup, `load_schedules()` registers all enabled jobs from the DB.
- TC-SCH-06 A scheduled fire enqueues via the runner (not a direct thread) and respects dedupe.
- TC-SCH-07 Hourly `session_cleanup` job runs and deletes expired sessions.
- TC-SCH-08 Cron in server timezone (UTC) — verify next-run time matches `describeCron` and TZ assumptions.

---

## 9. Per-endpoint API contract

For each: happy path, not-found, unauthorized, malformed body.

- **Auth** — TC-API-AUTH: `POST /api/auth/login|logout`, `GET /api/auth/me|csrf`.
- **Jobs** — TC-API-JOB: `GET /api/jobs`(+`?tag=`), `GET /api/jobs/tags`, `POST /api/jobs`, `GET/PUT/DELETE /api/jobs/{id}`, `POST /api/jobs/{id}/run`, `GET /api/jobs/{id}/preview`, `GET /api/jobs/{id}/runs` (≤50).
- **Runs** — TC-API-RUN: `GET /api/runs/recent` (≤25), `GET /api/runs/{id}/log` (50KB cap, tail if larger; 404 if missing file).
- **Stats** — TC-API-STAT: `GET /api/stats` (totals, success rate, 7-day breakdown; correct with zero runs).
- **Users** — TC-API-USR: `GET/POST /api/users`, `PUT/DELETE /api/users/{id}` (no password hash leaked in responses).
- **Transfer** — TC-API-XFER: `POST /api/ssh/test`, `POST /api/browse`, `GET /api/jobs/export`, `POST /api/jobs/import`, `GET /api/audit`.
- **Crontab** — TC-API-CRON: `GET /api/crontab` (scan), `POST /api/crontab/import`.
- **Backup** — TC-API-BAK: `GET /api/backup/download` (valid SQLite file), `POST /api/backup/restore` (creates safety backup first; rejects non-SQLite upload).
- **Metrics/Health** — TC-API-OBS: `GET /metrics` & `/api/metrics` (Prometheus text), `GET /api/health` (`healthy`/`degraded` from db+scheduler).
- TC-API-99: every `/api/*` mutation requires CSRF; every read requires auth except exempt paths.

---

## 10. Frontend functional (by page)

**Login** — TC-UI-LOGIN-01 invalid creds error; -02 success → dashboard; -03 default-credentials hint shows only while password is default **[gap: always shown]**.

**Dashboard** — TC-UI-DASH-01 stat cards match `/api/stats`; -02 chart renders with data and with zero runs; -03 recent-runs link to logs; -04 **[gap]** live refresh (Dashboard does not poll yet).

**Jobs** — TC-UI-JOB-01 search/filter/tag/sort; -02 Run/Edit/Clone/Delete; -03 **[auto-partial]** running status updates without reload (5s poll); -04 skeleton on load; -05 teaching empty state; -06 **[auto]** health pill reflects `/api/health`.

**Create/Edit Job** — TC-UI-CJ-01 required fields; -02 live preview matches `/preview`; -03 cron → English + invalid blocked; -04 `--delete`→DESTRUCTIVE / `-n`→DRY RUN badge; -05 SSH section gated by toggle; -06 **[auto]** schedule toggle keyboard-operable switch; -07 file browser stays in browse roots; -08 **[gap]** unsaved-changes guard on cancel; -09 **[gap]** FileBrowser rows keyboard-navigable.

**Runs** — TC-UI-RUN-01 history renders + Refresh; -02 log viewer opens, 50KB cap; -03 skeleton; -04 poll keeps open log viewer open.

**Users** — TC-UI-USR-01 create (strength + dup 409); -02 edit/delete; -03 icon buttons have names.

**Settings** — TC-UI-SET-01 SSH test result; -02 export→import roundtrip (skips unsafe); -03 crontab scan→import; -04 backup download; -05 restore (safety backup).

**Crontab / Flags** — TC-UI-X-01 Flags page lists all 15 flags; -02 Crontab page renders **[gap: not in sidebar nav]**.

**Global** — TC-UI-G-01 theme toggle + persistence; -02 hash routing deep-links (`#jobs` loads jobs); -03 session restore on reload; -04 toast feedback (`role=status` aria-live).

---

## 11. Accessibility

Automated (axe, `a11y.spec.js`) + manual (keyboard, SR).

- TC-A11Y-01 **[auto]** `:focus-visible` ring on all interactive elements.
- TC-A11Y-02 **[auto-partial]** toggles are `role="switch"`, collapsibles `aria-expanded`; **[gap]** FileBrowser rows still `<div onClick>`.
- TC-A11Y-03 **[auto]** icon-only buttons have `aria-label` (Jobs/Runs/Users/logout); **[gap]** modal close `x` buttons.
- TC-A11Y-04 **[auto]** `ConfirmDialog` Escape + backdrop + `role="dialog"`; **[gap]** Job/User/FileBrowser modals lack Escape + focus trap + focus return.
- TC-A11Y-05 **[gap]** Color contrast AA: `--text-muted` raised, but the accent blue used for text and some pills still fail. **Excluded from the axe gate**; top remaining a11y item.
- TC-A11Y-06 **[auto]** `prefers-reduced-motion` suppresses animation.
- TC-A11Y-07 Toasts announced via `aria-live`.
- TC-A11Y-08 **[manual]** Full keyboard-only pass: every action reachable and operable without a mouse.
- TC-A11Y-09 **[manual]** Screen-reader pass (NVDA/VoiceOver) on login + create-job.
- TC-A11Y-10 Form inputs have associated `<label>`s (CreateJob uses `getElementById`; verify label association).

---

## 12. UI states & resilience

- TC-ST-01 **[auto-partial]** Loading skeletons on Jobs/Runs (not empty flash).
- TC-ST-02 Live status: running job resolves without reload (Jobs/Runs poll; Dashboard **[gap]**).
- TC-ST-03 Error: backend 500 / network drop surfaces a dismissable message **[gap: 3.5s auto-dismiss toast, no retry]**.
- TC-ST-04 **[gap]** Unsaved-changes guard on dirty forms.
- TC-ST-05 Session expiry mid-use → redirect to login (no infinite spinner).
- TC-ST-06 Slow `/api/jobs` (throttled) keeps skeleton until resolved; no layout shift.
- TC-ST-07 Empty states teach (jobs, runs, users) rather than "nothing here".

---

## 13. Cross-browser & responsive

- TC-XB-01 Chromium/Firefox/WebKit: login, create job, run, view log.
- TC-XB-02 **[gap]** ≤768px: fixed 240px sidebar + `repeat(4,1fr)` grids overflow; document as desktop-only or add breakpoints.
- TC-XB-03 Dark/light: no unreadable text, toggle persists across reload.
- TC-XB-04 Long content (huge log, 100 tags) does not break layout.

---

## 14. Data integrity & migrations

- TC-DATA-01 `ON DELETE CASCADE`: deleting a job removes its `job_runs`; deleting a user nulls/removes dependent rows per schema.
- TC-DATA-02 Fresh DB: schema applied, admin seeded, WAL + foreign_keys on.
- TC-DATA-03 Migration idempotency: starting against an older DB adds missing columns (`tags`, `retry_*`, `max_runtime`, `csrf_token`, `failed_login_attempts`, `lockout_until`, `attempt`) without data loss; re-running is a no-op.
- TC-DATA-04 Backup→restore roundtrip preserves all tables; restore creates a safety backup first; corrupt upload rejected.
- TC-DATA-05 Concurrent writes (a scheduled run + a manual run) don't corrupt under WAL; `BEGIN IMMEDIATE` reservation prevents double-run rows.
- TC-DATA-06 Audit log records login/logout, job create/update/delete/run, user create/update/delete with user + timestamp.
- TC-DATA-07 **[gap]** Retention: `job_runs` and `{DATA_DIR}/logs/` grow unbounded — no pruning. Verify behavior at scale; track adding retention.
- TC-DATA-08 Timestamps stored/compared in UTC; no TZ drift between `started_at`/`finished_at`.

---

## 15. Performance & scale

- TC-PERF-01 `GET /api/jobs` with 500 jobs (each with the latest-run subqueries) returns < 500 ms. **[gap]** No index on `job_runs(job_id)` — add and re-measure.
- TC-PERF-02 `GET /api/runs/recent` and per-job runs with 5k runs stay responsive.
- TC-PERF-03 Dashboard `/api/stats` 7-day aggregation under large `job_runs`.
- TC-PERF-04 Connection-per-request overhead (every call opens a new SQLite conn + re-runs PRAGMA) under sustained load — consider pooling/thread-local.
- TC-PERF-05 Rate limiter under burst (1000 IPs) — CPU/memory bounded (eviction).
- TC-PERF-06 Frontend bundle ~112 KB JS gzip ~28 KB; first paint acceptable; Brotli/Gzip negotiation served.
- TC-PERF-07 Large log retrieval capped at 50 KB (tail), not loaded whole into memory.

---

## 16. Observability & ops

- TC-OPS-01 `GET /api/health` returns `degraded` when DB unreachable or scheduler stopped.
- TC-OPS-02 `/metrics` exposes job run counters/gauges/histograms; values change after a run.
- TC-OPS-03 Structured logs to stdout; APScheduler/Uvicorn noise quieted; request log line per `/api/*` call.
- TC-OPS-04 **Single Uvicorn worker** required: starting with `--workers 2` duplicates scheduled runs / splits rate-limit state — document and verify the single-worker contract.
- TC-OPS-05 Docker healthcheck (`HEALTHCHECK` in Dockerfile) flips unhealthy when `/api/health` fails; compose `depends_on: service_healthy` gates e2e.
- TC-OPS-06 Volume persistence: DB + logs survive container restart on the `rynctl-data` volume.
- TC-OPS-07 Env defaults: app starts with no env set (warns on default `RYNCTL_SECRET`/admin password); honors all documented overrides.
- TC-OPS-08 Graceful shutdown: lifespan stops the runner and scheduler; an in-flight run is marked stale on next start (TC-EXEC-07).

---

## 17. Negative & edge cases

- TC-EDGE-01 Run a job whose source path does not exist → rsync non-zero → status `failed`, error captured.
- TC-EDGE-02 Delete a job mid-run (or while queued) — no orphaned run/queue entry.
- TC-EDGE-03 Import a malformed/empty export payload → skipped counts, no 500.
- TC-EDGE-04 Two admins edit the same job concurrently — last write wins, no corruption.
- TC-EDGE-05 Cron that never fires soon (e.g. `0 0 31 2 *`) registers without error.
- TC-EDGE-06 Unicode/emoji in job name, tags, log output — stored and rendered safely.
- TC-EDGE-07 Clock skew / DST around a scheduled fire (UTC mitigates).
- TC-EDGE-08 Disk full when writing a log / DB — surfaced as a failed run, not a crash.

---

## 18. Automation backlog (priority order)

1. **CI gate [gap]:** the GitHub Actions workflow only builds/publishes the image — it runs **no tests**. Add a job running `make backend-tests` + `make e2e-tests` on PRs. Highest leverage now that the suite exists.
2. Role-matrix API tests (§3) for `rsync` and `readonly`.
3. Security-header assertions (§5 TC-SEC-07) once headers are added.
4. UI specs for TC-UI-CJ-03 (cron+badge), TC-ST-04 (unsaved guard), TC-UI-DASH live refresh.
5. `@axe-core/playwright` on CreateJob + modal-open states once focus-trap + labels land; then re-enable `color-contrast`.
6. Visual-regression snapshots (dark/light per page) after the Button/Card/Metric component extraction.
7. Load test (TC-PERF-01/02) with seeded large dataset; add `job_runs(job_id)` index first.

---

## 19. Traceability

| Requirement / risk | Test cases |
|--------------------|-----------|
| Auth bypass / session forgery | TC-AUTH-01/06/07/10 |
| Command injection via rsync | TC-VAL-01/02/08, TC-EXEC-14 |
| RBAC enforcement | §3 all |
| Job runner correctness | §7 all |
| Schedule correctness | §8 all |
| Data loss on delete/restore | TC-DATA-01/04/05 |
| Accessibility (WCAG 2 AA) | §11 all |
| Live monitoring promise | TC-UI-JOB-03, TC-UI-RUN-04, TC-ST-02 |
| Deploy safety (single worker) | TC-OPS-04 |

---

## 20. Known gaps tracked (not yet closed)

1. **CI runs no tests** (§18.1) — top priority.
2. **No security headers** (TC-SEC-07).
3. **No DB index** on `job_runs(job_id)` (TC-PERF-01).
4. **No run/log retention** (TC-DATA-07).
5. **Color-contrast below AA** for accent text (TC-A11Y-05).
6. **Modal focus-trap / Escape / labels** (TC-A11Y-03/04).
7. **FileBrowser keyboard access** (TC-A11Y-02).
8. **Unsaved-changes guard**, **persistent error + retry**, **Dashboard live refresh** (§12).
9. **Responsive < 900px** (TC-XB-02).
10. **Fake "Sort by" control**, **domain copy mismatch** (UX, P2/P3).
