"""
Password hashing (PBKDF2-SHA256) and session-based authentication helpers.
"""

import hashlib
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, Request


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    """Hash a password with PBKDF2-SHA256. Returns 'salt_hex:hash_hex'."""
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return salt.hex() + ":" + dk.hex()


def verify_password(password: str, stored: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    try:
        salt_hex, _ = stored.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        return hash_password(password, salt) == stored
    except Exception:
        return False


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Validate password complexity: min 8 chars, 1 upper, 1 lower, 1 digit."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit"
    return True, "Password meets complexity requirements"


def create_session(user_id: int) -> str:
    """Insert a new session token into the DB, valid for 7 days."""
    # Import here to avoid circular dependency (database imports security)
    from backend.database import get_db

    token = secrets.token_hex(32)
    csrf_token = secrets.token_hex(32)
    expires = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at, csrf_token) VALUES (?, ?, ?, ?)",
            (token, user_id, expires, csrf_token),
        )
        conn.commit()
    finally:
        conn.close()
    return token


def get_current_user(request: Request) -> Optional[dict]:
    """Extract and validate the session from cookies or Authorization header."""
    from backend.database import get_db

    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None

    conn = get_db()
    try:
        row = conn.execute(
            """SELECT s.user_id, s.expires_at, u.username, u.role
               FROM sessions s JOIN users u ON s.user_id = u.id
               WHERE s.token = ?""",
            (token,),
        ).fetchone()
        if not row:
            return None
        if datetime.strptime(row["expires_at"], "%Y-%m-%d %H:%M:%S") < datetime.utcnow():
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return None
        return {
            "id": row["user_id"],
            "username": row["username"],
            "role": row["role"],
            "token": token,
        }
    finally:
        conn.close()


def require_auth(request: Request) -> dict:
    """Return the current user or raise 401."""
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(request: Request, *roles: str) -> dict:
    """Return the current user if their role matches, or raise 403."""
    user = require_auth(request)
    if user["role"] not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


def get_csrf_token_for_session(session_token: str) -> Optional[str]:
    """Look up the CSRF token associated with a session token."""
    from backend.database import get_db

    conn = get_db()
    try:
        row = conn.execute(
            "SELECT csrf_token FROM sessions WHERE token = ?", (session_token,)
        ).fetchone()
        return row["csrf_token"] if row else None
    finally:
        conn.close()


def _get_session_token_from_request(request: Request) -> Optional[str]:
    """Extract the session token from cookies or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token or None
