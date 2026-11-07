import uuid
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends, Header
import jwt
import bcrypt

from config.db import query_one, query_all, execute_write
from config.settings import JWT_SECRET

router = APIRouter()

def create_token(user_id: str) -> str:
    return jwt.encode({"id": user_id}, JWT_SECRET, algorithm="HS256")

async def get_current_user_from_header(authorization: str | None = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Không có token, ủy quyền bị từ chối.")
    token = authorization.replace("Bearer ", "").strip()
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = decoded.get("id")
        user = query_one("SELECT id, username, email, role, avatar FROM users WHERE id = ?", (user_id,))
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")

@router.post("/register")
async def register_user(request: Request):
    body = await request.json()
    username = str(body.get("username", "")).strip().lower()
    password = str(body.get("password", ""))
    email = body.get("email")

    if len(username) < 3 or len(username) > 32:
        return {"success": False, "message": "Tên đăng nhập phải dài 3–32 ký tự."}
    if len(password) < 6:
        return {"success": False, "message": "Mật khẩu cần ít nhất 6 ký tự."}

    existing = query_one("SELECT id FROM users WHERE username = ?", (username,))
    if existing:
        return {"success": False, "message": "Tên đăng nhập đã tồn tại."}

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    uid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    execute_write(
        "INSERT INTO users (id, username, password, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (uid, username, hashed, email, "user", now, now)
    )
    return {
        "success": True,
        "message": "Đăng ký thành công. Bạn có thể đăng nhập ngay.",
        "user": {"id": uid, "username": username, "role": "user"},
    }

@router.post("/login")
async def login_user(request: Request):
    body = await request.json()
    username = str(body.get("username", "")).strip().lower()
    password = str(body.get("password", ""))

    if not username or not password:
        return {"success": False, "message": "Vui lòng nhập tên đăng nhập và mật khẩu."}

    user = query_one("SELECT * FROM users WHERE username = ?", (username,))
    if not user:
        return {"success": False, "message": "Tên đăng nhập hoặc mật khẩu không chính xác."}

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
        return {"success": False, "message": "Tên đăng nhập hoặc mật khẩu không chính xác."}

    uid = user["id"]
    token = create_token(uid)
    return {
        "success": True,
        "token": token,
        "user": {"id": uid, "username": user["username"], "role": user.get("role", "user")},
        "message": "Đăng nhập thành công.",
    }

@router.get("/current")
async def get_current_user_endpoint(current_user: dict = Depends(get_current_user_from_header)):
    return {
        "success": True,
        "data": {
            "id": current_user["id"],
            "username": current_user.get("username"),
            "role": current_user.get("role", "user"),
            "image": current_user.get("avatar"),
        },
    }

@router.post("/changepassword")
async def change_password(request: Request, current_user: dict = Depends(get_current_user_from_header)):
    body = await request.json()
    old_pw = str(body.get("oldPassword", ""))
    new_pw = str(body.get("newPassword", ""))

    user = query_one("SELECT * FROM users WHERE id = ?", (current_user["id"],))
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")

    if not bcrypt.checkpw(old_pw.encode("utf-8"), user["password"].encode("utf-8")):
        return {"success": False, "message": "Mật khẩu cũ không đúng."}

    hashed = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.utcnow().isoformat()
    execute_write("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", (hashed, now, current_user["id"]))
    return {"success": True, "message": "Đổi mật khẩu thành công."}

@router.get("/list")
async def list_users():
    users = query_all("SELECT id, username, email, role, avatar FROM users ORDER BY created_at DESC")
    return {
        "success": True,
        "data": [
            {
                "id": u["id"],
                "username": u.get("username"),
                "role": u.get("role", "user"),
                "email": u.get("email"),
            }
            for u in users
        ],
    }

@router.get("/{user_id}")
async def get_user_by_id(user_id: str, current_user: dict = Depends(get_current_user_from_header)):
    u = query_one("SELECT id, username, email, role FROM users WHERE id = ?", (user_id,))
    if not u:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return {"success": True, "data": {"id": u["id"], "username": u.get("username"), "role": u.get("role")}}

@router.put("/{user_id}/role")
async def update_user_role(user_id: str, request: Request):
    body = await request.json()
    role = body.get("role", "user")
    now = datetime.utcnow().isoformat()
    execute_write("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", (role, now, user_id))
    return {"success": True, "message": "Đã cập nhật quyền người dùng."}

@router.delete("/remove/{user_id}")
async def remove_user(user_id: str):
    execute_write("DELETE FROM users WHERE id = ?", (user_id,))
    return {"success": True, "message": "Đã xóa người dùng."}
