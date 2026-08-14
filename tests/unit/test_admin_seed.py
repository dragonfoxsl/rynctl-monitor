import importlib
import sys

import pytest
from fastapi.testclient import TestClient


def _client_with_env(monkeypatch, tmp_path, **env):
    monkeypatch.setenv("RYNCTL_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("RYNCTL_SECRET", "unit-test-secret-0123456789abcdef")
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


def test_missing_admin_password_fails_startup(monkeypatch, tmp_path):
    monkeypatch.delenv("RYNCTL_ADMIN_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="RYNCTL_ADMIN_PASSWORD"):
        _client_with_env(monkeypatch, tmp_path)


@pytest.mark.parametrize("password", ["short", "alllowercase1", "ALLUPPERCASE1"])
def test_weak_admin_password_fails_startup(monkeypatch, tmp_path, password):
    with pytest.raises(RuntimeError, match="RYNCTL_ADMIN_PASSWORD"):
        _client_with_env(monkeypatch, tmp_path, RYNCTL_ADMIN_PASSWORD=password)


def test_short_secret_fails_startup(monkeypatch, tmp_path):
    with pytest.raises(RuntimeError, match="RYNCTL_SECRET"):
        _client_with_env(
            monkeypatch,
            tmp_path,
            RYNCTL_SECRET="short",
            RYNCTL_ADMIN_PASSWORD="Str0ngPass!",
        )
