def test_security_headers_present_on_responses(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Referrer-Policy" in res.headers
    assert "Content-Security-Policy" in res.headers


def test_hsts_only_when_secure_cookies(monkeypatch, tmp_path):
    import importlib
    import sys
    from fastapi.testclient import TestClient

    monkeypatch.setenv("RYNCTL_DATA_DIR", str(tmp_path / "d"))
    monkeypatch.setenv("RYNCTL_SECRET", "test-secret")
    monkeypatch.setenv("RYNCTL_SECURE_COOKIES", "true")
    for name in [n for n in sys.modules if n == "backend" or n.startswith("backend.")]:
        del sys.modules[name]
    app_module = importlib.import_module("backend.app")
    with TestClient(app_module.app) as c:
        res = c.get("/api/health")
        assert "Strict-Transport-Security" in res.headers
