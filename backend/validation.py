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


# rsync options that let a job execute arbitrary commands (locally or on the
# remote). The app supplies its own -e/ssh transport from ssh_port/ssh_key, so
# users must never inject these via the flags or custom_flags fields.
_FORBIDDEN_RSYNC_OPTS = ("-e", "--rsh", "--rsync-path")


def validate_ssh_port(port: str) -> str:
    """Accept an empty port or a 1-65535 integer; reject anything else."""
    value = (port or "").strip()
    if not value:
        return ""
    if not value.isdigit() or not (1 <= int(value) <= 65535):
        raise HTTPException(status_code=400, detail="ssh_port must be a number between 1 and 65535")
    return value


def validate_rsync_flags(*flag_strings: str) -> None:
    """Reject user-supplied rsync flags that enable command execution."""
    for raw in flag_strings:
        for token in (raw or "").split():
            name = token.split("=", 1)[0]
            if name in _FORBIDDEN_RSYNC_OPTS:
                raise HTTPException(
                    status_code=400,
                    detail=f"rsync option '{name}' is not allowed (configure SSH via the port/key fields instead)",
                )


def validate_job_payload(body: dict) -> dict:
    """Apply security validation to a job payload in place. Returns the body."""
    if "ssh_port" in body:
        body["ssh_port"] = validate_ssh_port(body.get("ssh_port", ""))
    validate_rsync_flags(body.get("flags", ""), body.get("custom_flags", ""))
    return body


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
