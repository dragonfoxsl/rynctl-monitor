"""
rynctl-monitor: Application entry point.
Registers all route modules, middleware, and serves the built Preact SPA.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.logging_config import setup_logging
from backend.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from backend.routes import auth, backup, crontab, health, jobs, metrics_route, runs, stats, transfer, users
from backend.scheduler import load_schedules, scheduler

# Initialize structured logging before anything else
setup_logging()

# ---------------------------------------------------------------------------
# Directory paths (relative to project root)
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "static" / "dist"    # Vite production build
STATIC_DIR = BASE_DIR / "static"           # Legacy/dev static files


# ---------------------------------------------------------------------------
# Brotli/Gzip middleware — serve pre-compressed assets when available
# ---------------------------------------------------------------------------

class CompressedStaticFiles(StaticFiles):
    """Serves .br or .gz pre-compressed files when the client supports them."""

    async def get_response(self, path: str, scope) -> Response:
        response = await super().get_response(path, scope)

        if not any(path.endswith(ext) for ext in ('.js', '.css', '.html', '.json', '.svg')):
            return response

        accept = dict(scope.get("headers", [])).get(b"accept-encoding", b"").decode()
        full_path = self.directory + "/" + path if isinstance(self.directory, str) else str(Path(self.directory) / path)

        if "br" in accept and Path(full_path + ".br").exists():
            return FileResponse(
                full_path + ".br",
                media_type=response.media_type,
                headers={"Content-Encoding": "br", "Vary": "Accept-Encoding"},
            )
        if "gzip" in accept and Path(full_path + ".gz").exists():
            return FileResponse(
                full_path + ".gz",
                media_type=response.media_type,
                headers={"Content-Encoding": "gzip", "Vary": "Accept-Encoding"},
            )
        return response


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
# Create app, add middleware, mount routes
# ---------------------------------------------------------------------------

app = FastAPI(title="rynctl-monitor", lifespan=lifespan)

# Middleware (order matters — outermost first)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Serve built assets from Vite (static/dist/assets/)
if (DIST_DIR / "assets").exists():
    app.mount("/assets", CompressedStaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

# Legacy static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Register API routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(runs.router)
app.include_router(stats.router)
app.include_router(crontab.router)
app.include_router(users.router)
app.include_router(backup.router)
app.include_router(transfer.router)
app.include_router(metrics_route.router)


# ---------------------------------------------------------------------------
# SPA catch-all — serves index.html for all non-API/static routes
# ---------------------------------------------------------------------------

@app.get("/{path:path}")
async def spa_catchall(request: Request, path: str):
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(str(dist_index))
    from fastapi.templating import Jinja2Templates
    templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
    return templates.TemplateResponse("index.html", {"request": request})


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("RYNCTL_PORT", 8080)))
