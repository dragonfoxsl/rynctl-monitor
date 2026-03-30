import importlib
import sys

import pytest
from fastapi.testclient import TestClient


def _fresh_backend_import():
    for name in sorted(sys.modules):
        if name == "backend" or name.startswith("backend."):
            del sys.modules[name]

    app_module = importlib.import_module("backend.app")
    database = importlib.import_module("backend.database")
    security = importlib.import_module("backend.security")
    rsync = importlib.import_module("backend.rsync")
    job_runner = importlib.import_module("backend.job_runner")
    return app_module, database, security, rsync, job_runner


@pytest.fixture
def app_ctx(monkeypatch, tmp_path):
    data_dir = tmp_path / "data"
    browse_root = tmp_path / "browse"
    data_dir.mkdir(parents=True, exist_ok=True)
    browse_root.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("RYNCTL_DATA_DIR", str(data_dir))
    monkeypatch.setenv("RYNCTL_SECRET", "test-secret")
    monkeypatch.setenv("RYNCTL_RATE_LIMIT_RPM", "10000")
    monkeypatch.setenv("RYNCTL_BROWSE_ROOTS", str(browse_root))

    app_module, database, security, rsync, job_runner = _fresh_backend_import()
    with TestClient(app_module.app) as client:
        yield {
            "client": client,
            "database": database,
            "security": security,
            "rsync": rsync,
            "job_runner": job_runner,
            "data_dir": data_dir,
            "browse_root": browse_root,
        }


@pytest.fixture
def client(app_ctx):
    return app_ctx["client"]


@pytest.fixture
def db(app_ctx):
    database = app_ctx["database"]
    conn = database.get_db()
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def rsync_module(app_ctx):
    return app_ctx["rsync"]


@pytest.fixture
def job_runner_module(app_ctx):
    return app_ctx["job_runner"]


@pytest.fixture
def auth_headers(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    return {"X-CSRF-Token": csrf}
