/**
 * 人物卡存储服务（HTTP API 实现）
 * ===================================
 * 数据通过 frontend/server.js 持久化到本地 data/characters.json
 * 部署说明见 server.js 顶部注释
 * ===================================
 */
import type { Investigator } from '@/types';

const API_BASE = '/api/characters';

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

/** 保存人物卡（新建或更新） */
export async function saveCharacter(investigator: Investigator, existingId?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigator, existingId }),
  });
  if (!res.ok) throw new Error(`保存失败 (${res.status})`);
  const data = await res.json();
  return data.id;
}

/** 加载单个人物卡 */
export async function loadCharacter(id: string): Promise<SavedCharacter | null> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`加载失败 (${res.status})`);
  return await res.json();
}

/** 获取所有人物卡元数据列表 */
export async function getAllCharacterMetas(): Promise<SavedCharacterMeta[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`获取列表失败 (${res.status})`);
  return await res.json();
}

/** 获取所有人物的简要摘要 */
export async function getCharacterSummaries(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  const res = await fetch(`${API_BASE}/summaries`);
  if (!res.ok) throw new Error(`获取摘要失败 (${res.status})`);
  return await res.json();
}

/** 删除人物卡 */
export async function deleteCharacter(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`删除失败 (${res.status})`);
  return true;
}
