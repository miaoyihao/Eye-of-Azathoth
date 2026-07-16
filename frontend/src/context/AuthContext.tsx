/**
 * 认证上下文（AuthContext）
 * ========================
 * 管理用户的登录态、角色（admin/user）以及管理员操作。
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '@/services/supabase';

/** 用户 profile（含角色） */
export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

/** 管理员面板中显示的完整用户信息 */
export interface AdminUserInfo {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface AuthContextType {
  /** 当前登录用户 */
  user: User | null;
  /** 当前用户 profile（含角色） */
  profile: UserProfile | null;
  /** 是否已加载 profile */
  profileLoading: boolean;
  /** 是否管理员 */
  isAdmin: boolean;
  /** 是否正在加载登录态 */
  loading: boolean;
  /** 是否已配置 Supabase */
  configured: boolean;
  /** 邮箱登录 */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** 邮箱注册 */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  /** 登出 */
  signOut: () => Promise<void>;
  /** 更新密码 */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  /** 删除账号 */
  deleteAccount: () => Promise<{ error: string | null }>;
  /** 重新加载用户信息 */
  refreshUser: () => Promise<void>;
  /** 重新加载 profile */
  refreshProfile: () => Promise<void>;
  /** 管理员：获取所有用户列表 */
  adminListUsers: () => Promise<AdminUserInfo[]>;
  /** 管理员：创建用户 */
  adminCreateUser: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  /** 管理员：删除用户 */
  adminDeleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  /** 管理员：重置用户密码 */
  adminResetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  /** 管理员：更新用户角色 */
  adminUpdateRole: (userId: string, newRole: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** 后端 API 基础地址 */
const API_BASE = import.meta.env.VITE_EXCEL_API_BASE || 'http://localhost:8080';

/** 从 session 获取当前 access_token */
async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** 调用后端管理员 API */
async function adminApiCall<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: '未登录' };

  try {
    const res = await fetch(`${API_BASE}/api/admin/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return { ok: false, error: errBody.detail || `请求失败 (${res.status})` };
    }
    const data = await res.json();
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: `无法连接后端: ${(e as Error).message}` };
  }
}

/** 通过 Supabase RPC 获取 profile */
async function fetchProfileViaRPC(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error || !data) return null;
  const p = data as Record<string, unknown>;
  return {
    id: p.id as string,
    email: p.email as string,
    role: p.role as 'admin' | 'user',
    createdAt: p.created_at as string,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  const refreshProfile = useCallback(async () => {
    if (!user || !supabase) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const p = await fetchProfileViaRPC();
    setProfile(p);
    setProfileLoading(false);
  }, [user]);

  // 初始化
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) {
        fetchProfileViaRPC().then(p => {
          setProfile(p);
          setProfileLoading(false);
        });
      } else {
        setProfileLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfileViaRPC().then(p => {
          setProfile(p);
          setProfileLoading(false);
        });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setTimeout(refreshProfile, 0);
        return { error: null };
      }
      // 防御性处理：error 可能不是标准 AuthError
      const msg = typeof error === 'object' && error !== null
        ? (error as Record<string, unknown>)?.message || JSON.stringify(error)
        : String(error);
      return { error: msg || `登录失败 (HTTP ${(error as Record<string, unknown>)?.status || '?'})` };
    } catch (e) {
      console.error('[signIn] 登录异常:', e);
      return { error: `登录异常: ${(e as Error).message || e || '未知错误'}` };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
    if (!supabase) return { error: 'Supabase 未配置', needsEmailConfirmation: false };
    const { error, data } = await supabase.auth.signUp({ email, password });
    const needsConfirm = !data.session && !error;
    return { error: error?.message ?? null, needsEmailConfirmation: needsConfirm };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      return { error: '删除账号功能需联系管理员，或登录后使用控制台删除。当前版本暂不支持前端自助删除。' };
    }
    setUser(null);
    setProfile(null);
    return { error: null };
  };

  const refreshUser = async () => {
    if (!supabase) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) await refreshProfile();
  };

  // ── 管理员操作 ──

  const adminListUsers = async (): Promise<AdminUserInfo[]> => {
    // 优先使用 Supabase RPC（不需要后端），兜底使用后端 API
    if (supabase) {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (!error && data) {
        return (data as AdminUserInfo[]);
      }
    }
    // 后端 API 兜底
    const res = await adminApiCall<{ users: AdminUserInfo[] }>('list-users', {});
    return res.ok && res.data?.users ? res.data.users : [];
  };

  const adminCreateUser = async (email: string, password: string, role = 'user') => {
    return adminApiCall('create-user', { email, password, role });
  };

  const adminDeleteUser = async (userId: string) => {
    return adminApiCall('delete-user', { user_id: userId });
  };

  const adminResetPassword = async (userId: string, newPassword: string) => {
    return adminApiCall('reset-password', { user_id: userId, new_password: newPassword });
  };

  const adminUpdateRole = async (userId: string, newRole: string) => {
    // 优先使用 Supabase RPC
    if (supabase) {
      const { error } = await supabase.rpc('admin_update_role', {
        p_user_id: userId,
        p_new_role: newRole,
      });
      if (!error) return { success: true };
      // RPC 失败时回退到后端 API
    }
    return adminApiCall('update-role', { user_id: userId, new_role: newRole });
  };

  return (
    <AuthContext.Provider value={{
      user, profile, profileLoading, isAdmin,
      loading, configured: hasSupabaseConfig,
      signIn, signUp, signOut, updatePassword, deleteAccount,
      refreshUser, refreshProfile,
      adminListUsers, adminCreateUser, adminDeleteUser,
      adminResetPassword, adminUpdateRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
