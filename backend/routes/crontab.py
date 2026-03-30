"""
Crontab scanner — reads the system crontab for existing rsync entries.
"""

import subprocess
import shlex

from fastapi import APIRouter, HTTPException, Request

from backend.database import get_db, log_audit
from backend.scheduler import schedule_job
from backend.security import require_auth, require_role
from backend.validation import validate_cron_expression

router = APIRouter(prefix="/api", tags=["crontab"])


@router.get("/crontab")
async def crontab(request: Request):
    """Scan the system crontab for lines containing 'rsync'."""
    require_auth(request)
    try:
        result = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return {"entries": [], "error": result.stderr.strip()}

        entries = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "rsync" in line:
                entries.append(line)
        return {"entries": entries}
    except FileNotFoundError:
        return {"entries": [], "error": "crontab not available"}
    except Exception as exc:
        return {"entries": [], "error": str(exc)}


@router.post("/crontab/import")
async def import_crontab_entry(request: Request):
    """Import a single rsync crontab line as a job."""
    user = require_role(request, "admin", "rsync")
    body = await request.json()
    entry = (body.get("entry") or "").strip()
    if not entry:
        raise HTTPException(status_code=400, detail="'entry' is required")

    parts = shlex.split(entry)
    if len(parts) < 7 or "rsync" not in parts:
        raise HTTPException(status_code=400, detail="Entry does not look like a cron rsync command")

    cron_expr = validate_cron_expression(" ".join(parts[:5]))
    rsync_idx = parts.index("rsync")
    rsync_parts = parts[rsync_idx + 1:]
    if len(rsync_parts) < 2:
        raise HTTPException(status_code=400, detail="Could not determine source and destination from entry")

    source = rsync_parts[-2]
    destination = rsync_parts[-1]
    flags = []
    custom_flags = []
    for token in rsync_parts[:-2]:
        if token.startswith("-") and not token.startswith("--"):
            flags.append(token)
        else:
            custom_flags.append(token)

    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO jobs (name, source, destination, flags, custom_flags,
                   schedule_cron, schedule_enabled, created_by)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                f"Imported crontab job {source} -> {destination}",
                source,
                destination,
                " ".join(flags) or "-avh",
                " ".join(custom_flags),
                cron_expr,
                1,
                user["id"],
            ),
        )
        conn.commit()
        job_id = cur.lastrowid
    finally:
        conn.close()

    schedule_job(job_id, cron_expr)
    log_audit(user, "job_import_crontab", "job", str(job_id), entry)
    return {"ok": True, "job_id": job_id}
