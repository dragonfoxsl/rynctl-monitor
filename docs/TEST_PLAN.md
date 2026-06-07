# Test Plan — rynctl-monitor

Scope: the Preact SPA UI and the FastAPI backend it depends on. This plan documents
what is already covered by automation, the manual test cases for each UI flow, the
accessibility / state gaps surfaced by the design critique, and regression cases for
recent security hardening.

## 1. Test layers & how to run them

| Layer | Tool | Location | Command |
|-------|------|----------|---------|
| Backend unit | pytest | `tests/unit/` | `pip install -r requirements-dev.txt && pytest` (or `make backend-tests`) |
| API / e2e | Playwright | `tests/e2e/` | `make e2e-tests` (builds image, starts app, runs specs) |
| Browser UI | Playwright | `tests/e2e/ui-flows.spec.js` | login, theme toggle, health pill, job create/run, ConfirmDialog Escape, switch a11y |
| Accessibility | axe-core | `tests/e2e/a11y.spec.js` | axe scan of dashboard/jobs/runs/flags (serious+critical gate) |
| UI smoke | Playwright | `tests/e2e/ui.spec.js` | login + nav visibility |
| Manual UI | — | this doc, §4–§6 | run against `docker compose up -d` on `http://localhost:8080` |

**Running the full browser suite in Docker (no local Chrome needed):**
The Playwright image (`Dockerfile.test` `e2e-tests` stage) bundles the browsers, so
`make e2e-tests` runs everything in-container. If host port 8080 is taken by another
service, override the host port for all compose commands:

```bash
export RYNCTL_PORT=8087
docker compose up -d rynctl-monitor
docker compose --profile tools run --rm e2e-tests   # connects over the Docker network on :8080
docker compose down
```

The axe scan **excludes `color-contrast`** (a known design-token debt; see §5 TC-A5);
all other serious/critical violations fail the build. Browsers in CI: Chromium (the
Docker image also carries Firefox/WebKit if the config adds projects).

## 2. Existing automated coverage (baseline)

**Backend unit (`tests/unit/`, currently green):**
- Auth: login/me, CSRF enforcement on mutations, lockout after 5 failures, expired-session rejection.
- Auth hardening: `verify_password` round-trip, signed-cookie issuance, tampered/unsigned cookie rejection, `Secure` flag honored, admin password seeded from `RYNCTL_ADMIN_PASSWORD`.
- Jobs/transfer: CRUD + last-run join, invalid cron rejected, export/import round-trip, browse-root enforcement, overlap/queue dedupe, stale-run recovery, timeout handling, **ssh_port + dangerous-flag validation**, **retry re-enqueue directive**.
- Middleware: rate-limiter idle-IP eviction.
- Scheduling: cron register/replace/unregister on create/update/delete.

**Playwright API (`tests/e2e/*.spec.js`):** auth, health, jobs CRUD + preview + runs + tags, stats.

**Gap:** UI *interaction* coverage is thin (login + nav visibility only). §4–§6 below are mostly manual today and are candidates for new Playwright UI specs.

## 3. Roles & permissions matrix (test each role)

Verify the UI hides/disables actions and the API returns 403 for each forbidden action.

| Action | admin | rsync | readonly |
|--------|:-----:|:-----:|:--------:|
| View dashboard/jobs/runs | ✅ | ✅ | ✅ |
| Run a job | ✅ | ✅ | ⛔ 403 |
| Create/edit/delete job | ✅ | ✅ | ⛔ 403 |
| Manage users | ✅ | ⛔ 403 | ⛔ 403 |
| Settings (SSH/import/backup) | ✅ | ⛔ | ⛔ |

Pass: forbidden controls are not rendered (or disabled) **and** direct API calls return 403.

## 4. Per-page functional test cases

### Login
- TC-L1: empty username/password → form blocks submit / shows error.
- TC-L2: wrong password → "Invalid credentials"; 5 wrong → lockout message with minutes.
- TC-L3: correct creds → lands on Dashboard; session cookie is set `HttpOnly`, signed (`token.signature`), and `Secure` when `RYNCTL_SECURE_COOKIES=true`.
- TC-L4: "Default credentials: admin/admin" hint shows only while default password is unchanged.

### Dashboard
- TC-D1: stat cards reflect real totals/success-rate vs `/api/stats`.
- TC-D2: 7-day chart renders with data and with **zero** runs (empty state, no broken axis).
- TC-D3: recent-runs list links to the run log.

### Jobs
- TC-J1: search/filter/sort narrow the table correctly; tag filter works.
- TC-J2: Run/Edit/Clone/Delete each work; Delete shows confirm; Clone prefills a copy.
- TC-J3: running a job shows "running" status **and updates to success/failed without manual reload** (see GAP-1).
- TC-J4: empty state (no jobs) teaches how to create one, not just "nothing here."

### Create/Edit Job
- TC-C1: required fields (name/source/destination) enforced.
- TC-C2: live command preview matches `/api/jobs/{id}/preview` output.
- TC-C3: cron field — valid expr shows English description; invalid expr blocked with message.
- TC-C4: `--delete` flag flips the summary badge to DESTRUCTIVE; `-n` → DRY RUN.
- TC-C5: SSH section is hidden until the remote toggle is on.
- TC-C6: `ssh_port` rejects non-numeric / out-of-range (1–65535) — surfaced as a field error, not a generic 400 toast.
- TC-C7: `custom_flags`/`flags` containing `-e`, `--rsh`, or `--rsync-path` are rejected with the "not allowed" message.
- TC-C8: file browser stays within `RYNCTL_BROWSE_ROOTS`; path outside → 403 handled gracefully.

