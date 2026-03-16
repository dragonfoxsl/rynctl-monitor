"""
rynctl-monitor — development entry point.

Sets the working directory to the project root and starts the
Uvicorn server using settings from environment variables.
"""

import os
import sys
from pathlib import Path

# Ensure the working directory is the project root so relative
# paths (templates, static, data) resolve correctly.
PROJECT_ROOT = Path(__file__).resolve().parent
os.chdir(PROJECT_ROOT)

# Add project root to sys.path for clean imports
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn  # noqa: E402

HOST = os.environ.get("RYNCTL_HOST", "0.0.0.0")
PORT = int(os.environ.get("RYNCTL_PORT", 8080))
LOG_LEVEL = os.environ.get("RYNCTL_LOG_LEVEL", "info").lower()

if __name__ == "__main__":
    uvicorn.run(
        "backend.app:app",
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
    )
else:
    # Allow `python run.py` without __name__ guard (e.g. direct execution)
    uvicorn.run(
        "backend.app:app",
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
    )
