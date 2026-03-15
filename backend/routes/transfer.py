"""
Job import/export and SSH connection test routes.
"""

import json
import subprocess

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.database import get_db, log_audit
from backend.security import require_auth, require_role

router = APIRouter(prefix="/api", tags=["transfer"])


# ---------------------------------------------------------------------------
# Import / Export jobs as JSON
# ---------------------------------------------------------------------------

@router.get("/jobs/export")
async def export_jobs(request: Request):
    """Export all jobs as a JSON array (admin only)."""
    require_role(request, "admin")
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM jobs ORDER BY id").fetchall()
        jobs = []
        for r in rows:
            d = dict(r)
            # Remove internal fields not needed for import
            d.pop("id", None)
            d.pop("created_by", None)
            d.pop("created_at", None)
            d.pop("updated_at", None)
            jobs.append(d)
        return JSONResponse(
            content={"version": 1, "jobs": jobs},
            headers={"Content-Disposition": "attachment; filename=rynctl_jobs_export.json"},
        )
    finally:
        conn.close()


@router.post("/jobs/import")
async def import_jobs(request: Request):
    """
    Import jobs from a JSON payload (admin only).
    Expects { "jobs": [...] } format from the export endpoint.
    Skips jobs whose name already exists.
    """
    user = require_role(request, "admin")
    body = await request.json()
    jobs_data = body.get("jobs", [])

    if not isinstance(jobs_data, list):
        raise HTTPException(status_code=400, detail="'jobs' must be an array")

    conn = get_db()
    created = 0
    skipped = 0
    try:
        for j in jobs_data:
            name = j.get("name", "").strip()
            if not name or not j.get("source") or not j.get("destination"):
                skipped += 1
                continue

            # Skip duplicates
            existing = conn.execute("SELECT id FROM jobs WHERE name = ?", (name,)).fetchone()
            if existing:
                skipped += 1
                continue

            conn.execute(
                """INSERT INTO jobs (name, source, destination, remote_host, ssh_port, ssh_key,
                       flags, exclude_patterns, bandwidth_limit, custom_flags,
                       schedule_cron, schedule_enabled, created_by)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    name, j["source"], j["destination"],
                    j.get("remote_host", ""), j.get("ssh_port", ""),
                    j.get("ssh_key", ""), j.get("flags", "-avh"),
                    j.get("exclude_patterns", ""), j.get("bandwidth_limit", ""),
                    j.get("custom_flags", ""), j.get("schedule_cron", ""),
                    j.get("schedule_enabled", 0), user["id"],
                ),
            )
            created += 1

        conn.commit()
    finally:
        conn.close()

    log_audit(user, "jobs_import", details=f"Imported {created}, skipped {skipped}")
    return {"ok": True, "created": created, "skipped": skipped}


# ---------------------------------------------------------------------------
# SSH connection test
# ---------------------------------------------------------------------------

@router.post("/ssh/test")
async def test_ssh(request: Request):
    """
    Test SSH connectivity to a remote host.
    Expects { host, port?, key? } — runs `ssh -o ConnectTimeout=5 host echo ok`.
    """
    require_role(request, "admin", "rsync")
    body = await request.json()

    host = body.get("host", "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="'host' is required")

    port = body.get("port", "22")
    key = body.get("key", "")

    cmd = ["ssh", "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=5"]
    if port and port != "22":
        cmd.extend(["-p", str(port)])
    if key:
        cmd.extend(["-i", key])
    cmd.extend([host, "echo", "rynctl-ok"])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and "rynctl-ok" in result.stdout:
            return {"ok": True, "message": f"Connected to {host} successfully"}
        return {
            "ok": False,
            "message": result.stderr.strip() or f"SSH exited with code {result.returncode}",
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "message": "Connection timed out after 10 seconds"}
    except FileNotFoundError:
        return {"ok": False, "message": "SSH client not found on server"}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


# ---------------------------------------------------------------------------
# Audit log viewer
# ---------------------------------------------------------------------------

@router.get("/audit")
async def get_audit_log(request: Request):
    """Return the 100 most recent audit log entries (admin only)."""
    require_role(request, "admin")
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY id DESC LIMIT 100"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
