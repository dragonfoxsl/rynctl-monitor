"""
Database backup and restore routes.
Allows downloading a snapshot and uploading a replacement.
"""

import shutil
import sqlite3
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from backend.database import DB_PATH, DATA_DIR
from backend.security import require_role
from backend.time_utils import utc_now

router = APIRouter(prefix="/api/backup", tags=["backup"])

MAX_BACKUP_UPLOAD_BYTES = 100 * 1024 * 1024


@router.get("/download")
@router.get("")
async def download_backup(request: Request):
    """Download a copy of the current SQLite database (admin only)."""
    require_role(request, "admin")
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    timestamp = utc_now().strftime("%Y%m%d_%H%M%S")
    fd, backup_name = tempfile.mkstemp(prefix=f"rynctl_backup_{timestamp}_", suffix=".db")
    backup_path = Path(backup_name)
    try:
        with sqlite3.connect(str(DB_PATH)) as source, sqlite3.connect(backup_name) as target:
            source.backup(target)
    finally:
        try:
            import os
            os.close(fd)
        except OSError:
            pass

    return FileResponse(
        str(backup_path),
        media_type="application/octet-stream",
        filename=f"rynctl_backup_{timestamp}.db",
        background=BackgroundTask(backup_path.unlink),
    )


@router.post("/restore")
async def restore_backup(request: Request, file: UploadFile = File(...)):
    """
    Replace the database with an uploaded backup (admin only).
    Creates a safety backup of the current DB first.
    """
    require_role(request, "admin")

    if not file.filename.endswith(".db"):
        raise HTTPException(status_code=400, detail="File must be a .db SQLite database")

    # Write uploaded file
    content = await file.read(MAX_BACKUP_UPLOAD_BYTES + 1)
    if len(content) > MAX_BACKUP_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Database backup file is too large")
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File too small to be a valid database")

    # Basic SQLite header check
    if content[:16] != b"SQLite format 3\x00":
        raise HTTPException(status_code=400, detail="Not a valid SQLite database file")

    fd, upload_name = tempfile.mkstemp(prefix="rynctl_restore_", suffix=".db")
    upload_path = Path(upload_name)
    try:
        upload_path.write_bytes(content)
        try:
            with sqlite3.connect(str(upload_path)) as conn:
                row = conn.execute("PRAGMA integrity_check").fetchone()
                if not row or row[0] != "ok":
                    raise HTTPException(status_code=400, detail="SQLite integrity check failed")
                required = {"users", "sessions", "jobs", "job_runs", "audit_log"}
                rows = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
                tables = {row[0] for row in rows}
                missing = required - tables
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"SQLite integrity check failed: missing table(s) {', '.join(sorted(missing))}",
                    )
        except sqlite3.DatabaseError as exc:
            raise HTTPException(status_code=400, detail="SQLite integrity check failed") from exc
        if DB_PATH.exists():
            safety = DATA_DIR / f"rynctl_pre_restore_{utc_now().strftime('%Y%m%d_%H%M%S')}.db"
            shutil.copy2(str(DB_PATH), str(safety))
        DB_PATH.write_bytes(content)
    finally:
        try:
            import os
            os.close(fd)
        except OSError:
            pass
        upload_path.unlink(missing_ok=True)
    return {"ok": True, "message": "Database restored. Restart the server to apply."}
