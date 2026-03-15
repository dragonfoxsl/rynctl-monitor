"""
Webhook notifications for job events.
Sends POST requests with job run details when configured.
"""

import json
import logging
import urllib.request
import urllib.error

from backend.config import WEBHOOK_URL, WEBHOOK_EVENTS

logger = logging.getLogger(__name__)


def send_webhook(job: dict, run: dict, event: str = "failure"):
    """Send a webhook notification if configured and event matches filter."""
    if not WEBHOOK_URL:
        return

    # Check if this event type should trigger a webhook
    events = WEBHOOK_EVENTS.lower()
    if events != "all" and event not in events:
        return

    payload = {
        "event": event,
        "job": {
            "id": job.get("id"),
            "name": job.get("name"),
            "source": job.get("source"),
            "destination": job.get("destination"),
        },
        "run": {
            "id": run.get("id"),
            "status": run.get("status"),
            "exit_code": run.get("exit_code"),
            "error_message": run.get("error_message", ""),
            "started_at": run.get("started_at"),
            "finished_at": run.get("finished_at"),
            "bytes_transferred": run.get("bytes_transferred", 0),
            "files_transferred": run.get("files_transferred", 0),
        },
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            WEBHOOK_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info("Webhook sent for job %s (%s): %d", job.get("name"), event, resp.status)
    except Exception as exc:
        logger.error("Webhook failed for job %s: %s", job.get("name"), exc)
