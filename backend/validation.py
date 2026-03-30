"""
Validation helpers for cron expressions and local path browsing.
"""

from pathlib import Path

from fastapi import HTTPException
from apscheduler.triggers.cron import CronTrigger

from backend.config import BROWSE_ROOTS


def validate_cron_expression(expr: str) -> str:
    value = (expr or "").strip()
    if not value:
        return ""
    try:
        CronTrigger.from_crontab(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid cron expression: {exc}") from exc
    return value


def normalize_local_browse_path(path: str) -> str:
    raw = (path or "/").strip() or "/"
    resolved = Path(raw).expanduser().resolve(strict=False)
    resolved_str = str(resolved)

    if BROWSE_ROOTS:
        allowed = False
        for root in BROWSE_ROOTS:
            root_path = Path(root).expanduser().resolve(strict=False)
            try:
                Path(resolved_str).relative_to(root_path)
                allowed = True
                break
            except ValueError:
                continue
        if not allowed:
            raise HTTPException(status_code=403, detail=f"Path is outside allowed browse roots: {resolved_str}")

    return resolved_str
