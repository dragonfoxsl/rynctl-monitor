# Rynctl Monitor Handoff

## Current State

- Working branch: `docs/public-readme-cleanup` (the repository default is `main`)
- Remote: `git@github.com:dragonfoxsl/rynctl-monitor.git`
- CI runs on push, pull request, manual dispatch, and Fridays at `03:00 UTC`.
- Current CI runs backend tests, frontend build/audit, package audit, and the
  Dockerized browser/API and scheduler smoke suites. Tag builds repeat these
  gates before publishing an image.

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

## Open Items

- Keep the scheduled-job proof check in the e2e suite when scheduler behavior changes.
- Keep e2e workflow fixture creation after the e2e image build and use `--no-deps` for the test run.
- Dependabot audit (2026-07-25): no open version-update PRs.
- No `.github/dependabot.yml` is currently present; review whether scheduled
  version updates should be re-enabled before relying on Dependabot automation.
