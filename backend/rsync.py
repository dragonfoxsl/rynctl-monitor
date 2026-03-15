"""
rsync command builder and job execution.
Builds CLI commands from job config and runs them in daemon threads.
"""

import re
import subprocess
from datetime import datetime
from pathlib import Path

from backend.database import LOGS_DIR, get_db


def build_rsync_command(job: dict) -> list[str]:
    """Convert a job dict into an rsync command-line argument list."""
    cmd = ["rsync"]

    flags = job.get("flags") or "-avh"
    cmd.append(flags)

    # --exclude patterns (one per line)
    if job.get("exclude_patterns"):
        for pattern in job["exclude_patterns"].splitlines():
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


def run_rsync_job(job_id: int):
    """Execute an rsync job, log output, and record results in the DB."""
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            return
        job = dict(job)
    finally:
        conn.close()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    log_path = LOGS_DIR / f"job_{job_id}_{timestamp}.log"

    # Create a run record
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO job_runs (job_id, status, log_file) VALUES (?, 'running', ?)",
            (job_id, str(log_path)),
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
        stats = parse_rsync_stats(full_output)

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
                (status, proc.returncode, stats["bytes_transferred"],
                 stats["files_transferred"], stats["total_size"], error_msg, run_id),
            )
            conn.commit()
        finally:
            conn.close()

    except Exception as exc:
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
