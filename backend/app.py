"""
rynctl-monitor: Application entry point.
Registers all route modules, middleware, and serves the built Preact SPA.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.job_runner import start_runner, stop_runner
from backend.logging_config import setup_logging
from backend.middleware import CSRFMiddleware, RateLimitMiddleware, RequestLoggingMiddleware
from backend.routes import auth, backup, crontab, health, jobs, metrics_route, runs, stats, transfer, users
from backend.rsync import recover_running_jobs
from backend.scheduler import load_schedules, scheduler

# Initialize structured logging before anything else
setup_logging()

# ---------------------------------------------------------------------------
# Directory paths (relative to project root)
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "static" / "dist"    # Vite production build
STATIC_DIR = BASE_DIR / "static"           # Static assets (favicon, built bundles, etc.)


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
    recover_running_jobs()
    start_runner()
    scheduler.start()
    load_schedules()
    yield
    scheduler.shutdown(wait=False)
    stop_runner()


# ---------------------------------------------------------------------------
# Create app, add middleware, mount routes
# ---------------------------------------------------------------------------

app = FastAPI(title="rynctl-monitor", lifespan=lifespan)

# Middleware (order matters — outermost first)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CSRFMiddleware)

# Serve built assets from Vite (static/dist/assets/)
if (DIST_DIR / "assets").exists():
    app.mount("/assets", CompressedStaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

# Static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Register API routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(transfer.router)
app.include_router(jobs.router)
app.include_router(runs.router)
app.include_router(stats.router)
app.include_router(crontab.router)
app.include_router(users.router)
app.include_router(backup.router)
app.include_router(metrics_route.router)


# ---------------------------------------------------------------------------
# SPA catch-all — serves index.html for all non-API/static routes
# ---------------------------------------------------------------------------

@app.get("/{path:path}")
async def spa_catchall(request: Request, path: str):
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(str(dist_index))
    return HTMLResponse(
        """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>rynctl-monitor</title>
  <style>
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #020617; color: #e2e8f0; }
    #app { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { max-width: 640px; border: 1px solid #334155; background: #0f172a; border-radius: 12px; padding: 24px; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    p { margin: 0 0 12px; line-height: 1.6; color: #94a3b8; }
    code { color: #60a5fa; }
  </style>
</head>
<body>
  <div id="app">
    <div class="card">
      <h1>Frontend Build Missing</h1>
      <p>The backend is running, but <code>static/dist/index.html</code> was not found.</p>
      <p>Build the frontend with <code>cd frontend && npm install && npm run build</code>.</p>
    </div>
  </div>
</body>
</html>"""
    )


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("RYNCTL_PORT", 8080)))
