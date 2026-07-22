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
