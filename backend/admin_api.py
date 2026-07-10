"""
COC 人物卡 - 管理员用户管理 API
================================
依赖 SUPABASE_SERVICE_ROLE_KEY 操作 Supabase Auth。

环境变量：
  SUPABASE_URL                 必填，同 VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY    必填，在 Supabase Dashboard → Settings → API 获取

端点：
  POST /api/admin/verify         验证当前 token 是否为管理员
  POST /api/admin/create-user    创建用户
  POST /api/admin/delete-user    删除用户
  POST /api/admin/reset-password 重置用户密码
  POST /api/admin/update-role    更新用户角色
"""
import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── 环境变量 ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


# ── 工具函数 ──────────────────────────────────────────────────

def _auth_headers() -> dict:
    """用 service_role key 调用 Supabase Admin API 的公共 header"""
    return {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }


def _get_admin_user_id(jwt: str) -> str:
    """
    验证 JWT 并检查是否为管理员。
    返回 user_id（如果是管理员），否则抛 HTTPException。
    """
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        raise HTTPException(503, "后端的 SUPABASE 凭证未配置")

    # 1. 验证 JWT → 获取 user_id
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SERVICE_ROLE_KEY, "Authorization": f"Bearer {jwt}"},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(401, "JWT 验证失败，请重新登录")

    user_id = resp.json()["id"]

    # 2. 查询 profiles 表 → 检查 role
    profile_resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/profiles",
        params={"id": f"eq.{user_id}", "select": "role"},
        headers=_auth_headers(),
        timeout=10,
    )
    if profile_resp.status_code != 200:
        raise HTTPException(500, "无法查询用户角色")

    profiles = profile_resp.json()
    if not profiles or profiles[0].get("role") != "admin":
        raise HTTPException(403, "只有管理员才能执行此操作")

    return user_id


def _admin_guard(authorization: str = Header(...)) -> str:
    """FastAPI 依赖：提取 JWT 并校验管理员身份，返回 user_id"""
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "缺少 Authorization header")
    return _get_admin_user_id(token)


# ── 端点 ──────────────────────────────────────────────────────

@router.post("/verify")
def verify_admin(jwt: str = "", authorization: str = Header("")):
    """校验当前用户是否为管理员"""
    token = jwt or authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "缺少 JWT")
    user_id = _get_admin_user_id(token)
    return {"admin": True, "user_id": user_id}


@router.post("/create-user")
def create_user(
    email: str,
    password: str,
    role: str = "user",
    _admin_id: str = Depends(_admin_guard),
):
    """创建新用户（邮箱密码 + 指定角色）"""
    if not email or not password:
        raise HTTPException(400, "邮箱和密码不能为空")
    if len(password) < 6:
        raise HTTPException(400, "密码至少 6 位")
    if role not in ("admin", "user"):
        raise HTTPException(400, "角色必须是 admin 或 user")

    # 1. 创建 auth user（email_confirm=true 跳过邮箱验证）
    resp = httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_auth_headers(),
        json={"email": email, "password": password, "email_confirm": True},
        timeout=10,
    )
    if resp.status_code != 200:
        err = resp.json()
        logger.error("Supabase create user failed: %s", err)
        detail = err.get("msg") or err.get("error_description") or "创建用户失败"
        raise HTTPException(400, detail)

    user_id = resp.json()["id"]

    # 2. 如指定非默认角色，更新 profile
    if role != "user":
        httpx.patch(
            f"{SUPABASE_URL}/rest/v1/profiles",
            params={"id": f"eq.{user_id}"},
            headers=_auth_headers(),
            json={"role": role},
            timeout=10,
        )

    return {"success": True, "user": {"id": user_id, "email": email, "role": role}}


@router.post("/delete-user")
def delete_user(
    user_id: str,
    _admin_id: str = Depends(_admin_guard),
):
    """删除用户（级联删除 characters + profiles）"""
    resp = httpx.delete(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers=_auth_headers(),
        timeout=10,
    )
    if resp.status_code not in (200, 204):
        err = resp.json()
        logger.error("Supabase delete user failed: %s", err)
        detail = err.get("msg") or err.get("error_description") or "删除用户失败"
        raise HTTPException(400, detail)

    return {"success": True, "user_id": user_id}


@router.post("/reset-password")
def reset_password(
    user_id: str,
    new_password: str,
    _admin_id: str = Depends(_admin_guard),
):
    """管理员重置用户密码"""
    if len(new_password) < 6:
        raise HTTPException(400, "密码至少 6 位")

    resp = httpx.put(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers=_auth_headers(),
        json={"password": new_password},
        timeout=10,
    )
    if resp.status_code != 200:
        err = resp.json()
        logger.error("Reset password failed: %s", err)
        detail = err.get("msg") or err.get("error_description") or "重置密码失败"
        raise HTTPException(400, detail)

    return {"success": True, "user_id": user_id}


@router.post("/update-role")
def update_role(
    user_id: str,
    new_role: str,
    _admin_id: str = Depends(_admin_guard),
):
    """更新用户角色"""
    if new_role not in ("admin", "user"):
        raise HTTPException(400, "角色必须是 admin 或 user")

    resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/profiles",
        params={"id": f"eq.{user_id}"},
        headers=_auth_headers(),
        json={"role": new_role},
        timeout=10,
    )
    if resp.status_code not in (200, 204):
        logger.error("Update role failed: %s", resp.text)
        raise HTTPException(500, "更新角色失败")

    return {"success": True, "user_id": user_id, "new_role": new_role}
