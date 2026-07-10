/**
 * 认证上下文（AuthContext）
 * ========================
 * 管理用户的登录态，提供 signIn / signUp / signOut 方法。
 * 主应用（CharacterList / CreateCharacter）在未登录时显示引导提示。
 * 独立的 /account 页提供完整的注册/登录/账号管理。
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '@/services/supabase';

export interface AuthContextType {
  /** 当前登录用户，null 表示未登录 */
  user: User | null;
  /** 是否正在加载登录态（首次检查 Session 时） */
  loading: boolean;
  /** 是否已配置 Supabase（用于降级显示） */
  configured: boolean;
  /** 邮箱登录 */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** 邮箱注册 */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  /** 登出 */
  signOut: () => Promise<void>;
  /** 更新密码 */
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  /** 删除账号（需要重新认证） */
  deleteAccount: () => Promise<{ error: string | null }>;
  /** 重新加载用户信息 */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    // 检查已有 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听登录态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
    if (!supabase) return { error: 'Supabase 未配置', needsEmailConfirmation: false };
    const { error, data } = await supabase.auth.signUp({ email, password });
    // 如果用户已存在且开启了邮箱确认，会返回 session=null
    const needsConfirm = !data.session && !error;
    return { error: error?.message ?? null, needsEmailConfirmation: needsConfirm };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase 未配置' };
    // Supabase 默认不允许用户自行删除账号，需要启用 Settings → API → "Enable user signups" 下的 "Allow users to delete their own account"
    // 或者通过管理端删除
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      // fallback: 调用管理 API（需要 service_role key，前端不可用）
      return { error: '删除账号功能需联系管理员，或登录后使用控制台删除。当前版本暂不支持前端自助删除。' };
    }
    setUser(null);
    return { error: null };
  };

  const refreshUser = async () => {
    if (!supabase) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, loading, configured: hasSupabaseConfig, signIn, signUp, signOut, updatePassword, deleteAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
