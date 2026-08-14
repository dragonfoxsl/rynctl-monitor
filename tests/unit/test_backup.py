import sqlite3


def test_restore_rejects_corrupt_sqlite_file(client, auth_headers, tmp_path):
    bad_db = tmp_path / "bad.db"
    bad_db.write_bytes(b"SQLite format 3\x00" + b"not actually a database" * 20)

    with bad_db.open("rb") as fh:
      res = client.post(
          "/api/backup/restore",
          files={"file": ("bad.db", fh, "application/octet-stream")},
          headers=auth_headers,
      )

    assert res.status_code == 400
    assert "integrity" in res.json()["detail"].lower()


def test_backup_download_does_not_leave_snapshot_file(client, auth_headers, app_ctx):
    res = client.get("/api/backup/download", headers=auth_headers)

    assert res.status_code == 200
    leftovers = list(app_ctx["data_dir"].glob("rynctl_backup_*.db"))
    assert leftovers == []


def test_restore_replaces_wal_database_atomically(client, auth_headers, app_ctx):
    snapshot = client.get("/api/backup/download", headers=auth_headers).content
    created = client.post(
        "/api/users",
        json={"username": "after-snapshot", "password": "Str0ngPass!", "role": "readonly"},
        headers=auth_headers,
    )
    assert created.status_code == 200
    for suffix in ("-wal", "-shm"):
        (app_ctx["data_dir"] / f"rynctl.db{suffix}").write_bytes(b"stale")

    restored = client.post(
        "/api/backup/restore",
        files={"file": ("backup.db", snapshot, "application/octet-stream")},
        headers=auth_headers,
    )

    assert restored.status_code == 200
    assert all(user["username"] != "after-snapshot" for user in client.get("/api/users").json())
    assert list(app_ctx["data_dir"].glob("rynctl_pre_restore_*.db"))


def test_restore_migrates_old_schema_and_reseeds_admin(client, auth_headers, app_ctx, tmp_path):
    backup = tmp_path / "old.db"
    backup.write_bytes(client.get("/api/backup/download", headers=auth_headers).content)
    with sqlite3.connect(backup) as conn:
        conn.execute("DELETE FROM sessions")
        conn.execute("DELETE FROM users")
        conn.execute("ALTER TABLE jobs DROP COLUMN tags")

    with backup.open("rb") as fh:
        restored = client.post(
            "/api/backup/restore",
            files={"file": ("old.db", fh, "application/octet-stream")},
            headers=auth_headers,
        )

    assert restored.status_code == 200
    with sqlite3.connect(app_ctx["data_dir"] / "rynctl.db") as conn:
        assert "tags" in {row[1] for row in conn.execute("PRAGMA table_info(jobs)")}
        assert conn.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0] == 1
    assert client.post(
        "/api/auth/login", json={"username": "admin", "password": "TestAdmin123!"}
    ).status_code == 200


def test_restore_rejects_while_job_work_is_pending(client, auth_headers, app_ctx, tmp_path):
    backup = tmp_path / "backup.db"
    backup.write_bytes(client.get("/api/backup/download", headers=auth_headers).content)
    runner = app_ctx["job_runner"]
    assert runner.reserve_job_deletion(999)
    try:
        with backup.open("rb") as fh:
            restored = client.post(
                "/api/backup/restore",
                files={"file": ("backup.db", fh, "application/octet-stream")},
                headers=auth_headers,
            )
    finally:
        runner.release_job_deletion(999)

    assert restored.status_code == 409
    assert "queued or running" in restored.json()["detail"]
