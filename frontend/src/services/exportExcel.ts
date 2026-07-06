/**
 * 导出 COC 人物卡为 Excel 文件
 * ====================================
 *
 * 方式：调用 Python 后端 API（FastAPI + openpyxl）
 * 后端使用 openpyxl 模板填充法，完整保留模板样式（字体/填充/边框等）。
 *
 * API 地址：
 *   http://localhost:8080/api/export-excel
 *
 * 如果后端不可用，会 fallback 到前端本地生成（xlsx-js-style），但不保留样式。
 */
import type { Investigator } from '@/types';

/** 后端 API 地址（通过环境变量可重写） */
const API_BASE = (import.meta as any).env?.VITE_EXCEL_API_BASE || 'http://localhost:8080';
const EXPORT_URL = `${API_BASE}/api/export-excel`;

/** 随机4位码 */
function randCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

function safeName(s: string): string {
  return (s || '未知').replace(/[/\\?*:|"<>]/g, '_').trim() || '未知';
}

/**
 * 主导出函数 — 优先调用后端 API
 */
export async function exportCharacterToExcel(
  investigator: Investigator,
  occupationName: string,
  characterId?: string,
): Promise<void> {
  // 尝试调用后端 API
  try {
    await exportViaApi(investigator, occupationName, characterId);
    return;
  } catch (apiErr) {
    console.warn('后端 API 不可用，降级到前端本地生成（样式可能丢失）', apiErr);
  }

  // Fallback：前端本地生成（不保留样式）
  await exportViaFrontend(investigator, occupationName, characterId);
}

/**
 * 通过后端 API 导出（保留完整样式）
 */
async function exportViaApi(
  investigator: Investigator,
  occupationName: string,
): Promise<void> {
  const resp = await fetch(EXPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigator, occupationName }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`后端 API 返回 ${resp.status}: ${text}`);
  }

  // 获取文件名
  const disposition = resp.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/);
  let filename: string;
  if (filenameMatch) {
    filename = decodeURIComponent(filenameMatch[1]);
  } else {
    filename = `${safeName(investigator.name)}_${safeName(occupationName || '未选择')}_${randCode()}.xlsx`;
  }

  // 下载文件
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========================================
// Fallback：前端本地生成（xlsx-js-style，不保留模板样式）
// ========================================
import * as XLSX from 'xlsx-js-style';
import { calcAllDerived, calcDBandBuild, calcDodge } from '@/utils/calculations';

