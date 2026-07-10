/**
 * 人物卡存储服务（Supabase 实现）
 * ================================
 * 使用 Supabase Postgres + Row Level Security 实现多用户数据隔离。
 * 所有操作自动带上 auth.uid() 过滤，确保每个用户只能访问自己的数据。
 *
 * 如果 Supabase 未配置（VITE_SUPABASE_URL 为空），会抛错提示。
 */
import type { Investigator } from '@/types';
import { supabase, hasSupabaseConfig } from './supabase';

export interface SavedCharacterMeta {
  id: string;
  name: string;
  player: string;
  occupationName: string;
  era: string;
  age: number;
  gender: string;
  createdAt: string;
  updatedAt: string;
  hpCurrent: number;
  hpMax: number;
  sanCurrent: number;
  sanMax: number;
}

export interface SavedCharacter {
  id: string;
  investigator: Investigator;
  createdAt: string;
  updatedAt: string;
}

/** 从 investigator JSON 中提取元数据 */
function extractMeta(id: string, inv: Investigator, createdAt: string, updatedAt: string): SavedCharacterMeta {
  return {
    id,
    name: inv.name || '',
    player: inv.player || '',
    occupationName: inv.occupationName || '',
    era: inv.era || '',
    age: inv.age || 0,
    gender: inv.gender || '',
    createdAt,
    updatedAt,
    hpCurrent: inv.hpCurrent || 0,
    hpMax: inv.hpMax || 0,
    sanCurrent: inv.sanCurrent || 0,
    sanMax: inv.sanMax || 0,
  };
}

/** 检查是否已认证（内部工具函数） */
async function requireUser() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase 未配置，请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('请先登录');
  }
  return user.id;
}

/** 保存人物卡（新建或更新） */
export async function saveCharacter(investigator: Investigator, existingId?: string): Promise<string> {
  const userId = await requireUser();
  if (!supabase) throw new Error('Supabase 未初始化');

  const id = existingId || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  if (existingId) {
    const { error } = await supabase
      .from('characters')
      .update({ investigator, updated_at: now })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`更新失败: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('characters')
      .insert({ id, user_id: userId, investigator, created_at: now, updated_at: now });
    if (error) throw new Error(`保存失败: ${error.message}`);
  }

  return id;
}

/** 加载单个人物卡 */
export async function loadCharacter(id: string): Promise<SavedCharacter | null> {
  const userId = await requireUser();
  if (!supabase) throw new Error('Supabase 未初始化');

  const { data, error } = await supabase
    .from('characters')
    .select('id, investigator, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 记录不存在
    throw new Error(`加载失败: ${error.message}`);
  }

  return {
    id: data.id,
    investigator: data.investigator as Investigator,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** 获取所有人物卡元数据列表 */
export async function getAllCharacterMetas(): Promise<SavedCharacterMeta[]> {
  const userId = await requireUser();
  if (!supabase) throw new Error('Supabase 未初始化');

  const { data, error } = await supabase
    .from('characters')
    .select('id, investigator, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`获取列表失败: ${error.message}`);

  return (data || []).map(row =>
    extractMeta(row.id, row.investigator as Investigator, row.created_at, row.updated_at)
  );
}

/** 获取所有人物的简要摘要 */
export async function getCharacterSummaries(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  const userId = await requireUser();
  if (!supabase) throw new Error('Supabase 未初始化');

  const { data, error } = await supabase
    .from('characters')
    .select('id, investigator->name, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`获取摘要失败: ${error.message}`);

  return (data || []).map(row => ({
    id: row.id,
    name: (row.name as string) || '',
    updatedAt: row.updated_at,
  }));
}

/** 删除人物卡 */
export async function deleteCharacter(id: string): Promise<boolean> {
  const userId = await requireUser();
  if (!supabase) throw new Error('Supabase 未初始化');

  const { error, count } = await supabase
    .from('characters')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`删除失败: ${error.message}`);
  return (count ?? 0) > 0;
}
