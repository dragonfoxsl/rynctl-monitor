"""
Prometheus-compatible metrics endpoint.
"""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from backend.config import METRICS_ENABLED
from backend.database import get_db
from backend.metrics import metrics

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
@router.get("/api/metrics")
async def prometheus_metrics():
    """Return metrics in Prometheus text exposition format."""
    if not METRICS_ENABLED:
        return PlainTextResponse("# Metrics disabled\n", status_code=404)

    # Refresh DB-derived gauges
    try:
        conn = get_db()
        try:
            metrics.set_gauge("rynctl_jobs_total", conn.execute("SELECT COUNT(*) AS c FROM jobs").fetchone()["c"])
            metrics.set_gauge("rynctl_jobs_scheduled", conn.execute("SELECT COUNT(*) AS c FROM jobs WHERE schedule_enabled=1").fetchone()["c"])

            rs = conn.execute("""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS ok,
                    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS fail,
                    SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) AS running,
                    COALESCE(SUM(bytes_transferred),0) AS bytes
                FROM job_runs
            """).fetchone()
            metrics.set_gauge("rynctl_runs_total", rs["total"] or 0)
            metrics.set_gauge("rynctl_runs_success", rs["ok"] or 0)
            metrics.set_gauge("rynctl_runs_failed", rs["fail"] or 0)
            metrics.set_gauge("rynctl_runs_running", rs["running"] or 0)
            metrics.set_gauge("rynctl_bytes_transferred_total", rs["bytes"] or 0)

            metrics.set_gauge("rynctl_users_total", conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"])
            metrics.set_gauge("rynctl_sessions_active", conn.execute("SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')").fetchone()["c"])
        finally:
            conn.close()
    except Exception:
        pass

    return PlainTextResponse(metrics.export(), media_type="text/plain; version=0.0.4")
