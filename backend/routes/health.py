"""
Health check endpoint — verifies DB connectivity and scheduler status.
"""

from fastapi import APIRouter

from backend.database import get_db
from backend.scheduler import scheduler

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    """Public health check that verifies DB read and scheduler status."""
    checks = {"db": False, "scheduler": False}

    # DB connectivity
    try:
        conn = get_db()
        try:
            conn.execute("SELECT 1").fetchone()
            checks["db"] = True
        finally:
            conn.close()
    except Exception:
        pass

    # Scheduler running
    checks["scheduler"] = scheduler.running

    ok = all(checks.values())
    return {"status": "healthy" if ok else "degraded", "checks": checks}
