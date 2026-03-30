"""
rsync command builder and job execution.
Builds CLI commands from job config, runs them in daemon threads,
supports automatic retries and webhook notifications.
"""

import logging
import re
import subprocess
import threading
import time
from pathlib import Path

from backend.config import JOB_TIMEOUT_SECS
from backend.database import LOGS_DIR, get_db
from backend.metrics import metrics
from backend.notifications import send_webhook
from backend.time_utils import utc_now

logger = logging.getLogger(__name__)

RUN_TIMEOUT_EXIT_CODE = -2
STALE_RUN_EXIT_CODE = -3
_run_lock = threading.Lock()


def build_rsync_command(job: dict) -> list[str]:
    """Convert a job dict into an rsync command-line argument list."""
    cmd = ["rsync"]

    flags = job.get("flags") or "-avh"
    cmd.append(flags)

    # --exclude patterns (one per line or comma-separated)
    if job.get("exclude_patterns"):
        for pattern in job["exclude_patterns"].replace(",", "\n").splitlines():
            pattern = pattern.strip()
            if pattern:
                cmd.extend(["--exclude", pattern])

    if job.get("bandwidth_limit"):
        cmd.extend(["--bwlimit", job["bandwidth_limit"]])

    if job.get("custom_flags"):
        cmd.extend(job["custom_flags"].split())

    # Always append --stats for metric parsing
    cmd.append("--stats")

    # SSH transport options
    ssh_parts = []
    if job.get("ssh_port"):
        ssh_parts.append(f"-p {job['ssh_port']}")
    if job.get("ssh_key"):
        ssh_parts.append(f"-i {job['ssh_key']}")
    if ssh_parts:
        cmd.extend(["-e", "ssh " + " ".join(ssh_parts)])

    source = job["source"]
    dest = job["destination"]

    if job.get("remote_host"):
        dest = f"{job['remote_host']}:{dest}"

    cmd.extend([source, dest])
    return cmd


def parse_rsync_stats(output: str) -> dict:
    """Extract transfer statistics from rsync --stats output."""
    stats = {"bytes_transferred": 0, "files_transferred": 0, "total_size": 0}

    m = re.search(r"Total transferred file size:\s+([\d,]+)", output)
    if m:
        stats["bytes_transferred"] = int(m.group(1).replace(",", ""))

    m = re.search(r"Number of (?:regular )?files transferred:\s+([\d,]+)", output)
    if m:
        stats["files_transferred"] = int(m.group(1).replace(",", ""))

    m = re.search(r"Total file size:\s+([\d,]+)", output)
    if m:
        stats["total_size"] = int(m.group(1).replace(",", ""))

    return stats


