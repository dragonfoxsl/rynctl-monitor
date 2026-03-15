"""
rynctl-monitor: FastAPI application entry point.
Registers all route modules and serves the SPA.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.database import init_db
from backend.routes import auth, crontab, jobs, runs, stats, users
from backend.scheduler import load_schedules, scheduler

# ---------------------------------------------------------------------------
# Directory paths (relative to project root)
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


# ---------------------------------------------------------------------------
# App lifespan — init DB, start scheduler, load cron jobs
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()
    load_schedules()
    yield
    scheduler.shutdown(wait=False)


# ---------------------------------------------------------------------------
# FastAPI app — mount static files and register route modules
# ---------------------------------------------------------------------------

app = FastAPI(title="rynctl-monitor", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Register API routers
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(runs.router)
app.include_router(stats.router)
app.include_router(crontab.router)
app.include_router(users.router)


# ---------------------------------------------------------------------------
# SPA catch-all — serves index.html for all non-API/static routes
# ---------------------------------------------------------------------------

@app.get("/{path:path}")
async def spa_catchall(request: Request, path: str):
    return templates.TemplateResponse("index.html", {"request": request})


# ---------------------------------------------------------------------------
# Direct execution: python -m backend.app
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("RYNCTL_PORT", 8080)))
