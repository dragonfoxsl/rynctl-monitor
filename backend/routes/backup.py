"""Database backup and restore routes."""

import os
import sqlite3
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from backend.database import (
    DATA_DIR,
    DB_PATH,
    get_db,
    maintenance_boundary,
    prepare_database,
    validate_database_schema,
)
from backend.job_runner import idle_runner_boundary
from backend.scheduler import load_schedules
from backend.security import require_role
from backend.time_utils import utc_now

router = APIRouter(prefix="/api/backup", tags=["backup"])
MAX_BACKUP_UPLOAD_BYTES = 100 * 1024 * 1024


@router.get("/download")
@router.get("")
async def download_backup(request: Request):
    """Download a consistent current SQLite snapshot (admin only)."""
    require_role(request, "admin")
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    timestamp = utc_now().strftime("%Y%m%d_%H%M%S")
    fd, backup_name = tempfile.mkstemp(prefix=f"rynctl_backup_{timestamp}_", suffix=".db")
    backup_path = Path(backup_name)
    os.close(fd)
    source = get_db()
    try:
        with sqlite3.connect(backup_name) as target:
            source.backup(target)
    finally:
        source.close()

    return FileResponse(
        str(backup_path),
        media_type="application/octet-stream",
        filename=f"rynctl_backup_{timestamp}.db",
        background=BackgroundTask(backup_path.unlink),
    )


@router.post("/restore")
async def restore_backup(request: Request, file: UploadFile = File(...)):
    """Integrity-check and atomically restore a database under maintenance exclusion."""
    require_role(request, "admin")
    if not file.filename or not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail="File must be a .db SQLite database")

    content = await file.read(MAX_BACKUP_UPLOAD_BYTES + 1)
    if len(content) > MAX_BACKUP_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Database backup file is too large")
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File too small to be a valid database")
    if content[:16] != b"SQLite format 3\x00":
        raise HTTPException(status_code=400, detail="Not a valid SQLite database file")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fd, upload_name = tempfile.mkstemp(prefix="rynctl_restore_", suffix=".db", dir=DATA_DIR)
    upload_path = Path(upload_name)
    os.close(fd)
    try:
        upload_path.write_bytes(content)
        try:
            with sqlite3.connect(str(upload_path)) as conn:
                conn.row_factory = sqlite3.Row
                row = conn.execute("PRAGMA integrity_check").fetchone()
                if not row or row[0] != "ok":
                    raise HTTPException(status_code=400, detail="SQLite integrity check failed")
                required = {"users", "sessions", "jobs", "job_runs", "audit_log"}
                tables = {row[0] for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()}
                missing = required - tables
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"SQLite integrity check failed: missing table(s) {', '.join(sorted(missing))}",
                    )
                prepare_database(conn)
                validate_database_schema(conn)
        except (sqlite3.DatabaseError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="SQLite integrity check failed") from exc

        with idle_runner_boundary() as idle:
            if not idle:
                raise HTTPException(status_code=409, detail="Cannot restore while jobs are queued or running")
            with maintenance_boundary():
                if DB_PATH.exists():
                    safety = DATA_DIR / f"rynctl_pre_restore_{utc_now().strftime('%Y%m%d_%H%M%S_%f')}.db"
                    with sqlite3.connect(str(DB_PATH)) as source, sqlite3.connect(str(safety)) as target:
                        source.backup(target)
                # No connection can recreate stale sidecars between cleanup and replacement.
                for suffix in ("-wal", "-shm"):
                    Path(f"{DB_PATH}{suffix}").unlink(missing_ok=True)
                os.replace(upload_path, DB_PATH)
            load_schedules()
    finally:
        upload_path.unlink(missing_ok=True)

    return {"ok": True, "message": "Database restored atomically; new connections use it immediately."}