def job_has_running_run(job_id: int) -> bool:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT 1 FROM job_runs WHERE job_id = ? AND status = 'running' LIMIT 1",
            (job_id,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def recover_running_jobs() -> int:
    """Mark interrupted running jobs as failed on startup."""
    conn = get_db()
    try:
        cur = conn.execute(
            """UPDATE job_runs
               SET status = 'failed',
                   finished_at = datetime('now'),
                   exit_code = ?,
                   error_message = ?
               WHERE status = 'running'""",
            (STALE_RUN_EXIT_CODE, "Marked failed after application restart"),
        )
        conn.commit()
        recovered = cur.rowcount or 0
        if recovered:
            logger.warning("Recovered %d interrupted running job(s) after startup", recovered)
        return recovered
    finally:
        conn.close()


def _reserve_job_run(job_id: int, attempt: int, log_path: Path):
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            conn.rollback()
            return None, None, "missing"

        running = conn.execute(
            "SELECT id FROM job_runs WHERE job_id = ? AND status = 'running' LIMIT 1",
            (job_id,),
        ).fetchone()
        if running:
            conn.rollback()
            return dict(job), None, "running"

        cur = conn.execute(
            "INSERT INTO job_runs (job_id, status, log_file, attempt) VALUES (?, 'running', ?, ?)",
            (job_id, str(log_path), attempt),
        )
        conn.commit()
        return dict(job), cur.lastrowid, "started"
    finally:
        conn.close()


def run_rsync_job(job_id: int, attempt: int = 1):
    """Execute an rsync job with optional retries, logging, and webhook notifications."""
    timestamp = utc_now().strftime("%Y%m%d_%H%M%S")
    log_path = LOGS_DIR / f"job_{job_id}_{timestamp}.log"
    with _run_lock:
        job, run_id, state = _reserve_job_run(job_id, attempt, log_path)

    if state == "missing":
        logger.warning("Job %d not found, skipping", job_id)
        return "missing"
    if state == "running":
        logger.warning("Job %d is already running, skipping overlapping execution", job_id)
        metrics.inc("rynctl_job_runs_skipped", labels={"reason": "already_running"})
        return "already_running"

    retry_max = job.get("retry_max", 0)
    retry_delay = job.get("retry_delay", 30)
    max_runtime = max(int(job.get("max_runtime") or JOB_TIMEOUT_SECS or 0), 0)

    logger.info("Starting job '%s' (id=%d, attempt=%d)", job.get("name"), job_id, attempt)
    metrics.inc("rynctl_job_runs_started")

    try:
        cmd = build_rsync_command(job)
        with open(log_path, "w") as log_f:
            log_f.write(f"Command: {' '.join(cmd)}\n")
            log_f.write(f"Started: {utc_now().isoformat()}\n")
            log_f.write(f"Attempt: {attempt}\n")
            if max_runtime > 0:
                log_f.write(f"Max runtime: {max_runtime}s\n")
            log_f.write("-" * 60 + "\n")
            log_f.flush()

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            timed_out = False
            try:
                full_output, _ = proc.communicate(timeout=max_runtime if max_runtime > 0 else None)
            except subprocess.TimeoutExpired:
                timed_out = True
                proc.kill()
                full_output, _ = proc.communicate()

            log_f.write(full_output or "")
            if timed_out:
                log_f.write(f"\nTimed out after {max_runtime} second(s)\n")
            log_f.flush()

        rsync_stats = parse_rsync_stats(full_output or "")

        if timed_out:
            status = "failed"
            exit_code = RUN_TIMEOUT_EXIT_CODE
            error_msg = f"Timed out after {max_runtime} second(s)"
        else:
            exit_code = proc.returncode
            status = "success" if exit_code == 0 else "failed"
            error_msg = None
            if exit_code != 0:
                error_msg = full_output[-500:] if len(full_output) > 500 else full_output

        conn = get_db()
        try:
            conn.execute(
                """UPDATE job_runs
                   SET status = ?, finished_at = datetime('now'), exit_code = ?,
                       bytes_transferred = ?, files_transferred = ?, total_size = ?,
                       error_message = ?
                   WHERE id = ?""",
                (status, exit_code, rsync_stats["bytes_transferred"],
                 rsync_stats["files_transferred"], rsync_stats["total_size"], error_msg, run_id),
            )
            conn.commit()
        finally:
            conn.close()

        # Update metrics
        metrics.inc("rynctl_job_runs_completed", labels={"status": status})
        metrics.inc("rynctl_bytes_synced", rsync_stats["bytes_transferred"])

        logger.info(
            "Job '%s' (id=%d) %s — %d files, %d bytes",
            job.get("name"), job_id, status,
            rsync_stats["files_transferred"], rsync_stats["bytes_transferred"],
        )

        # Build run data for webhook
        run_data = {"id": run_id, "status": status, "exit_code": exit_code,
                    "error_message": error_msg, "bytes_transferred": rsync_stats["bytes_transferred"],
                    "files_transferred": rsync_stats["files_transferred"]}

        if status == "failed":
            send_webhook(job, run_data, "failure")
            # Auto-retry if configured and attempts remain
            if retry_max > 0 and attempt < retry_max:
                logger.info("Retrying job '%s' in %ds (attempt %d/%d)", job.get("name"), retry_delay, attempt + 1, retry_max)
                time.sleep(retry_delay)
                run_rsync_job(job_id, attempt + 1)
        else:
            send_webhook(job, run_data, "success")

    except Exception as exc:
        logger.error("Job %d exception: %s", job_id, exc)
        metrics.inc("rynctl_job_runs_completed", labels={"status": "error"})

        conn = get_db()
        try:
            conn.execute(
                """UPDATE job_runs
                   SET status = 'failed', finished_at = datetime('now'),
                       exit_code = -1, error_message = ?
                   WHERE id = ?""",
                (str(exc), run_id),
            )
            conn.commit()
        finally:
            conn.close()

        try:
            with open(log_path, "a") as log_f:
                log_f.write(f"\nEXCEPTION: {exc}\n")
        except Exception:
            pass

        if retry_max > 0 and attempt < retry_max:
            logger.info("Retrying job %d after exception in %ds", job_id, retry_delay)
            time.sleep(retry_delay)
            run_rsync_job(job_id, attempt + 1)
