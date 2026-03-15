"""
Authentication routes — login, logout, current user, CSRF token.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.database import get_db, log_audit
from backend.security import (
    create_session,
    get_csrf_token_for_session,
    get_current_user,
    require_auth,
    verify_password,
    _get_session_token_from_request,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Account lockout state (in-memory)
# ---------------------------------------------------------------------------
_failed_attempts: dict[str, dict] = {}
_MAX_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15


def _check_lockout(username: str):
    """Raise 403 if the account is currently locked out."""
    info = _failed_attempts.get(username)
    if not info:
        return
    if info.get("locked_until") and datetime.utcnow() < info["locked_until"]:
        remaining = int((info["locked_until"] - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=403,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
        )
    # Lock period expired — reset
    if info.get("locked_until") and datetime.utcnow() >= info["locked_until"]:
        _failed_attempts.pop(username, None)


def _record_failure(username: str):
    """Record a failed login attempt; lock after threshold."""
    info = _failed_attempts.setdefault(username, {"count": 0, "locked_until": None})
    info["count"] += 1
    if info["count"] >= _MAX_ATTEMPTS:
        info["locked_until"] = datetime.utcnow() + timedelta(minutes=_LOCKOUT_MINUTES)


def _clear_failures(username: str):
    _failed_attempts.pop(username, None)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/login")
async def login(request: Request):
    body = await request.json()
    username = body.get("username", "")
    password = body.get("password", "")

    _check_lockout(username)

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            _record_failure(username)
            raise HTTPException(status_code=401, detail="Invalid credentials")

        _clear_failures(username)

        token = create_session(user["id"])
        conn.execute(
            "UPDATE users SET last_login = datetime('now') WHERE id = ?", (user["id"],)
        )
        conn.commit()
    finally:
        conn.close()

    log_audit({"id": user["id"], "username": user["username"]}, "login", "user", str(user["id"]))

    response = JSONResponse({
        "token": token,
        "username": user["username"],
        "role": user["role"],
    })
    response.set_cookie(
        "session_token", token, httponly=True, samesite="lax", max_age=7 * 86400
    )
    return response


@router.post("/logout")
async def logout(request: Request):
    user = get_current_user(request)
    if user:
        conn = get_db()
        try:
            conn.execute("DELETE FROM sessions WHERE token = ?", (user["token"],))
            conn.commit()
        finally:
            conn.close()
        log_audit(user, "logout", "user", str(user["id"]))

    response = JSONResponse({"ok": True})
    response.delete_cookie("session_token")
    return response


@router.get("/me")
async def me(request: Request):
    user = require_auth(request)
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@router.get("/csrf")
async def get_csrf_token(request: Request):
    """Return the CSRF token for the current session."""
    user = require_auth(request)
    session_token = _get_session_token_from_request(request)
    csrf_token = get_csrf_token_for_session(session_token) if session_token else None
    if not csrf_token:
        raise HTTPException(status_code=401, detail="No valid session")
    return {"csrf_token": csrf_token}
