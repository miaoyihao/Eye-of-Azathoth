/**
 * Supabase 客户端初始化
 * ======================
 * 从环境变量读取凭证，创建唯一客户端实例。
 * 在未设置 VITE_SUPABASE_URL 时提供降级处理，方便本地开发。
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** 是否已配置 Supabase 凭证 */
export const hasSupabaseConfig = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey);

/** Supabase 客户端实例 */
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 检查 Supabase 连接是否可用（用于展示和路由守卫）
 */
export function checkSupabaseReady(): boolean {
  return hasSupabaseConfig && supabase !== null;
}
