"""
Typed request models for API endpoints.
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    username: str = ""
    password: str = ""

    @field_validator("username", "password", mode="before")
    @classmethod
    def _strip_strings(cls, value):
        return value.strip() if isinstance(value, str) else value


class JobPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    remote_host: str = ""
    ssh_port: str = ""
    ssh_key: str = ""
    flags: str = "-avh"
    exclude_patterns: str = ""
    bandwidth_limit: str = ""
    custom_flags: str = ""
    tags: str = ""
    schedule_cron: str = ""
    schedule_enabled: int = 0
    retry_max: int = 0
    retry_delay: int = 30
    max_runtime: int = 0

    @field_validator(
        "name",
        "source",
        "destination",
        "remote_host",
        "ssh_port",
        "ssh_key",
        "flags",
        "exclude_patterns",
        "bandwidth_limit",
        "custom_flags",
        "tags",
        "schedule_cron",
        mode="before",
    )
    @classmethod
    def _string_defaults(cls, value):
        if value is None:
            return ""
        return value.strip() if isinstance(value, str) else value


class JobsImportRequest(BaseModel):
    jobs: list[JobPayload] = Field(default_factory=list)


class SSHTestRequest(BaseModel):
    host: str
    port: str = "22"
    key: str = ""

    @field_validator("host", "port", "key", mode="before")
    @classmethod
    def _strip_strings(cls, value):
        return value.strip() if isinstance(value, str) else value


class BrowseRequest(BaseModel):
    path: str = "/"
    host: str = ""
    port: str = "22"
    key: str = ""

    @field_validator("path", "host", "port", "key", mode="before")
    @classmethod
    def _strip_strings(cls, value):
        if value is None:
            return ""
        return value.strip() if isinstance(value, str) else value


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str = "readonly"

    @field_validator("username", "password", "role", mode="before")
    @classmethod
    def _strip_strings(cls, value):
        return value.strip() if isinstance(value, str) else value


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

    @field_validator("username", "password", "role", mode="before")
    @classmethod
    def _strip_strings(cls, value):
        return value.strip() if isinstance(value, str) else value
