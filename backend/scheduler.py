"""
APScheduler-based cron scheduling for rsync jobs.
Also manages periodic maintenance tasks (session cleanup).
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from backend.database import cleanup_expired_sessions, get_db
from backend.job_runner import enqueue_job

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global scheduler instance
# ---------------------------------------------------------------------------

scheduler = BackgroundScheduler()


def schedule_job(job_id: int, cron_expr: str):
    """Add or replace a cron-triggered rsync job on the scheduler."""
    job_tag = f"rsync_job_{job_id}"

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
        enqueue_job,
        trigger,
        args=[job_id, "schedule"],
        id=job_tag,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    logger.info("Scheduled job %d with cron: %s", job_id, cron_expr)


def unschedule_job(job_id: int):
    """Remove a job's cron schedule."""
    try:
        scheduler.remove_job(f"rsync_job_{job_id}")
        logger.info("Unscheduled job %d", job_id)
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
        logger.info("Loaded %d scheduled jobs", len(rows))
    finally:
        conn.close()

    # Periodic session cleanup (every hour)
    scheduler.add_job(
        cleanup_expired_sessions,
        IntervalTrigger(hours=1),
        id="session_cleanup",
        replace_existing=True,
    )
    logger.info("Registered hourly session cleanup task")
