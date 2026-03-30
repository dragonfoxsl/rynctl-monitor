"""
Database backup and restore routes.
Allows downloading a snapshot and uploading a replacement.
"""

import shutil

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse

from backend.database import DB_PATH, DATA_DIR
from backend.security import require_role
from backend.time_utils import utc_now

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/download")
@router.get("")
async def download_backup(request: Request):
    """Download a copy of the current SQLite database (admin only)."""
    require_role(request, "admin")
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="Database file not found")

    # Copy to a temp location to avoid locking issues
    timestamp = utc_now().strftime("%Y%m%d_%H%M%S")
    backup_path = DATA_DIR / f"rynctl_backup_{timestamp}.db"
    shutil.copy2(str(DB_PATH), str(backup_path))

    return FileResponse(
        str(backup_path),
        media_type="application/octet-stream",
        filename=f"rynctl_backup_{timestamp}.db",
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

    # Safety backup of current DB
    if DB_PATH.exists():
        safety = DATA_DIR / f"rynctl_pre_restore_{utc_now().strftime('%Y%m%d_%H%M%S')}.db"
        shutil.copy2(str(DB_PATH), str(safety))

    # Write uploaded file
    content = await file.read()
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="File too small to be a valid database")

    # Basic SQLite header check
    if content[:16] != b"SQLite format 3\x00":
        raise HTTPException(status_code=400, detail="Not a valid SQLite database file")

    DB_PATH.write_bytes(content)
    return {"ok": True, "message": "Database restored. Restart the server to apply."}
