"""
APScheduler-based cron scheduling for rsync jobs.
Manages adding, removing, and loading scheduled jobs.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.database import get_db
from backend.rsync import run_rsync_job

# ---------------------------------------------------------------------------
# Global scheduler instance
# ---------------------------------------------------------------------------

scheduler = BackgroundScheduler()


def schedule_job(job_id: int, cron_expr: str):
    """Add or replace a cron-triggered rsync job on the scheduler."""
    job_tag = f"rsync_job_{job_id}"

    # Remove existing schedule if any
    try:
        scheduler.remove_job(job_tag)
    except Exception:
        pass

    parts = cron_expr.strip().split()
    if len(parts) < 5:
        return

    trigger = CronTrigger(
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        day_of_week=parts[4],
    )
    scheduler.add_job(
        run_rsync_job, trigger, args=[job_id], id=job_tag, replace_existing=True
    )


def unschedule_job(job_id: int):
    """Remove a job's cron schedule."""
    try:
        scheduler.remove_job(f"rsync_job_{job_id}")
    except Exception:
        pass


def load_schedules():
    """Load all enabled cron schedules from the DB on startup."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, schedule_cron FROM jobs WHERE schedule_enabled = 1 AND schedule_cron != ''"
        ).fetchall()
        for row in rows:
            schedule_job(row["id"], row["schedule_cron"])
    finally:
        conn.close()
