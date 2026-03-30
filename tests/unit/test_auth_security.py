from datetime import timedelta

from backend.time_utils import format_db_timestamp, utc_now


def test_login_and_me(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert res.status_code == 200

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "admin"


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
    token = client.cookies.get("session_token")
    expired = format_db_timestamp(utc_now() - timedelta(days=1))
    db.execute("UPDATE sessions SET expires_at = ? WHERE token = ?", (expired, token))
    db.commit()

    me = client.get("/api/auth/me")
    assert me.status_code == 401
