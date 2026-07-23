# Rynctl Monitor Handoff

## Current State

- Branch: `main`
- Remote: `git@github.com:dragonfoxsl/rynctl-monitor.git`
- CI runs on push, pull request, manual dispatch, and Fridays at `03:00 UTC`.
- Dependabot/security dependency alerts were fixed in earlier commits.

## Maintainer Rules

- Never add AI co-author trailers to commits.
- Keep `README.md` and this `HANDOFF.md` updated with each change.
- Follow the `os-download` README style for future README creation or major rewrites.
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
- Review GitHub Dependabot and weekly CI results after each Friday run.
