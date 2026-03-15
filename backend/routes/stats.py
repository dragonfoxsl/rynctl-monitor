"""
Dashboard statistics route — aggregate counts, transfer totals, and 7-day breakdown.
"""

from fastapi import APIRouter, Request

from backend.database import get_db
from backend.security import require_auth

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats")
async def stats(request: Request):
    """Return dashboard statistics including daily breakdown for the last 7 days."""
    require_auth(request)
    conn = get_db()
    try:
        total_jobs = conn.execute("SELECT COUNT(*) AS c FROM jobs").fetchone()["c"]
        scheduled = conn.execute(
            "SELECT COUNT(*) AS c FROM jobs WHERE schedule_enabled = 1"
        ).fetchone()["c"]

        run_stats = conn.execute("""
            SELECT
                COUNT(*) AS total_runs,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
                COALESCE(SUM(bytes_transferred), 0) AS data_transferred,
                COALESCE(SUM(files_transferred), 0) AS files_synced
            FROM job_runs
        """).fetchone()

        # 7-day daily breakdown
        daily = conn.execute("""
            SELECT date(started_at) AS day,
                   COUNT(*) AS runs,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful,
                   SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
                   COALESCE(SUM(bytes_transferred), 0) AS data_transferred
            FROM job_runs
            WHERE started_at >= datetime('now', '-7 days')
            GROUP BY date(started_at)
            ORDER BY day
        """).fetchall()

        return {
            "total_jobs": total_jobs,
            "scheduled": scheduled,
            "total_runs": run_stats["total_runs"] or 0,
            "successful": run_stats["successful"] or 0,
            "failed": run_stats["failed"] or 0,
            "running": run_stats["running"] or 0,
            "data_transferred": run_stats["data_transferred"],
            "files_synced": run_stats["files_synced"],
            "daily": [dict(r) for r in daily],
        }
    finally:
        conn.close()
