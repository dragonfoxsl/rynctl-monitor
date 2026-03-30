import importlib

import pytest


@pytest.fixture
def scheduler_module(app_ctx):
    return importlib.import_module("backend.scheduler")


# ---------------------------------------------------------------------------
# API-level scheduling tests
# ---------------------------------------------------------------------------


def test_create_job_with_schedule_registers_in_scheduler(client, auth_headers, scheduler_module):
    res = client.post(
        "/api/jobs",
        json={
            "name": "scheduled-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "0 * * * *",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    job_id = res.json()["id"]

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is not None


def test_create_job_without_schedule_not_registered(client, auth_headers, scheduler_module):
    res = client.post(
        "/api/jobs",
        json={"name": "unscheduled-job", "source": "/tmp/src", "destination": "/tmp/dst"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    job_id = res.json()["id"]

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None


def test_update_cron_replaces_scheduler_entry(client, auth_headers, scheduler_module):
    create = client.post(
        "/api/jobs",
        json={
            "name": "update-cron-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "0 1 * * *",
        },
        headers=auth_headers,
    )
    job_id = create.json()["id"]
    job_tag = f"rsync_job_{job_id}"

    before = str(scheduler_module.scheduler.get_job(job_tag).trigger)

    client.put(
        f"/api/jobs/{job_id}",
        json={
            "name": "update-cron-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "30 6 * * *",
        },
        headers=auth_headers,
    )

    after = str(scheduler_module.scheduler.get_job(job_tag).trigger)
    assert before != after


def test_disable_schedule_via_update_unregisters_job(client, auth_headers, scheduler_module):
    create = client.post(
        "/api/jobs",
        json={
            "name": "disable-schedule-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "0 3 * * *",
        },
        headers=auth_headers,
    )
    job_id = create.json()["id"]
    job_tag = f"rsync_job_{job_id}"
    assert scheduler_module.scheduler.get_job(job_tag) is not None

    client.put(
        f"/api/jobs/{job_id}",
        json={
            "name": "disable-schedule-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 0,
            "schedule_cron": "0 3 * * *",
        },
        headers=auth_headers,
    )

    assert scheduler_module.scheduler.get_job(job_tag) is None


def test_delete_job_unschedules(client, auth_headers, scheduler_module):
    create = client.post(
        "/api/jobs",
        json={
            "name": "delete-schedule-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "0 4 * * *",
        },
        headers=auth_headers,
    )
    job_id = create.json()["id"]
    job_tag = f"rsync_job_{job_id}"
    assert scheduler_module.scheduler.get_job(job_tag) is not None

    res = client.delete(f"/api/jobs/{job_id}", headers=auth_headers)
    assert res.status_code == 200
    assert scheduler_module.scheduler.get_job(job_tag) is None


def test_enable_schedule_on_existing_job_registers_it(client, auth_headers, scheduler_module):
    """Enabling schedule on a previously unscheduled job should register it."""
    create = client.post(
        "/api/jobs",
        json={"name": "late-schedule-job", "source": "/tmp/src", "destination": "/tmp/dst"},
        headers=auth_headers,
    )
    job_id = create.json()["id"]
    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None

    client.put(
        f"/api/jobs/{job_id}",
        json={
            "name": "late-schedule-job",
            "source": "/tmp/src",
            "destination": "/tmp/dst",
            "schedule_enabled": 1,
            "schedule_cron": "0 5 * * *",
        },
        headers=auth_headers,
    )

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is not None


# ---------------------------------------------------------------------------
# Unit-level scheduler function tests
# ---------------------------------------------------------------------------


def test_schedule_job_adds_cron_trigger_with_correct_args(scheduler_module):
    job_id = 9001
    scheduler_module.schedule_job(job_id, "15 6 * * 1")

    job = scheduler_module.scheduler.get_job(f"rsync_job_{job_id}")
    assert job is not None
    assert job.args == (job_id, "schedule")

    scheduler_module.unschedule_job(job_id)


def test_schedule_job_replaces_existing_entry(scheduler_module):
    job_id = 9002
    scheduler_module.schedule_job(job_id, "0 0 * * *")
    trigger_before = str(scheduler_module.scheduler.get_job(f"rsync_job_{job_id}").trigger)

    scheduler_module.schedule_job(job_id, "30 12 * * *")
    trigger_after = str(scheduler_module.scheduler.get_job(f"rsync_job_{job_id}").trigger)

    assert trigger_before != trigger_after

    scheduler_module.unschedule_job(job_id)


def test_unschedule_job_removes_entry(scheduler_module):
    job_id = 9003
    scheduler_module.schedule_job(job_id, "0 0 * * *")
    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is not None

    scheduler_module.unschedule_job(job_id)
    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None


def test_unschedule_nonexistent_job_does_not_raise(scheduler_module):
    # Should be a no-op
    scheduler_module.unschedule_job(99999)


def test_schedule_job_ignores_too_short_cron(scheduler_module):
    job_id = 9004
    scheduler_module.schedule_job(job_id, "* * * *")  # only 4 fields — invalid

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None


# ---------------------------------------------------------------------------
# load_schedules tests
# ---------------------------------------------------------------------------


def test_load_schedules_registers_enabled_jobs(app_ctx, scheduler_module):
    db_module = app_ctx["database"]
    conn = db_module.get_db()
    try:
        conn.execute(
            """INSERT INTO jobs (name, source, destination, schedule_enabled, schedule_cron)
               VALUES ('auto-loaded', '/tmp/src', '/tmp/dst', 1, '5 5 * * *')"""
        )
        conn.commit()
        job_id = conn.execute(
            "SELECT id FROM jobs WHERE name = 'auto-loaded'"
        ).fetchone()["id"]
    finally:
        conn.close()

    scheduler_module.load_schedules()

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is not None
    scheduler_module.unschedule_job(job_id)


def test_load_schedules_ignores_disabled_jobs(app_ctx, scheduler_module):
    db_module = app_ctx["database"]
    conn = db_module.get_db()
    try:
        conn.execute(
            """INSERT INTO jobs (name, source, destination, schedule_enabled, schedule_cron)
               VALUES ('disabled-job', '/tmp/src', '/tmp/dst', 0, '0 0 * * *')"""
        )
        conn.commit()
        job_id = conn.execute(
            "SELECT id FROM jobs WHERE name = 'disabled-job'"
        ).fetchone()["id"]
    finally:
        conn.close()

    scheduler_module.load_schedules()

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None


def test_load_schedules_ignores_empty_cron(app_ctx, scheduler_module):
    db_module = app_ctx["database"]
    conn = db_module.get_db()
    try:
        conn.execute(
            """INSERT INTO jobs (name, source, destination, schedule_enabled, schedule_cron)
               VALUES ('empty-cron-job', '/tmp/src', '/tmp/dst', 1, '')"""
        )
        conn.commit()
        job_id = conn.execute(
            "SELECT id FROM jobs WHERE name = 'empty-cron-job'"
        ).fetchone()["id"]
    finally:
        conn.close()

    scheduler_module.load_schedules()

    assert scheduler_module.scheduler.get_job(f"rsync_job_{job_id}") is None
