"""
Centralized in-process job runner.
Routes and schedulers enqueue jobs here instead of spawning ad hoc threads.
"""

import logging
import queue
import threading

from backend.rsync import job_has_running_run, run_rsync_job

logger = logging.getLogger(__name__)

_queue: queue.Queue[tuple[int, str]] = queue.Queue()
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
    _queue.put((-1, "shutdown"))
    thread = _worker_thread
    if thread and thread.is_alive():
        thread.join(timeout=5)
    logger.info("Job runner stopped")


def enqueue_job(job_id: int, source: str = "manual") -> str:
    with _lock:
        if job_has_running_run(job_id):
            return "running"
        if job_id in _queued_job_ids:
            return "queued"
        _queued_job_ids.add(job_id)
        _queue.put((job_id, source))
        return "enqueued"


def queued_jobs() -> list[int]:
    with _lock:
        return sorted(_queued_job_ids)


def _worker_loop():
    while not _stop_event.is_set():
        job_id, source = _queue.get()
        try:
            if job_id == -1:
                continue

            logger.info("Dequeued job %d from %s trigger", job_id, source)
            run_rsync_job(job_id)
        except Exception:
            logger.exception("Unhandled job runner exception for job %d", job_id)
        finally:
            if job_id != -1:
                with _lock:
                    _queued_job_ids.discard(job_id)
            _queue.task_done()
