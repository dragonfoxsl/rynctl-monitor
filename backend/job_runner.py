"""
Centralized in-process job runner.
Routes and schedulers enqueue jobs here instead of spawning ad hoc threads.
"""

import logging
import queue
import threading

from backend.rsync import RetryScheduled, job_has_running_run, run_rsync_job

logger = logging.getLogger(__name__)

# Queue items are (job_id, source, attempt). job_id == -1 is the shutdown sentinel.
_queue: queue.Queue[tuple[int, str, int]] = queue.Queue()
_queued_job_ids: set[int] = set()
_lock = threading.Lock()
_stop_event = threading.Event()
_worker_thread: threading.Thread | None = None


def start_runner():
    global _worker_thread
    with _lock:
        if _worker_thread and _worker_thread.is_alive():
            return
        _stop_event.clear()
        _worker_thread = threading.Thread(target=_worker_loop, name="rynctl-job-runner", daemon=True)
        _worker_thread.start()
        logger.info("Job runner started")


def stop_runner():
    _stop_event.set()
    _queue.put((-1, "shutdown", 1))
    thread = _worker_thread
    if thread and thread.is_alive():
        thread.join(timeout=5)
    logger.info("Job runner stopped")


def enqueue_job(job_id: int, source: str = "manual", attempt: int = 1) -> str:
    with _lock:
        if job_has_running_run(job_id):
            return "running"
        if job_id in _queued_job_ids:
            return "queued"
        _queued_job_ids.add(job_id)
        _queue.put((job_id, source, attempt))
        return "enqueued"


def queued_jobs() -> list[int]:
    with _lock:
        return sorted(_queued_job_ids)


def _schedule_retry(job_id: int, attempt: int, delay: int):
    """Re-enqueue a failed job after a delay without blocking the worker thread."""
    def _fire():
        state = enqueue_job(job_id, "retry", attempt=attempt)
        logger.info("Retry of job %d (attempt %d) %s", job_id, attempt, state)

    timer = threading.Timer(max(delay, 0), _fire)
    timer.daemon = True
    timer.start()


def _worker_loop():
    while not _stop_event.is_set():
        job_id, source, attempt = _queue.get()
        retry = None
        try:
            if job_id == -1:
                continue

            logger.info("Dequeued job %d from %s trigger (attempt %d)", job_id, source, attempt)
            retry = run_rsync_job(job_id, attempt)
        except Exception:
            logger.exception("Unhandled job runner exception for job %d", job_id)
        finally:
            if job_id != -1:
                with _lock:
                    _queued_job_ids.discard(job_id)
            _queue.task_done()

        # Schedule retry only after the job has been removed from the queued
        # set, so the re-enqueue isn't rejected as a duplicate.
        if isinstance(retry, RetryScheduled):
            _schedule_retry(job_id, retry.attempt, retry.delay)