async function exportViaFrontend(
  investigator: Investigator,
  occupationName: string,
): Promise<void> {
  const resp = await fetch('/template.xlsx');
  if (!resp.ok) throw new Error('模板加载失败');
  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellFormula: true, cellStyles: true, cellNF: true });
  const ws = wb.Sheets['人物卡'];
  if (!ws) throw new Error('模板中找不到"人物卡"工作表');

  function setCell(ref: string, value: string | number | null | undefined): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value === '') return;
    if (!ws[ref]) ws[ref] = { t: 'n', v: 0 };
    ws[ref].v = value;
    ws[ref].t = typeof value === 'number' ? 'n' : 's';
  }

  const derived = calcAllDerived(investigator);
  const { db, build } = calcDBandBuild(investigator.str || 50, investigator.siz || 50);
  const dodge = calcDodge(investigator.dex || 50);

  setCell('E3', investigator.name);
  setCell('E4', investigator.player);
  setCell('M4', investigator.era);
  setCell('E5', occupationName);
  setCell('M5', investigator.occupationId ?? 0);
  setCell('E6', investigator.age);
  setCell('M6', investigator.gender);
  setCell('E7', investigator.residence);
  setCell('M7', investigator.birthplace);
  setCell('G8', investigator.scenarioYear || 1920);
  setCell('J8', `${investigator.scenarioMonth || 1}月`);
  setCell('L8', `${investigator.scenarioDay || 1}日`);
  setCell('U3', investigator.str);
  setCell('AA3', investigator.dex);
  setCell('AG3', investigator.pow);
  setCell('U5', investigator.con);
  setCell('AA5', investigator.app);
  setCell('AG5', investigator.edu);
  setCell('U7', investigator.siz);
  setCell('AA7', investigator.int);
  setCell('AG7', investigator.luck);
  setCell('F9', investigator.hpMax > 0 ? investigator.hpMax : derived.hpMax);
  setCell('G10', investigator.hpCurrent > 0 ? investigator.hpCurrent : derived.hpMax);
  setCell('K9', investigator.sanMax > 0 ? investigator.sanMax : derived.sanMax);
  setCell('P10', investigator.sanCurrent > 0 ? investigator.sanCurrent : derived.sanMax);
  setCell('T9', investigator.mpMax > 0 ? investigator.mpMax : derived.mpMax);
  setCell('Y10', investigator.mpCurrent > 0 ? investigator.mpCurrent : derived.mpMax);
  setCell('AF10', investigator.mov > 0 ? investigator.mov : derived.mov);
  setCell('AP52', db);
  setCell('AP55', build);
  setCell('AP57', dodge);

  const leftRows: Record<string, number> = {};
  const rightRows: Record<string, number> = {};
  for (let r = 16; r <= 60; r++) {
    const fc = ws[`F${r}`];
    if (fc && fc.t === 's' && typeof fc.v === 'string') leftRows[fc.v.trim()] = r;
    const ac = ws[`AB${r}`];
    if (ac && ac.t === 's' && typeof ac.v === 'string') rightRows[ac.v.trim()] = r;
  }
  function findSkillRow(rowMap: Record<string, number>, skillName: string): number | null {
    if (rowMap[skillName] !== undefined) return rowMap[skillName];
    for (const [key, row] of Object.entries(rowMap)) {
      if (key.startsWith(skillName + '：') || key.startsWith(skillName + ':')) return row;
    }
    const special: Record<string, string[]> = {
      '斗殴': ['格斗', '格斗：', '格斗①', '格斗②', '格斗③'],
      '手枪': ['射击', '射击：', '射击①', '射击②', '射击③'],
      '步枪/霰弹枪': ['射击', '射击：', '射击②', '射击③'],
      '冲锋枪': ['射击', '射击：', '射击③'],
      '剑': ['格斗', '格斗：', '格斗②'],
      '斧': ['格斗', '格斗：', '格斗③'],
      '电锯': ['格斗', '格斗：', '格斗③'],
      '链枷': ['格斗', '格斗：', '格斗②'],
      '绞具': ['格斗', '格斗：', '格斗①'],
      '鞭子': ['格斗', '格斗：', '格斗③'],
      '弓术': ['射击', '射击：', '射击③'],
      '机枪': ['射击', '射击：', '射击②'],
      '炮术': ['射击', '射击：', '射击③'],
      '格斗': ['格斗', '格斗：', '格斗①'],
      '射击': ['射击', '射击：', '射击①'],
      '驾驶': ['驾驶', '驾驶：'],
      '生存': ['生存', '生存：'],
    };
    const candidates = special[skillName];
    if (candidates) for (const c of candidates) { if (rowMap[c] !== undefined) return rowMap[c]; }
    return null;
  }
  for (const skill of investigator.skills) {
    const n = skill.name.trim();
    const o = skill.occupationPts || 0;
    const i = skill.interestPts || 0;
    const e = skill.experiencePts || 0;
    const g = skill.growthPts || 0;
    let row = findSkillRow(leftRows, n);
    if (row !== null) {
      setCell(`N${row}`, o);
      setCell(`P${row}`, i);
      setCell(`L${row}`, e);
      if (g > 0) setCell(`M${row}`, g);
      continue;
    }
    row = findSkillRow(rightRows, n);
    if (row !== null) {
      setCell(`AJ${row}`, o);
      setCell(`AL${row}`, i);
      setCell(`AH${row}`, e);
      if (g > 0) setCell(`AI${row}`, g);
    }
  }

  function formatNarrative(text: string | undefined | null, maxLen = 500): string {
    if (!text || !text.trim()) return '';
    const t = text.trim();
    return t.length > maxLen ? t.slice(0, maxLen) + '……' : t;
  }
  function formatInsanity(items: Array<{ type: string; name: string; english?: string; description?: string }>): string {
    if (!items || items.length === 0) return '';
    return items.map((item, i) => {
      const label = item.type === 'phobia' ? '恐惧' : '狂躁';
      const eng = item.english ? `(${item.english})` : '';
      const desc = item.description ? `：${item.description}` : '';
      return `${i + 1}. [${label}] ${item.name}${eng}${desc}`;
    }).join('\n');
  }

  setCell('AA61', formatNarrative(investigator.appearance));
  setCell('AA63', formatNarrative(investigator.ideology));
  setCell('AA65', formatNarrative(investigator.importantPerson));
  setCell('AA69', formatNarrative(investigator.valuableThing));
  setCell('AA71', formatNarrative(investigator.traits));
  setCell('AA73', formatNarrative(investigator.injuries));
  setCell('AA75', formatInsanity(investigator.insanity));
  setCell('W77', formatNarrative(investigator.backstory, 2000));
  if (investigator.experiencePack && investigator.experiencePack !== '无') setCell('F113', investigator.experiencePack);

  if (investigator.weapons && investigator.weapons.length > 0) {
    const maxW = Math.min(investigator.weapons.length, 4);
    for (let i = 0; i < maxW; i++) {
      const w = investigator.weapons[i];
      const row = 53 + i;
      setCell(`U${row}`, w.name);
      setCell(`W${row}`, w.damage || '');
      setCell(`AA${row}`, w.range || '');
      setCell(`AC${row}`, w.era || '');
      setCell(`AE${row}`, w.era || '');
      setCell(`AG${row}`, w.ammo || '');
      setCell(`AJ${row}`, w.malfunction || '');
    }
  }
  if (investigator.spells && investigator.spells.length > 0) {
    const maxS = Math.min(investigator.spells.length, 15);
    for (let i = 0; i < maxS; i++) {
      const s = investigator.spells[i];
      const row = 114 + i;
      setCell(`W${row}`, i + 1);
      setCell(`Y${row}`, s.name);
      setCell(`AC${row}`, s.cost || '');
      setCell(`AH${row}`, s.effect || '');
    }
  }
  if (investigator.companions && investigator.companions.length > 0) {
    const maxC = Math.min(investigator.companions.length, 12);
    for (let i = 0; i < maxC; i++) {
      const c = investigator.companions[i];
      const row = 130 + i;
      setCell(`W${row}`, c.name);
      setCell(`AA${row}`, c.player || '');
      setCell(`AD${row}`, c.notes || '');
      setCell(`AL${row}`, c.changes || '');
      setCell(`AP${row}`, c.scenario || '');
    }
  }

  const idPart = characterId ? `_${characterId}` : `_${randCode()}`;
  const fname = `${safeName(investigator.name)}_${safeName(occupationName || '未选择')}${idPart}.xlsx`;
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
