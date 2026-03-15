"""
Run history routes — recent runs across all jobs, and log retrieval.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from backend.database import get_db
from backend.security import require_auth

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("/recent")
async def recent_runs(request: Request):
    """Return the 25 most recent runs across all jobs."""
    require_auth(request)
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT jr.*, j.name AS job_name
            FROM job_runs jr JOIN jobs j ON jr.job_id = j.id
            ORDER BY jr.id DESC LIMIT 25
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/{run_id}/log")
async def run_log(run_id: int, request: Request):
    """Return the log file contents for a specific run (capped at 50KB)."""
    require_auth(request)
    conn = get_db()
    try:
        run = conn.execute(
            "SELECT log_file FROM job_runs WHERE id = ?", (run_id,)
        ).fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
    finally:
        conn.close()

    log_file = run["log_file"]
    if not log_file or not Path(log_file).exists():
        return {"content": ""}

    try:
        content = Path(log_file).read_text(errors="replace")
        if len(content) > 50_000:
            content = content[-50_000:]
        return {"content": content}
    except Exception as exc:
        return {"content": f"Error reading log: {exc}"}
