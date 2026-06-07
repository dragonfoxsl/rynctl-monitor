def test_performance_indexes_exist(db):
    rows = db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index'"
    ).fetchall()
    names = {r["name"] for r in rows}
    assert "idx_job_runs_job_id" in names
    assert "idx_audit_log_created_at" in names
    assert "idx_sessions_expires_at" in names
