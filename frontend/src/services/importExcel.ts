/**
 * 从 Excel 文件导入人物卡
 * 与 exportExcel.ts 的模板格式完全对齐
 */
import type { Investigator, SkillEntry, WeaponEntry, SpellEntry, CompanionEntry, InsanityEntry } from '@/types';
import * as XLSX from 'xlsx-js-style';
import { SKILL_BASE_VALUES, getAllSkillNames } from '@/data';

// ========================================
// 工具函数
// ========================================

/** 读取单元格字符串值 */
function cellStr(ws: XLSX.WorkSheet, ref: string): string {
  const c = ws[ref];
  if (!c || c.v === undefined || c.v === null) return '';
  return String(c.v).trim();
}

/** 读取单元格数值 */
function cellNum(ws: XLSX.WorkSheet, ref: string): number {
  const s = cellStr(ws, ref);
  if (s === '') return 0;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

// ========================================
// 技能名称匹配（模板技能名 → 应用 SkillEntry 名）
// ========================================

/** 灵活匹配技能名称 */
function matchSkillName(templateName: string): string | null {
  // 1. 精确匹配
  if (SKILL_BASE_VALUES[templateName]) return templateName;

  const clean = templateName.replace(/[：Ω①②③]/g, '').trim();

  // 2. 去掉格式后缀后匹配
  for (const key of Object.keys(SKILL_BASE_VALUES)) {
    if (key === clean) return key;
  }

  // 3. 前缀匹配（如 格斗 → 格斗：）
  for (const key of Object.keys(SKILL_BASE_VALUES)) {
    if (key.startsWith(clean + '：') || key.startsWith(clean + ':')) return key;
  }

  // 4. 特殊映射（武器技能名 → 应用子槽位）
  const specialMap: Record<string, string> = {
    '手枪':        '射击①',
    '步枪/霰弹枪': '射击②',
    '冲锋枪':      '射击③',
    '剑':          '格斗②',
    '斧':          '格斗③',
    '电锯':        '格斗③',
    '链枷':        '格斗②',
    '绞具':        '格斗①',
    '鞭子':        '格斗③',
    '弓术':        '射击③',
    '机枪':        '射击②',
    '炮术':        '射击③',
  };
  return specialMap[templateName] || null;
}

// ========================================
// 叙事文本解析
// ========================================

/** 尝试将文本解析为恐惧症/狂躁症条目列表 */
function parseInsanityText(text: string): InsanityEntry[] {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  const items: InsanityEntry[] = [];
  for (const line of lines) {
    const match = line.match(/(\d+)\.\s*\[(\w+)\]\s*(.+?)(?:\((.+?)\))?(?:\s*：(.+))?$/);
    if (match) {
      items.push({
        type: match[2] === '恐惧' ? 'phobia' : 'mania',
        name: match[3].trim(),
        english: (match[4] || '').trim(),
        description: (match[5] || '').trim(),
      });
    }
  }
  return items;
}

// ========================================
// 结果类型
// ========================================

export interface ImportResult {
  investigator: Investigator;
  errors: string[];
  warnings: string[];
}

// ========================================
// 主导入函数
// ========================================

export async function importCharacterFromExcel(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 读取文件
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    throw new Error('无法读取文件，请确认文件未损坏');
  }

  const wb = XLSX.read(buf, { type: 'array', cellStyles: true, cellNF: true });
  const ws = wb.Sheets['人物卡'];
  if (!ws) {
    throw new Error('Excel 文件中找不到"人物卡"工作表');
  }

  // ========================================
  // 2. 基本信息
  // ========================================
  const name = cellStr(ws, 'E3') || '导入人物';
  const player = cellStr(ws, 'E4');
  const era = cellStr(ws, 'M4') || '1920s';
  const occupationId = cellNum(ws, 'M5');
  const occupationName = cellStr(ws, 'E5');
  const age = cellNum(ws, 'E6') || 25;
  const gender = cellStr(ws, 'M6');
  const residence = cellStr(ws, 'E7');
  const birthplace = cellStr(ws, 'M7');
  const scenarioYear = cellNum(ws, 'G8') || 1920;
  const monthStr = cellStr(ws, 'J8').replace(/月/g, '').trim();
  const dayStr = cellStr(ws, 'L8').replace(/日/g, '').trim();
  const scenarioMonth = parseInt(monthStr) || 1;
  const scenarioDay = parseInt(dayStr) || 1;

  // ========================================
  // 3. 九大属性
  // ========================================
  const str = cellNum(ws, 'U3') || 50;
  const dex = cellNum(ws, 'AA3') || 50;
  const pow = cellNum(ws, 'AG3') || 50;
  const con = cellNum(ws, 'U5') || 50;
  const app = cellNum(ws, 'AA5') || 50;
  const edu = cellNum(ws, 'AG5') || 50;
  const siz = cellNum(ws, 'U7') || 50;
  const int_ = cellNum(ws, 'AA7') || 50;
  const luck = cellNum(ws, 'AG7') || 50;

  // ========================================
  // 4. 派生属性
  // ========================================
  const hpMax = cellNum(ws, 'F9') || Math.floor((con + siz) / 10);
  const hpCurrent = cellNum(ws, 'G10') || hpMax;
  const sanMax = cellNum(ws, 'K9') || pow;
  const sanCurrent = cellNum(ws, 'P10') || sanMax;
  const mpMax = cellNum(ws, 'T9') || Math.floor(pow / 5);
  const mpCurrent = cellNum(ws, 'Y10') || mpMax;
  const mov = cellNum(ws, 'AF10') || 8;

  // ========================================
  // 5. 技能
  // ========================================
  // 扫描模板中的技能名→行号
  const leftRows: Record<string, number> = {};
  const rightRows: Record<string, number> = {};
  for (let r = 16; r <= 60; r++) {
    const fc = ws[`F${r}`];
    if (fc && fc.t === 's' && typeof fc.v === 'string') leftRows[fc.v.trim()] = r;
    const ac = ws[`AB${r}`];
    if (ac && ac.t === 's' && typeof ac.v === 'string') rightRows[ac.v.trim()] = r;
  }

  // 汇总所有技能的点数映射
  const skillMap = new Map<string, { occupationPts: number; interestPts: number; experiencePts: number; growthPts: number }>();

  // 左面板：N=职业, P=兴趣, L=经验包, M=成长
  for (const [tplName, row] of Object.entries(leftRows)) {
    const appName = matchSkillName(tplName);
    if (appName) {
      skillMap.set(appName, {
        occupationPts: cellNum(ws, `N${row}`),
        interestPts: cellNum(ws, `P${row}`),
        experiencePts: cellNum(ws, `L${row}`),
        growthPts: cellNum(ws, `M${row}`),
      });
    }
  }

  // 右面板：AJ=职业, AL=兴趣, AH=经验包, AI=成长
  for (const [tplName, row] of Object.entries(rightRows)) {
    const appName = matchSkillName(tplName);
    if (appName) {
      const existing = skillMap.get(appName);
      const pts = {
        occupationPts: cellNum(ws, `AJ${row}`),
        interestPts: cellNum(ws, `AL${row}`),
        experiencePts: cellNum(ws, `AH${row}`),
        growthPts: cellNum(ws, `AI${row}`),
      };
      if (existing) {
        existing.occupationPts += pts.occupationPts;
        existing.interestPts += pts.interestPts;
        existing.experiencePts += pts.experiencePts;
        existing.growthPts += pts.growthPts;
      } else {
        skillMap.set(appName, pts);
      }
    } else if (tplName) {
      warnings.push(`未识别的模板技能名：${tplName}（位于右侧面板）`);
    }
  }

  // 构建 skills 数组：包含所有已注册技能，按 SKILL_BASE_VALUES 顺序
  const allSkillNames = getAllSkillNames();
  const skills: SkillEntry[] = allSkillNames.map(name => {
    const info = SKILL_BASE_VALUES[name];
    const mapped = skillMap.get(name);
    const occPts = mapped?.occupationPts || 0;
    const intPts = mapped?.interestPts || 0;
    const expPts = mapped?.experiencePts || 0;
    const groPts = mapped?.growthPts || 0;
    return {
      name,
      baseValue: info?.baseValue || '1',
      occupationPts: occPts,
      interestPts: intPts,
      experiencePts: expPts,
      growthPts: groPts,
      isOccupation: occPts > 0,
    };
  });

  // ========================================
  // 6. 信用评级（从技能表的信用评级取职业点）
  // ========================================
  const creditSkill = skillMap.get('信用评级');
  const creditRating = creditSkill?.occupationPts || 0;

  // ========================================
  // 7. 经历包
  // ========================================
  const experiencePack = cellStr(ws, 'F113');

  // ========================================
  // 8. 武器（模板行 53-56）
  // ========================================
  const weapons: WeaponEntry[] = [];
  for (let r = 53; r <= 56; r++) {
    const wName = cellStr(ws, `U${r}`);
    if (!wName) continue;
    weapons.push({
      name: wName,
      skill: wName,     // 武器名即关联技能名（由编辑页手动调整）
      damage: cellStr(ws, `W${r}`),
      range: cellStr(ws, `AA${r}`),
      era: cellStr(ws, `AE${r}`),
      ammo: cellStr(ws, `AG${r}`),
      malfunction: cellStr(ws, `AJ${r}`),
      isTemporary: false,
    });
  }

  // ========================================
  // 9. 法术（模板行 114+）
  // ========================================
  const spells: SpellEntry[] = [];
  for (let r = 114; r < 129; r++) {
    const sName = cellStr(ws, `Y${r}`);
    if (!sName) continue;
    spells.push({
      name: sName,
      cost: cellStr(ws, `AC${r}`),
      castingTime: '',
      effect: cellStr(ws, `AH${r}`),
    });
  }

  // ========================================
  // 10. 伙伴（模板行 130+）
  // ========================================
  const companions: CompanionEntry[] = [];
  for (let r = 130; r < 142; r++) {
    const cName = cellStr(ws, `W${r}`);
    if (!cName) continue;
    companions.push({
      name: cName,
      player: cellStr(ws, `AA${r}`),
      notes: cellStr(ws, `AD${r}`),
      changes: cellStr(ws, `AL${r}`),
      scenario: cellStr(ws, `AP${r}`),
    });
  }

  // ========================================
  // 11. 叙事文本
  // ========================================
  const appearance = cellStr(ws, 'AA61');
  const ideology = cellStr(ws, 'AA63');
  const importantPerson = cellStr(ws, 'AA65');
  const valuableThing = cellStr(ws, 'AA69');
  const traits = cellStr(ws, 'AA71');
  const injuries = cellStr(ws, 'AA73');
  const insanityText = cellStr(ws, 'AA75');
  const backstory = cellStr(ws, 'W77');

  // ========================================
  // 12. 构建 Investigator
  // ========================================
  const investigator: Investigator = {
    name, player, era, occupationId, occupationName,
    age, gender, residence, birthplace,
    scenarioYear, scenarioMonth, scenarioDay,
    str, dex, pow, con, app, edu, siz, int: int_, luck,
    creditRating,
    experiencePack,
    hpCurrent, hpMax, sanCurrent, sanMax, mpCurrent, mpMax, mov,
    isMajorWound: false, isTempInsane: false, isIndefInsane: false,
    isDying: false, isUnconscious: false,
    cthulhuMythos: 0,
    skills,
    weapons,
    armors: [{ name: '', armorValue: 0, isEnabled: false }],
    spells,
    companions,
    insanity: parseInsanityText(insanityText),
    backstory, appearance, ideology, importantPerson,
    meaningfulPlace: '',
    valuableThing, traits, injuries,
    // ★ 新增：导入时从 isOccupation 自动填充 ★
    occupationJobSkills: skills.filter(s => s.isOccupation).map(s => s.name),
    flexibleOccupationSkills: [],
  };

  return { investigator, errors, warnings };
}
