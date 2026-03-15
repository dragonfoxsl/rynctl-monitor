"""
rsync command builder and job execution.
Builds CLI commands from job config, runs them in daemon threads,
supports automatic retries and webhook notifications.
"""

import logging
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path

from backend.database import LOGS_DIR, get_db
from backend.metrics import metrics
from backend.notifications import send_webhook

logger = logging.getLogger(__name__)


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


def run_rsync_job(job_id: int, attempt: int = 1):
    """Execute an rsync job with optional retries, logging, and webhook notifications."""
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            logger.warning("Job %d not found, skipping", job_id)
            return
        job = dict(job)
    finally:
        conn.close()

    retry_max = job.get("retry_max", 0)
    retry_delay = job.get("retry_delay", 30)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    log_path = LOGS_DIR / f"job_{job_id}_{timestamp}.log"

    logger.info("Starting job '%s' (id=%d, attempt=%d)", job.get("name"), job_id, attempt)
    metrics.inc("rynctl_job_runs_started")

    # Create a run record
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO job_runs (job_id, status, log_file, attempt) VALUES (?, 'running', ?, ?)",
            (job_id, str(log_path), attempt),
        )
        conn.commit()
        run_id = cur.lastrowid
    finally:
        conn.close()

    try:
        cmd = build_rsync_command(job)
        with open(log_path, "w") as log_f:
            log_f.write(f"Command: {' '.join(cmd)}\n")
            log_f.write(f"Started: {datetime.utcnow().isoformat()}\n")
            log_f.write(f"Attempt: {attempt}\n")
            log_f.write("-" * 60 + "\n")
            log_f.flush()

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            output_lines = []
            for line in proc.stdout:
                log_f.write(line)
                log_f.flush()
                output_lines.append(line)

            proc.wait()

        full_output = "".join(output_lines)
        rsync_stats = parse_rsync_stats(full_output)

        status = "success" if proc.returncode == 0 else "failed"
        error_msg = None
        if proc.returncode != 0:
            error_msg = full_output[-500:] if len(full_output) > 500 else full_output

        conn = get_db()
        try:
            conn.execute(
                """UPDATE job_runs
                   SET status = ?, finished_at = datetime('now'), exit_code = ?,
                       bytes_transferred = ?, files_transferred = ?, total_size = ?,
                       error_message = ?
                   WHERE id = ?""",
                (status, proc.returncode, rsync_stats["bytes_transferred"],
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
        run_data = {"id": run_id, "status": status, "exit_code": proc.returncode,
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
