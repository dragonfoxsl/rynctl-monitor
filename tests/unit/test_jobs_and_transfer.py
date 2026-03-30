def test_job_crud_and_last_run_field(client, auth_headers, db):
    create = client.post(
        "/api/jobs",
        json={
            "name": "backup",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "tags": "prod,daily",
        },
        headers=auth_headers,
    )
    assert create.status_code == 200
    job_id = create.json()["id"]

    db.execute(
        "INSERT INTO job_runs (job_id, status, bytes_transferred) VALUES (?, 'success', 42)",
        (job_id,),
    )
    db.commit()

    jobs = client.get("/api/jobs")
    assert jobs.status_code == 200
    payload = jobs.json()[0]
    assert payload["last_run"] is not None
    assert payload["last_status"] == "success"
    assert payload["total_data"] == 42


def test_invalid_cron_is_rejected(client, auth_headers):
    res = client.post(
        "/api/jobs",
        json={
            "name": "bad-cron",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "nope",
        },
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert "Invalid cron expression" in res.json()["detail"]


def test_import_preserves_retry_tags_and_schedule(client, auth_headers):
    create = client.post(
        "/api/jobs",
        json={
            "name": "export-me",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "tags": "blue,nightly",
            "retry_max": 3,
            "retry_delay": 45,
            "schedule_enabled": 1,
            "schedule_cron": "0 2 * * *",
        },
        headers=auth_headers,
    )
    assert create.status_code == 200

    exported = client.get("/api/jobs/export")
    assert exported.status_code == 200
    jobs = exported.json()["jobs"]
    jobs[0]["name"] = "imported-copy"

    imported = client.post("/api/jobs/import", json={"jobs": jobs}, headers=auth_headers)
    assert imported.status_code == 200
    assert imported.json()["created"] == 1

    listing = client.get("/api/jobs").json()
    imported_job = next(job for job in listing if job["name"] == "imported-copy")
    assert imported_job["tags"] == "blue,nightly"
    assert imported_job["retry_max"] == 3
    assert imported_job["retry_delay"] == 45
    assert imported_job["schedule_cron"] == "0 2 * * *"


def test_browse_rejects_path_outside_allowed_root(client, auth_headers, tmp_path):
    res = client.post(
        "/api/browse",
        json={"path": str(tmp_path)},
        headers=auth_headers,
    )
    assert res.status_code == 403


def test_manual_run_rejects_overlap(client, auth_headers, db):
    create = client.post(
        "/api/jobs",
        json={"name": "busy-job", "source": "/tmp/src", "destination": "/tmp/dst"},
        headers=auth_headers,
    )
    assert create.status_code == 200
    job_id = create.json()["id"]

    db.execute(
        "INSERT INTO job_runs (job_id, status, log_file, attempt) VALUES (?, 'running', ?, 1)",
        (job_id, "/tmp/fake.log"),
    )
    db.commit()

    res = client.post(f"/api/jobs/{job_id}/run", headers=auth_headers)
    assert res.status_code == 409
    assert "already running" in res.json()["detail"]


def test_manual_run_rejects_already_queued(client, auth_headers, monkeypatch):
    create = client.post(
        "/api/jobs",
        json={"name": "queued-job", "source": "/tmp/src", "destination": "/tmp/dst"},
        headers=auth_headers,
    )
    assert create.status_code == 200
    job_id = create.json()["id"]

    monkeypatch.setattr("backend.routes.jobs.enqueue_job", lambda *_args, **_kwargs: "queued")

    res = client.post(f"/api/jobs/{job_id}/run", headers=auth_headers)
    assert res.status_code == 409
    assert "already queued" in res.json()["detail"]


def test_recover_running_jobs_marks_stale_failed(db, rsync_module):
    db.execute(
        "INSERT INTO jobs (name, source, destination) VALUES ('stale', '/tmp/src', '/tmp/dst')"
    )
    job_id = db.execute("SELECT id FROM jobs WHERE name = 'stale'").fetchone()["id"]
    db.execute(
        "INSERT INTO job_runs (job_id, status, log_file, attempt) VALUES (?, 'running', ?, 1)",
        (job_id, "/tmp/stale.log"),
    )
    db.commit()

    recovered = rsync_module.recover_running_jobs()
    assert recovered == 1

    row = db.execute("SELECT status, exit_code, error_message FROM job_runs").fetchone()
    assert row["status"] == "failed"
    assert row["exit_code"] == rsync_module.STALE_RUN_EXIT_CODE
    assert "application restart" in row["error_message"]


def test_run_rsync_job_times_out(db, rsync_module, monkeypatch):
    db.execute(
        """INSERT INTO jobs (name, source, destination, max_runtime)
           VALUES ('timeout-job', '/tmp/src', '/tmp/dst', 1)"""
    )
    db.commit()
    job_id = db.execute("SELECT id FROM jobs WHERE name = 'timeout-job'").fetchone()["id"]

    monkeypatch.setattr(
        rsync_module,
        "build_rsync_command",
        lambda job: ["python", "-c", "import time; time.sleep(2)"],
    )

    result = rsync_module.run_rsync_job(job_id)
    assert result is None

    row = db.execute(
        "SELECT status, exit_code, error_message FROM job_runs WHERE job_id = ? ORDER BY id DESC LIMIT 1",
        (job_id,),
    ).fetchone()
    assert row["status"] == "failed"
    assert row["exit_code"] == rsync_module.RUN_TIMEOUT_EXIT_CODE
    assert "Timed out" in row["error_message"]


def test_enqueue_job_deduplicates_queue(job_runner_module, monkeypatch):
    monkeypatch.setattr(job_runner_module, "job_has_running_run", lambda _job_id: False)
    with job_runner_module._lock:
        job_runner_module._queued_job_ids.clear()

    assert job_runner_module.enqueue_job(7, "manual") == "enqueued"
    assert job_runner_module.enqueue_job(7, "manual") == "queued"

    with job_runner_module._lock:
        job_runner_module._queued_job_ids.clear()
