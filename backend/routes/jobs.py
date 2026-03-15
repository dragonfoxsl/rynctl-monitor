"""
Job CRUD routes — list, create, update, delete, run, preview, and per-job runs.
"""

import threading

from fastapi import APIRouter, HTTPException, Request

from backend.database import get_db, log_audit
from backend.rsync import build_rsync_command, run_rsync_job
from backend.scheduler import schedule_job, unschedule_job
from backend.security import require_auth, require_role

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(request: Request):
    """List all jobs with last status, run count, and total data transferred."""
    require_auth(request)
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT j.*,
                   (SELECT status FROM job_runs WHERE job_id = j.id ORDER BY id DESC LIMIT 1) AS last_status,
                   (SELECT COUNT(*) FROM job_runs WHERE job_id = j.id) AS total_runs,
                   (SELECT COALESCE(SUM(bytes_transferred), 0) FROM job_runs WHERE job_id = j.id) AS total_data
            FROM jobs j ORDER BY j.id DESC
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("")
async def create_job(request: Request):
    """Create a new rsync job. Requires admin or rsync role."""
    user = require_role(request, "admin", "rsync")
    body = await request.json()

    # Validate required fields
    for f in ["name", "source", "destination"]:
        if not body.get(f):
            raise HTTPException(status_code=400, detail=f"'{f}' is required")

    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO jobs (name, source, destination, remote_host, ssh_port, ssh_key,
                   flags, exclude_patterns, bandwidth_limit, custom_flags,
                   schedule_cron, schedule_enabled, created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                body["name"], body["source"], body["destination"],
                body.get("remote_host", ""), body.get("ssh_port", ""),
                body.get("ssh_key", ""), body.get("flags", "-avh"),
                body.get("exclude_patterns", ""), body.get("bandwidth_limit", ""),
                body.get("custom_flags", ""), body.get("schedule_cron", ""),
                body.get("schedule_enabled", 0), user["id"],
            ),
        )
        conn.commit()
        job_id = cur.lastrowid

        # Auto-schedule if enabled
        if body.get("schedule_enabled") and body.get("schedule_cron"):
            schedule_job(job_id, body["schedule_cron"])

        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    finally:
        conn.close()

    log_audit(user, "job_create", "job", str(job_id), f"Created job '{body['name']}'")
    return dict(job)


@router.get("/{job_id}")
async def get_job(job_id: int, request: Request):
    require_auth(request)
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return dict(job)
    finally:
        conn.close()


@router.put("/{job_id}")
async def update_job(job_id: int, request: Request):
    """Update job fields and reschedule if cron settings changed."""
    user = require_role(request, "admin", "rsync")
    body = await request.json()

    conn = get_db()
    try:
        existing = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")

        updatable = [
            "name", "source", "destination", "remote_host", "ssh_port", "ssh_key",
            "flags", "exclude_patterns", "bandwidth_limit", "custom_flags",
            "schedule_cron", "schedule_enabled",
        ]
        sets = []
        vals = []
        for key in updatable:
            if key in body:
                sets.append(f"{key} = ?")
                vals.append(body[key])

        if sets:
            sets.append("updated_at = datetime('now')")
            vals.append(job_id)
            conn.execute(f"UPDATE jobs SET {', '.join(sets)} WHERE id = ?", vals)
            conn.commit()

        # Reschedule based on new values
        sched_enabled = body.get("schedule_enabled", existing["schedule_enabled"])
        sched_cron = body.get("schedule_cron", existing["schedule_cron"])

        if sched_enabled and sched_cron:
            schedule_job(job_id, sched_cron)
        else:
            unschedule_job(job_id)

        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(job)
    finally:
        conn.close()


@router.delete("/{job_id}")
async def delete_job(job_id: int, request: Request):
    require_role(request, "admin", "rsync")
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")
        conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        conn.commit()
    finally:
        conn.close()

    unschedule_job(job_id)
    return {"ok": True}


@router.post("/{job_id}/run")
async def run_job(job_id: int, request: Request):
    """Trigger an immediate rsync run in a background thread."""
    require_role(request, "admin", "rsync")
    conn = get_db()
    try:
        job = conn.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    finally:
        conn.close()

    t = threading.Thread(target=run_rsync_job, args=(job_id,), daemon=True)
    t.start()
    return {"ok": True, "message": "Job started"}


@router.get("/{job_id}/preview")
async def preview_job(job_id: int, request: Request):
    """Return the rsync command that would be executed for this job."""
    require_auth(request)
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        cmd = build_rsync_command(dict(job))
        return {"command": " ".join(cmd)}
    finally:
        conn.close()


@router.get("/{job_id}/runs")
async def job_runs(job_id: int, request: Request):
    """List the 50 most recent runs for a specific job."""
    require_auth(request)
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM job_runs WHERE job_id = ? ORDER BY id DESC LIMIT 50",
            (job_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
