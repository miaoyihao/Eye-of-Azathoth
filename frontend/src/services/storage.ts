/**
 * 人物卡存储服务（localStorage 实现）
 * 设计为可替换层：后续接入后端 API 只需替换此文件
 */
import type { Investigator } from '@/types';

const STORAGE_KEY = 'coc-saved-characters';

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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readAll(): SavedCharacter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(data: SavedCharacter[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 保存人物卡（新建或更新） */
export function saveCharacter(investigator: Investigator, existingId?: string): string {
  const all = readAll();
  const now = new Date().toISOString();

  if (existingId) {
    const idx = all.findIndex(c => c.id === existingId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], investigator, updatedAt: now };
      writeAll(all);
      return existingId;
    }
  }

  const id = generateId();
  all.push({ id, investigator, createdAt: now, updatedAt: now });
  writeAll(all);
  return id;
}

/** 加载单个人物卡 */
export function loadCharacter(id: string): SavedCharacter | null {
  return readAll().find(c => c.id === id) ?? null;
}

/** 获取所有人物卡元数据列表（不含完整 investigator 数据） */
export function getAllCharacterMetas(): SavedCharacterMeta[] {
  return readAll().map(c => {
    const inv = c.investigator;
    // COC 7e 派生值公式
    const computedHpMax = Math.floor((inv.con + inv.siz) / 10);
    const computedSanMax = inv.pow;
    const hpMax = inv.hpMax || computedHpMax;
    const sanMax = inv.sanMax || computedSanMax;
    // 如果当前值未设置（0），默认取最大值
    const hpCurrent = inv.hpCurrent || hpMax;
    const sanCurrent = inv.sanCurrent || sanMax;
    return {
      id: c.id,
      name: inv.name || '未命名',
      player: inv.player || '-',
      occupationName: inv.occupationName || '未选择',
      era: inv.era || '-',
      age: inv.age,
      gender: inv.gender || '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      hpCurrent,
      hpMax,
      sanCurrent,
      sanMax,
    };
  });
}

/** 获取所有人物的简要摘要（仅 id + name + updatedAt，用于路由快速检查） */
export function getCharacterSummaries(): { id: string; name: string; updatedAt: string }[] {
  return readAll().map(c => ({
    id: c.id,
    name: c.investigator.name || '未命名',
    updatedAt: c.updatedAt,
  }));
}

/** 删除人物卡 */
export function deleteCharacter(id: string): boolean {
  const all = readAll();
  const filtered = all.filter(c => c.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
