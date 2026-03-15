"""
User management routes — CRUD for admin users.
"""

from fastapi import APIRouter, HTTPException, Request

from backend.database import get_db, log_audit
from backend.security import hash_password, require_role, validate_password_strength

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def list_users(request: Request):
    """List all users (admin only). Password hashes are excluded."""
    require_role(request, "admin")
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, username, role, created_at, last_login FROM users ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("")
async def create_user(request: Request):
    """Create a new user with a given role (admin only)."""
    user = require_role(request, "admin")
    body = await request.json()

    username = body.get("username", "").strip()
    password = body.get("password", "")
    role = body.get("role", "readonly")

    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")

    ok, msg = validate_password_strength(password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    if role not in ("admin", "rsync", "readonly"):
        raise HTTPException(status_code=400, detail="Invalid role")

    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")

        pw_hash = hash_password(password)
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (username, pw_hash, role),
        )
        conn.commit()
        new_id = cur.lastrowid
    finally:
        conn.close()

    log_audit(user, "user_create", "user", str(new_id), f"Created user '{username}' with role '{role}'")
    return {"id": new_id, "username": username, "role": role}


@router.put("/{user_id}")
async def update_user(user_id: int, request: Request):
    """Update a user's password, role, or username (admin only)."""
    user = require_role(request, "admin")
    body = await request.json()

    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        if "password" in body and body["password"]:
            ok, msg = validate_password_strength(body["password"])
            if not ok:
                raise HTTPException(status_code=400, detail=msg)
            pw_hash = hash_password(body["password"])
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?", (pw_hash, user_id)
            )

        if "role" in body:
            if body["role"] not in ("admin", "rsync", "readonly"):
                raise HTTPException(status_code=400, detail="Invalid role")
            conn.execute("UPDATE users SET role = ? WHERE id = ?", (body["role"], user_id))

        if "username" in body and body["username"]:
            conn.execute(
                "UPDATE users SET username = ? WHERE id = ?", (body["username"], user_id)
            )

        conn.commit()

        result = conn.execute(
            "SELECT id, username, role, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()

    log_audit(user, "user_update", "user", str(user_id))
    return dict(result)


@router.delete("/{user_id}")
async def delete_user(user_id: int, request: Request):
    """Delete a user (admin only)."""
    user = require_role(request, "admin")
    conn = get_db()
    try:
        existing = conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        deleted_username = existing["username"]
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    finally:
        conn.close()

    log_audit(user, "user_delete", "user", str(user_id), f"Deleted user '{deleted_username}'")
    return {"ok": True}
