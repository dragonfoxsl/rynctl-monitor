# Rynctl Monitor Handoff

## Current State

- Default branch: `main`
- Remote: `git@github.com:dragonfoxsl/rynctl-monitor.git`
- CI runs on push, pull request, manual dispatch, and Fridays at `03:00 UTC`.
- Current CI runs backend tests, frontend build/audit, package audit, Python
  audit (`pip-audit`), and the Dockerized browser/API and scheduler smoke
  suites. Tag builds repeat these gates before publishing an image.
- Runners are pinned to `ubuntu-24.04`; `ubuntu-latest` migrates to Ubuntu 26
  from 2026-10-19, so bump this deliberately after testing the Docker e2e job.
- The Playwright image tag is derived from `@playwright/test` in
  `tests/package.json` via the `PLAYWRIGHT_VERSION` build arg. Never hardcode a
  version in `Dockerfile.test`; run the e2e suite through `make e2e-tests` or
  export `PLAYWRIGHT_VERSION` first.

## Maintainer Rules

- Never add AI co-author trailers to commits.
- Keep `README.md` and this `HANDOFF.md` updated with each change.
- Keep public README content focused on users and contributors. Put agent instructions,
  branch state, dated PR lists, and operational handoff notes in `HANDOFF.md` or `AGENTS.md`.
- Follow the `os-download` public README style for future README creation or major rewrites.
- Preserve existing support links, but do not add new Ko-fi/donation content unless explicitly requested.
- Follow secure development practices for Python, JavaScript, Docker, and GitHub Actions.
- Keep code and configuration files under 1000 lines, and normal documentation under 2000 lines.
- Add concise comments only for non-obvious behavior, security decisions, or integration details.
- Before pushing, check configured GitHub Actions and Dependabot status for failures or open alerts.

## Verification Baseline

- Backend tests: `docker compose --profile tools run --build --rm backend-tests pytest -q`
- Browser/API tests: `RYNCTL_PORT=18080 make e2e-tests`
- Python audit: `pip-audit -r requirements.txt -r requirements-dev.txt`
- Frontend audit: `cd frontend && npm audit --audit-level=low`
- E2E package audit: `cd tests && npm audit --audit-level=low`

## Latest Verification

- CI hardening and Playwright single-sourcing: 69 backend tests passed;
  `pip-audit` clean; frontend and e2e package audits clean; the e2e image built
  from the derived `PLAYWRIGHT_VERSION` and reported Playwright 1.64.0.

## Open Items

- Keep the scheduled-job proof check in the e2e suite when scheduler behavior changes.
- Keep e2e workflow fixture creation after the e2e image build and use `--no-deps` for the test run.
- Keep package-manager audits in CI; GitHub alert availability is not a substitute for a clean lockfile audit.
- Dependency updates from PRs #16-#18 (`browserslist` 4.28.9,
  `baseline-browser-mapping` 2.11.21, `httpx2` 2.12.0) landed via #19.
- `.github/dependabot.yml` is present with grouped weekly updates for npm
  (`/frontend`, `/tests`), pip, and github-actions.
- Dependabot owns `tests/package.json` but not `Dockerfile.test`. The
  `PLAYWRIGHT_VERSION` build arg removes that coupling; a Playwright bump needs
  no Dockerfile change.
