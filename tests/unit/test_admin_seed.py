import importlib
import sys

from fastapi.testclient import TestClient


def _client_with_env(monkeypatch, tmp_path, **env):
    monkeypatch.setenv("RYNCTL_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("RYNCTL_SECRET", "test-secret")
    monkeypatch.setenv("RYNCTL_RATE_LIMIT_RPM", "10000")
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    for name in [n for n in sys.modules if n == "backend" or n.startswith("backend.")]:
        del sys.modules[name]
    app_module = importlib.import_module("backend.app")
    return TestClient(app_module.app)


def test_admin_password_seeded_from_env(monkeypatch, tmp_path):
    with _client_with_env(monkeypatch, tmp_path, RYNCTL_ADMIN_PASSWORD="Str0ngPass!") as c:
        assert c.post("/api/auth/login", json={"username": "admin", "password": "admin"}).status_code == 401
        assert c.post("/api/auth/login", json={"username": "admin", "password": "Str0ngPass!"}).status_code == 200


def test_admin_password_defaults_to_admin_when_unset(monkeypatch, tmp_path):
    with _client_with_env(monkeypatch, tmp_path) as c:
        assert c.post("/api/auth/login", json={"username": "admin", "password": "admin"}).status_code == 200
