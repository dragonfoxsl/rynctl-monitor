from datetime import timedelta

from backend.time_utils import format_db_timestamp, utc_now


def test_verify_password_roundtrip_and_rejection(app_ctx):
    security = app_ctx["security"]
    stored = security.hash_password("Sup3rSecret")
    assert security.verify_password("Sup3rSecret", stored) is True
    assert security.verify_password("wrong", stored) is False
    assert security.verify_password("anything", "not-a-valid-hash") is False


def test_login_and_me(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "admin"


def test_session_cookie_is_signed_not_raw_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    raw_token = res.json()["token"]
    cookie_value = client.cookies.get("session_token")
    # The cookie carries the token plus an HMAC signature, not the bare token.
    assert cookie_value != raw_token
    assert cookie_value.startswith(raw_token + ".")


def test_unsigned_or_tampered_cookie_is_rejected(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    raw_token = res.json()["token"]

    # A raw DB token (as if leaked from the database) without a valid signature
    # must not be accepted as a browser cookie.
    client.cookies.set("session_token", raw_token)
    assert client.get("/api/auth/me").status_code == 401

    client.cookies.set("session_token", f"{raw_token}.deadbeef")
    assert client.get("/api/auth/me").status_code == 401


def test_secure_cookie_flag_honored(monkeypatch, tmp_path):
    import importlib
    import sys

    monkeypatch.setenv("RYNCTL_DATA_DIR", str(tmp_path / "d"))
    monkeypatch.setenv("RYNCTL_SECRET", "test-secret")
    monkeypatch.setenv("RYNCTL_SECURE_COOKIES", "true")
    for name in [n for n in sys.modules if n == "backend" or n.startswith("backend.")]:
        del sys.modules[name]
    from fastapi.testclient import TestClient

    app_module = importlib.import_module("backend.app")
    with TestClient(app_module.app) as c:
        res = c.post("/api/auth/login", json={"username": "admin", "password": "admin"})
        assert "secure" in res.headers.get("set-cookie", "").lower()


def test_csrf_required_for_mutation(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert login.status_code == 200

    res = client.post(
        "/api/jobs",
        json={"name": "job", "source": "/tmp/src", "destination": "/tmp/dst"},
    )
    assert res.status_code == 403
    assert "CSRF" in res.json()["detail"]


def test_login_lockout_persists_in_database(client, db):
    for _ in range(5):
        res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
        assert res.status_code == 401

    locked = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert locked.status_code == 403

    row = db.execute(
        "SELECT failed_login_attempts, lockout_until FROM users WHERE username = 'admin'"
    ).fetchone()
    assert row["failed_login_attempts"] == 5
    assert row["lockout_until"] is not None


def test_expired_session_is_rejected(client, auth_headers, db):
    # Cookie value is 'token.signature'; the DB row is keyed by the raw token.
    token = client.cookies.get("session_token").rpartition(".")[0]
    expired = format_db_timestamp(utc_now() - timedelta(days=1))
    db.execute("UPDATE sessions SET expires_at = ? WHERE token = ?", (expired, token))
    db.commit()

    me = client.get("/api/auth/me")
    assert me.status_code == 401
