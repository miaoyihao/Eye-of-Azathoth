/**
 * 导出 COC 人物卡为 Excel 文件
 * 从 /template.xlsx 加载模板，填入数据后下载
 *
 * 使用本地 xlsx-js-style 依赖，无需联网
 */
import type { Investigator } from '@/types';
import * as XLSX from 'xlsx-js-style';
import { calcAllDerived, calcDBandBuild, calcDodge } from '@/utils/calculations';

// ========================================
// 工具函数
// ========================================
function randCode(): string {
  return Math.random().toString(36).slice(2, 6);
}

function safeName(s: string): string {
  return (s || '未知').replace(/[/\\?*:|"<>]/g, '_').trim() || '未知';
}

/** 写入单元格（保留模板样式） */
function setCell(ws: XLSX.WorkSheet, ref: string, value: string | number | null | undefined): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' && value === '') return;
  // 如果单元格不存在，创建时尽量复制附近样式
  if (!ws[ref]) {
    ws[ref] = { t: 'n', v: 0 };
  }
  ws[ref].v = value;
  ws[ref].t = typeof value === 'number' ? 'n' : 's';
}

// ========================================
// 技能名称映射：app → 模板中的行（动态查找）
// ========================================
/** 在行映射中查找技能（精确 + 前缀 + 特殊匹配） */
function findSkillRow(
  rowMap: Record<string, number>,
  skillName: string,
): number | null {
  // 1. 精确匹配
  if (rowMap[skillName] !== undefined) return rowMap[skillName];

  // 2. 前缀匹配（如 格斗 → 格斗：）
  for (const [key, row] of Object.entries(rowMap)) {
    if (key.startsWith(skillName + '：') || key.startsWith(skillName + ':')) {
      return row;
    }
  }

  // 3. 特殊匹配（战斗/射击技能 → 子槽位）
  const special: Record<string, string[]> = {
    '斗殴':          ['格斗', '格斗：', '格斗①', '格斗②', '格斗③'],
    '手枪':          ['射击', '射击：', '射击①', '射击②', '射击③'],
    '步枪/霰弹枪':  ['射击', '射击：', '射击②', '射击③'],
    '冲锋枪':        ['射击', '射击：', '射击③'],
    '剑':            ['格斗', '格斗：', '格斗②'],
    '斧':            ['格斗', '格斗：', '格斗③'],
    '电锯':          ['格斗', '格斗：', '格斗③'],
    '链枷':          ['格斗', '格斗：', '格斗②'],
    '绞具':          ['格斗', '格斗：', '格斗①'],
    '鞭子':          ['格斗', '格斗：', '格斗③'],
    '弓术':          ['射击', '射击：', '射击③'],
    '机枪':          ['射击', '射击：', '射击②'],
    '炮术':          ['射击', '射击：', '射击③'],
    '格斗':          ['格斗', '格斗：', '格斗①'],
    '射击':          ['射击', '射击：', '射击①'],
    '驾驶':          ['驾驶', '驾驶：'],
    '生存':          ['生存', '生存：'],
  };

  const candidates = special[skillName];
  if (candidates) {
    for (const c of candidates) {
      if (rowMap[c] !== undefined) return rowMap[c];
    }
  }

  return null;
}

/** 格式化叙事文本，限制长度 */
function formatNarrative(text: string | undefined | null, maxLen: number = 500): string {
  if (!text || text.trim() === '') return '';
  const trimmed = text.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '……' : trimmed;
}

/** 格式化恐惧症/躁狂症条目为文本 */
function formatInsanity(
  items: Array<{ type: string; name: string; english?: string; description?: string }>,
): string {
  if (!items || items.length === 0) return '';
  return items.map((item, i) => {
    const label = item.type === 'phobia' ? '恐惧' : '狂躁';
    const eng = item.english ? `(${item.english})` : '';
    const desc = item.description ? `：${item.description}` : '';
    return `${i + 1}. [${label}] ${item.name}${eng}${desc}`;
  }).join('\n');
}

// ========================================
// 主导出函数
// ========================================
export async function exportCharacterToExcel(
  investigator: Investigator,
  _occupationName: string,
): Promise<void> {
  // 1. 获取模板
  const resp = await fetch('/template.xlsx');
  if (!resp.ok) throw new Error('模板加载失败');
  const buf = await resp.arrayBuffer();

  // 2. 读取工作簿 — cellStyles/cellNF 保留模板样式和数字格式
  const wb = XLSX.read(buf, { type: 'array', cellFormula: true, cellStyles: true, cellNF: true });
  const ws = wb.Sheets['人物卡'];
  if (!ws) throw new Error('模板中找不到"人物卡"工作表');

  // 预计算派生值
  const derived = calcAllDerived(investigator);
  const { db, build } = calcDBandBuild(investigator.str || 50, investigator.siz || 50);
  const dodge = calcDodge(investigator.dex || 50);

  // ========================================
  // 3. 填写基本信息
  // ========================================
  setCell(ws, 'E3', investigator.name);
  setCell(ws, 'E4', investigator.player);
  setCell(ws, 'M4', investigator.era);
  setCell(ws, 'E5', investigator.occupationName);
  setCell(ws, 'M5', investigator.occupationId ?? 0);
  setCell(ws, 'E6', investigator.age);
  setCell(ws, 'M6', investigator.gender);
  setCell(ws, 'E7', investigator.residence);
  setCell(ws, 'M7', investigator.birthplace);

  // 日期
  setCell(ws, 'G8', investigator.scenarioYear || 1920);
  setCell(ws, 'J8', `${investigator.scenarioMonth || 1}月`);
  setCell(ws, 'L8', `${investigator.scenarioDay || 1}日`);

  // ========================================
  // 4. 填写九大属性
  // ========================================
  setCell(ws, 'U3', investigator.str);
  setCell(ws, 'AA3', investigator.dex);
  setCell(ws, 'AG3', investigator.pow);
  setCell(ws, 'U5', investigator.con);
  setCell(ws, 'AA5', investigator.app);
  setCell(ws, 'AG5', investigator.edu);
  setCell(ws, 'U7', investigator.siz);
  setCell(ws, 'AA7', investigator.int);
  setCell(ws, 'AG7', investigator.luck);

  // ========================================
  // 5. 填写派生属性 (R9-R11)
  // ========================================
  // HP（最大F9，当前G10）
  setCell(ws, 'F9', investigator.hpMax > 0 ? investigator.hpMax : derived.hpMax);
  setCell(ws, 'G10', investigator.hpCurrent > 0 ? investigator.hpCurrent : derived.hpMax);
  // SAN（最大K9，当前P10）
  setCell(ws, 'K9', investigator.sanMax > 0 ? investigator.sanMax : derived.sanMax);
  setCell(ws, 'P10', investigator.sanCurrent > 0 ? investigator.sanCurrent : derived.sanMax);
  // MP（最大T9，当前Y10）
  setCell(ws, 'T9', investigator.mpMax > 0 ? investigator.mpMax : derived.mpMax);
  setCell(ws, 'Y10', investigator.mpCurrent > 0 ? investigator.mpCurrent : derived.mpMax);
  // MOV
  setCell(ws, 'AF10', investigator.mov > 0 ? investigator.mov : derived.mov);

  // DB / Build / Dodge
  setCell(ws, 'AP52', db);
  setCell(ws, 'AP55', build);
  setCell(ws, 'AP57', dodge);

  // ========================================
  // 6. 填写技能
  // ========================================
  // 动态扫描模板中的技能名→行号
  const leftRows: Record<string, number> = {};
  const rightRows: Record<string, number> = {};
  for (let r = 16; r <= 60; r++) {
    const fc = ws[`F${r}`];
    if (fc && fc.t === 's' && typeof fc.v === 'string') leftRows[fc.v.trim()] = r;
    const ac = ws[`AB${r}`];
    if (ac && ac.t === 's' && typeof ac.v === 'string') rightRows[ac.v.trim()] = r;
  }

  for (const skill of investigator.skills) {
    const n = skill.name.trim();
    const o = skill.occupationPts || 0;
    const i = skill.interestPts || 0;
    const e = skill.experiencePts || 0;
    const g = skill.growthPts || 0;

    let row = findSkillRow(leftRows, n);
    if (row !== null) {
      // 左面板：N=职业, P=兴趣, L=成长, M=经验包
      setCell(ws, `N${row}`, o);
      setCell(ws, `P${row}`, i);
      setCell(ws, `L${row}`, e);
      if (g > 0) setCell(ws, `M${row}`, g);
      continue;
    }

    row = findSkillRow(rightRows, n);
    if (row !== null) {
      // 右面板：AJ=职业, AL=兴趣, AH=成长, AI=经验包
      setCell(ws, `AJ${row}`, o);
      setCell(ws, `AL${row}`, i);
      setCell(ws, `AH${row}`, e);
      if (g > 0) setCell(ws, `AI${row}`, g);
      continue;
    }
    // 模板中无此技能的槽位，跳过
  }

  // ========================================
  // 7. 填写叙事文本 (R61-R93)
  // ========================================
  setCell(ws, 'AA61', formatNarrative(investigator.appearance));
  setCell(ws, 'AA63', formatNarrative(investigator.ideology));
  setCell(ws, 'AA65', formatNarrative(investigator.importantPerson));
  setCell(ws, 'AA69', formatNarrative(investigator.valuableThing));
  setCell(ws, 'AA71', formatNarrative(investigator.traits));
  setCell(ws, 'AA73', formatNarrative(investigator.injuries));
  // 恐惧症和躁狂症
  setCell(ws, 'AA75', formatInsanity(investigator.insanity));
  // 背景故事
  setCell(ws, 'W77', formatNarrative(investigator.backstory, 2000));

  // ========================================
  // 8. 其他单值字段
  // ========================================
  // 有故事的调查员经历包
  if (investigator.experiencePack && investigator.experiencePack !== '无') {
    setCell(ws, 'F113', investigator.experiencePack);
  }

  // ========================================
  // 9. 武器表 (R53-R56)
  // ========================================
  // 模板武器表：W=伤害, AA=基础射程, AC=贯穿, AE=次数, AG=装弹量, AJ=故障值
  // 资源允许最多4行（R53, R54, R55, R56）
  if (investigator.weapons && investigator.weapons.length > 0) {
    const maxWeapons = Math.min(investigator.weapons.length, 4);
    for (let i = 0; i < maxWeapons; i++) {
      const w = investigator.weapons[i];
      const row = 53 + i;
      // U 列写武器/技能名称
      setCell(ws, `U${row}`, w.name);
      setCell(ws, `W${row}`, w.damage || '');
      setCell(ws, `AA${row}`, w.range || '');
      setCell(ws, `AC${row}`, w.era || '');
      setCell(ws, `AE${row}`, w.era || '');
      setCell(ws, `AG${row}`, w.ammo || '');
      setCell(ws, `AJ${row}`, w.malfunction || '');
    }
  }

  // ========================================
  // 10. 法术表 (R114+)
  // ========================================
  // 模板法术表：W=编号, Y=法术名称, AC=使用代价, AH=作用
  if (investigator.spells && investigator.spells.length > 0) {
    const maxSpells = Math.min(investigator.spells.length, 15);
    for (let i = 0; i < maxSpells; i++) {
      const s = investigator.spells[i];
      const row = 114 + i;
      setCell(ws, `W${row}`, i + 1);
      setCell(ws, `Y${row}`, s.name);
      setCell(ws, `AC${row}`, s.cost || '');
      setCell(ws, `AH${row}`, s.effect || '');
    }
  }

  // ========================================
  // 11. 伙伴表 (R130+)
  // ========================================
  // 模板伙伴表：W=姓名, AA=玩家, AD=注释, AL=造成改变, AP=相遇模组
  if (investigator.companions && investigator.companions.length > 0) {
    const maxComps = Math.min(investigator.companions.length, 12);
    for (let i = 0; i < maxComps; i++) {
      const c = investigator.companions[i];
      const row = 130 + i;
      setCell(ws, `W${row}`, c.name);
      setCell(ws, `AA${row}`, c.player || '');
      setCell(ws, `AD${row}`, c.notes || '');
      setCell(ws, `AL${row}`, c.changes || '');
      setCell(ws, `AP${row}`, c.scenario || '');
    }
  }

  // ========================================
  // 12. 触发下载
  // ========================================
  const fname = `${safeName(investigator.name)}_${safeName(investigator.occupationName || '未选择')}_${randCode()}.xlsx`;
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
