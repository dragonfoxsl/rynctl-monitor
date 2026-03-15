"""
Prometheus-compatible metrics collector.
Tracks request counts, durations, and rsync job metrics.
"""

import threading
import time


class MetricsCollector:
    """Thread-safe metrics storage with Prometheus text format export."""

    def __init__(self):
        self._lock = threading.Lock()
        self._counters: dict[str, int] = {}
        self._gauges: dict[str, float] = {}
        self._histograms: dict[str, list[float]] = {}

    def inc(self, name: str, value: int = 1, labels: dict = None):
        key = self._key(name, labels)
        with self._lock:
            self._counters[key] = self._counters.get(key, 0) + value

    def set_gauge(self, name: str, value: float, labels: dict = None):
        key = self._key(name, labels)
        with self._lock:
            self._gauges[key] = value

    def observe(self, name: str, value: float, labels: dict = None):
        key = self._key(name, labels)
        with self._lock:
            if key not in self._histograms:
                self._histograms[key] = []
            self._histograms[key].append(value)

    def export(self) -> str:
        """Export all metrics in Prometheus text exposition format."""
        lines = []
        with self._lock:
            for key, val in sorted(self._counters.items()):
                lines.append(f"{key} {val}")
            for key, val in sorted(self._gauges.items()):
                lines.append(f"{key} {val}")
            for key, vals in sorted(self._histograms.items()):
                if vals:
                    lines.append(f"{key}_count {len(vals)}")
                    lines.append(f"{key}_sum {sum(vals):.3f}")
        return "\n".join(lines) + "\n"

    @staticmethod
    def _key(name: str, labels: dict = None) -> str:
        if not labels:
            return name
        lbl = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{lbl}}}"


# Global singleton
metrics = MetricsCollector()
