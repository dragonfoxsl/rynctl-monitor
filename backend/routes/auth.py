"""
Authentication routes — login, logout, current user, CSRF token.
"""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from backend.config import LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS, SESSION_COOKIE_MAX_AGE
from backend.database import get_db, log_audit
from backend.models import LoginRequest
from backend.security import (
    create_session,
    get_csrf_token_for_session,
    get_current_user,
    require_auth,
    verify_password,
    _get_session_token_from_request,
)
from backend.time_utils import format_db_timestamp, parse_db_timestamp, utc_now

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/login")
async def login(payload: LoginRequest):
    username = payload.username
    password = payload.password

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        if user and user["lockout_until"]:
            locked_until = parse_db_timestamp(user["lockout_until"])
            if locked_until > utc_now():
                remaining = int((locked_until - utc_now()).total_seconds() // 60) + 1
                raise HTTPException(
                    status_code=403,
                    detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
                )
            conn.execute(
                "UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?",
                (user["id"],),
            )
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        if not user or not verify_password(password, user["password_hash"]):
            if user:
                failed_attempts = (user["failed_login_attempts"] or 0) + 1
                lockout_until = None
                if failed_attempts >= MAX_LOGIN_ATTEMPTS:
                    lockout_until = format_db_timestamp(
                        utc_now() + timedelta(minutes=LOCKOUT_MINUTES)
                    )
                conn.execute(
                    "UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?",
                    (failed_attempts, lockout_until, user["id"]),
                )
                conn.commit()
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_session(user["id"])
        conn.execute(
            """UPDATE users
               SET last_login = datetime('now'), failed_login_attempts = 0, lockout_until = NULL
               WHERE id = ?""",
            (user["id"],),
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
        "session_token", token, httponly=True, samesite="lax", max_age=SESSION_COOKIE_MAX_AGE
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
