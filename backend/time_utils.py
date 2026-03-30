"""
UTC datetime helpers.
"""

from datetime import UTC, datetime


DB_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


def utc_now() -> datetime:
    return datetime.now(UTC)


def format_db_timestamp(value: datetime) -> str:
    return value.astimezone(UTC).strftime(DB_TIMESTAMP_FORMAT)


def parse_db_timestamp(value: str) -> datetime:
    return datetime.strptime(value, DB_TIMESTAMP_FORMAT).replace(tzinfo=UTC)
