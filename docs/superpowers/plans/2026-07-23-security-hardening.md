# Rynctl Monitor Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close validation gaps found in crontab import, rsync argument handling, login token exposure, and backup restore.

**Architecture:** Centralize argument validation in `backend.validation`, make all job creation paths call the same validators, and keep backup/restore SQLite-aware. Keep API response changes narrow and compatible with the existing cookie-based frontend.

**Tech Stack:** FastAPI, SQLite, pytest, Pydantic, Preact frontend.

**Status (2026-07-24): Complete.** The validation, login-response, SQLite
backup/restore, regression-test, and README work below is present in the
current tree. Checkboxes record implementation status; they are not remaining
work.

## Global Constraints

- Do not add generated co-author metadata.
- Do not remove existing tests.
- Preserve existing role semantics.
- Raw session tokens should not be returned to the browser JSON payload.

---

### Task 1: Rsync And Crontab Validation

**Files:**
- Modify: `backend/validation.py`
- Modify: `backend/rsync.py`
- Modify: `backend/routes/crontab.py`
- Modify: `tests/unit/test_jobs_and_transfer.py`

- [x] Add failing tests for crontab dangerous flag rejection and dash-prefixed path rejection.
- [x] Implement `validate_job_payload` coverage for path-like fields and use `shlex.split`.
- [x] Call validation from crontab import before insert.
- [x] Verify pytest passes.

### Task 2: Login And Backup Hardening

**Files:**
- Modify: `backend/routes/auth.py`
- Modify: `backend/routes/backup.py`
- Modify: `tests/unit/test_auth_security.py`
- Create or modify: `tests/unit/test_backup.py`

- [x] Add failing tests for no raw login token and SQLite restore integrity checks.
- [x] Remove `token` from login JSON while keeping signed cookie.
- [x] Use SQLite backup API for download snapshot, integrity-check uploaded DB, limit upload size, and delete temp download after response.
- [x] Verify pytest passes.

### Task 3: Docs

**Files:**
- Modify: `README.md`

- [x] Document stricter validation and backup behavior.
- [x] Verify docs match implementation.
