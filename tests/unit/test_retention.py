def test_prune_old_runs_deletes_old_and_keeps_recent(app_ctx):
    database = app_ctx["database"]
    logs_dir = database.LOGS_DIR
    conn = database.get_db()
    try:
        conn.execute("INSERT INTO jobs (name, source, destination) VALUES ('p','/s','/d')")
        job_id = conn.execute("SELECT id FROM jobs WHERE name='p'").fetchone()["id"]

        old_log = logs_dir / "job_old.log"
        old_log.write_text("old")
        recent_log = logs_dir / "job_recent.log"
        recent_log.write_text("recent")

        # One run finished 60 days ago, one finished now.
        conn.execute(
            "INSERT INTO job_runs (job_id, status, finished_at, log_file) "
            "VALUES (?, 'success', datetime('now','-60 days'), ?)",
            (job_id, str(old_log)),
        )
        conn.execute(
            "INSERT INTO job_runs (job_id, status, finished_at, log_file) "
            "VALUES (?, 'success', datetime('now'), ?)",
            (job_id, str(recent_log)),
        )
        conn.commit()
    finally:
        conn.close()

    deleted = database.prune_old_runs(30)
    assert deleted == 1

    conn = database.get_db()
    try:
        remaining = conn.execute("SELECT COUNT(*) AS c FROM job_runs").fetchone()["c"]
        assert remaining == 1
    finally:
        conn.close()

    assert not old_log.exists()      # old run's log removed
    assert recent_log.exists()       # recent run untouched


def test_prune_disabled_when_zero(app_ctx):
    database = app_ctx["database"]
    conn = database.get_db()
    try:
        conn.execute("INSERT INTO jobs (name, source, destination) VALUES ('q','/s','/d')")
        job_id = conn.execute("SELECT id FROM jobs WHERE name='q'").fetchone()["id"]
        conn.execute(
            "INSERT INTO job_runs (job_id, status, finished_at) "
            "VALUES (?, 'success', datetime('now','-999 days'))",
            (job_id,),
        )
        conn.commit()
    finally:
        conn.close()

    assert database.prune_old_runs(0) == 0  # retention disabled keeps everything