### Runs
- TC-R1: run history table renders; Refresh re-fetches.
- TC-R2: log viewer opens, shows log, caps at 50KB (tail) for large logs.

### Users (admin)
- TC-U1: create user — password strength enforced (8+, mixed case, digit); duplicate username → 409.
- TC-U2: edit role/password/username; delete user.

### Settings (admin)
- TC-S1: SSH test returns success/failure clearly.
- TC-S2: export jobs → import round-trips; import **skips** jobs with unsafe ssh_port/flags (count as skipped).
- TC-S3: crontab scan lists rsync lines; import creates jobs.
- TC-S4: DB backup downloads; restore creates a safety backup first.

### Crontab / Flags
- TC-X1: Flags reference page lists all 15 flags with descriptions.
- TC-X2: Crontab page reachable and rendered (note: not currently in the sidebar — confirm intended).

## 5. Accessibility & keyboard (gaps from design critique — currently FAILING, treat as regression targets)

- TC-A1: **Focus visibility** — every interactive element shows a `:focus-visible` ring. *Done (global rule in `index.css`); covered by axe.*
- TC-A2: **Custom controls** — schedule/SSH toggles are `role="switch"` and keyboard-operable; collapsible headers expose `aria-expanded`. *Done; `ui-flows.spec.js` asserts the switch via keyboard. Remaining: FileBrowser rows still `<div onClick>` (see §9).*
- TC-A3: **Accessible names** — icon-only buttons (Run/Edit/Clone/Delete, log viewer, Users edit/delete, logout) have `aria-label`. *Done for Jobs/Runs/Users; `ui-flows.spec.js` asserts Jobs actions. Remaining: modal close `x` buttons.*
- TC-A4: **Modal dismissal** — `ConfirmDialog` closes on `Escape` and backdrop. *Done; `ui-flows.spec.js` asserts Escape. Remaining: JobModal/UserModal/FileBrowser Escape + focus trap.*
- TC-A5: **Contrast** — text meets WCAG AA 4.5:1. *Partial: `--text-muted` raised to AA, but the accent blue used for text and some pills still fail. **Excluded from the axe gate** in `a11y.spec.js`; tracked here as the top remaining a11y item.*
- TC-A6: **Reduced motion** — `prefers-reduced-motion: reduce` suppresses animations. *Done (global media query).*

The axe scan (`a11y.spec.js`) automates TC-A1/A3/A4 (and structural rules) on the read pages, failing on any serious/critical violation except `color-contrast`.

## 6. UI state & resilience cases

- TC-ST1: **Loading** — tables show skeleton rows, not an empty flash then pop-in. *Done (Jobs/Runs).*
- TC-ST2: **Live status** — a running job updates without a manual reload. *Done: Jobs/Runs poll every 5s while a run is in progress (Dashboard not yet).*
- TC-ST3: **Error** — backend 500 / network drop surfaces a dismissable error with a retry path, not a 3.5s auto-vanishing toast.
- TC-ST4: **Unsaved changes** — navigating away from a dirty Create/Edit form prompts before discarding. *GAP: no guard.*
- TC-ST5: **Session expiry** — expired/invalid cookie redirects to login on next action (no infinite spinner).

## 7. Cross-browser & responsive

- TC-B1: Chromium / Firefox / WebKit — login, create job, run, view log all work.
- TC-B2: ≤768px width — sidebar collapses, tables remain usable (horizontal scroll or responsive columns), modals fit viewport.
- TC-B3: dark and light themes — no unreadable text, no broken contrast, toggle persists across reload (localStorage).

## 8. Security regression cases (from this session's hardening)

- TC-SEC1: a raw DB session token used directly as a cookie (no signature) → 401 (cannot be replayed).
- TC-SEC2: tampered cookie signature → 401.
- TC-SEC3: CSRF token missing/invalid on a mutation → 403; valid token → success.
- TC-SEC4: password and CSRF comparisons use constant-time compare (covered by unit tests; no behavior change expected).
- TC-SEC5: a retry-configured job that fails re-enqueues a retry **without blocking** other queued jobs (the worker thread is not stalled by `sleep`).
- TC-SEC6: rate limiter does not leak memory across many distinct client IPs (idle entries evicted).
- TC-SEC7: `RYNCTL_ADMIN_PASSWORD` set on a fresh DB → admin/admin fails, the configured password works.
- TC-SEC8: single-worker deployment — confirm scheduled jobs run exactly once (do not run multi-worker Uvicorn).

## 9. Suggested automation backlog (priority order)

1. Playwright UI specs for TC-J3 (live status), TC-C3/C4 (cron + destructive badge), TC-ST4 (unsaved guard).
2. `@axe-core/playwright` pass per page to lock in TC-A1–A5 once fixed.
3. Role-matrix API tests (§3) for `rsync` and `readonly`.
4. Visual-regression snapshots of dark/light per page once the component extraction (Button/Card) lands, to catch style drift.

## 10. Exit criteria

- Backend unit + Playwright suites green.
- §3 role matrix and §4 functional cases pass for all three roles.
- §5 accessibility cases pass (these are the current known failures — track to closure).
- No P0/P1 critique issue regressions (live status, fake status pill, focus rings).
