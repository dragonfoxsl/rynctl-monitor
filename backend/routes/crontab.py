"""
Crontab scanner — reads the system crontab for existing rsync entries.
"""

import subprocess

from fastapi import APIRouter, Request

from backend.security import require_auth

router = APIRouter(prefix="/api", tags=["crontab"])


@router.get("/crontab")
async def crontab(request: Request):
    """Scan the system crontab for lines containing 'rsync'."""
    require_auth(request)
    try:
        result = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return {"entries": [], "error": result.stderr.strip()}

        entries = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "rsync" in line:
                entries.append(line)
        return {"entries": entries}
    except FileNotFoundError:
        return {"entries": [], "error": "crontab not available"}
    except Exception as exc:
        return {"entries": [], "error": str(exc)}
