/**
 * COC 7e 核心计算公式
 * 所有计算基于七版规则书
 */

import type { SkillEntry, Investigator, DerivedStats, PointsPool, SkillBaseValue } from '@/types';
import { SKILL_BASE_VALUES } from '@/data';

// ========== 点数池计算 ==========

/** 解析职业点数公式，返回总点数 */
export function calcOccupationPoints(edu: number, formula: string, str: number = 50, dex: number = 50, app: number = 50): number {
  if (!formula) return edu * 4;
  // 标准化公式字符串
  const f = formula.replace(/×/g, '*').replace(/x/g, '*').replace(/X/g, '*').trim();
  
  if (f === '教育*4') return edu * 4;
  if (f === '教育*2＋敏捷*2') return edu * 2 + dex * 2;
  if (f.includes('教育*2＋外貌*2')) return edu * 2 + app * 2;
  if (f.includes('教育*2＋力量*2')) return edu * 2 + str * 2;
  if (f.includes('教育*2＋MAX')) {
    // 解析 MAX(STR×2, DEX×2) or MAX(DEX×2, APP×2)
    let maxVal = 0;
    if (f.includes('力量') && f.includes('敏捷')) maxVal = Math.max(str * 2, dex * 2);
    else if (f.includes('力量')) maxVal = str * 2;
    else if (f.includes('敏捷') && f.includes('外貌')) maxVal = Math.max(dex * 2, app * 2);
    else if (f.includes('敏捷')) maxVal = dex * 2;
    else if (f.includes('外貌')) maxVal = app * 2;
    return edu * 2 + maxVal;
  }
  
  // Default fallback
  return edu * 4;
}

/** 计算兴趣点数池 */
export function calcInterestPoints(int_: number): number {
  return int_ * 2;
}

/** 计算经历包点数 */
export function calcExperiencePoints(packName: string): number {
  const pts: Record<string, number> = {
    '战场经历包': 70, '警务经历包': 60, '罪犯经历包': 60,
    '医务经历包': 60, '神话经历包': 0,
  };
  return pts[packName] || 0;
}

// ========== 派生值计算 ==========

/** DB (Damage Bonus) 和 Build */
export function calcDBandBuild(str: number, siz: number): { db: string; build: number } {
  const total = str + siz;
  if (total <= 64) return { db: '-2', build: -2 };
  if (total <= 84) return { db: '-1', build: -1 };
  if (total <= 124) return { db: '0', build: 0 };
  if (total <= 164) return { db: '+1D4', build: 1 };
  if (total <= 204) return { db: '+1D6', build: 2 };
  if (total <= 284) return { db: '+2D6', build: 3 };
  if (total <= 364) return { db: '+3D6', build: 4 };
  if (total <= 444) return { db: '+4D6', build: 5 };
  return { db: '+5D6', build: 6 };
}

/** HP 最大值 */
export function calcHPMax(con: number, siz: number): number {
  return Math.floor((con + siz) / 10);
}

/** SAN 最大值 */
export function calcSANMax(pow: number): number {
  return pow;
}

/** MP 最大值 */
export function calcMPMax(pow: number): number {
  return Math.floor(pow / 5);
}

/** MOV 移动力（考虑年龄和护甲） */
export function calcMov(
  age: number,
  str: number,
  dex: number,
  siz: number,
  armorPenalty: number = 0
): number {
  let mov = 8;
  
  // 年龄减值
  if (age >= 80) mov -= 5;
  else if (age >= 70) mov -= 4;
  else if (age >= 60) mov -= 3;
  else if (age >= 50) mov -= 2;
  else if (age >= 40) mov -= 1;
  
  // 体型调整
  if (str < siz && dex < siz) mov -= 1;
  else if (str > siz && dex > siz) mov += 1;
  
  // 护甲减值
  mov -= armorPenalty;
  
  return Math.max(1, mov); // 最小1
}

/** 闪避基础值 */
export function calcDodge(dex: number): number {
  return Math.floor(dex / 2);
}

/** EDU 年龄补正后 */
export function calcEffectiveEDU(edu: number, age: number): number {
  if (age < 40) return edu;
  const decades = Math.floor((age - 40) / 10) + 1;
  return Math.max(0, edu - decades * 5);
}

/** 半值和1/5值 */
export function calcAttrDerivatives(attr: number): { half: number; fifth: number } {
  return {
    half: Math.floor(attr / 2),
    fifth: Math.floor(attr / 5),
  };
}

/** 技能基础值解析 */
export function resolveSkillBase(skillName: string, attr: { dex: number; edu: number; pow: number }): number {
  const info = SKILL_BASE_VALUES[skillName];
  if (!info) return 1;
  
  const bv = info.baseValue;
  if (bv === 'DEX/2' || bv === 'dex/2') return Math.floor(attr.dex / 2);
  if (bv === 'EDU' || bv === 'edu') return attr.edu;
  if (bv === 'POW' || bv === 'pow') return attr.pow;
  
  const num = parseInt(bv, 10);
  return isNaN(num) ? 1 : num;
}

/** 计算技能成功率 */
export function calcSkillSuccess(skill: SkillEntry, attr: { dex: number; edu: number; pow: number }): number {
  const base = resolveSkillBase(skill.name, attr);
  return base + skill.experiencePts + skill.occupationPts + skill.interestPts + skill.growthPts;
}

/** 计算单项技能的普通/困难/极难 */
export function calcSkillLevels(successRate: number): { normal: number; hard: number; extreme: number } {
  return {
    normal: successRate,
    hard: Math.floor(successRate / 2),
    extreme: Math.floor(successRate / 5),
  };
}

// ========== 批量计算 ==========

/** 计算所有派生值 */
export function calcAllDerived(inv: Partial<Investigator>): DerivedStats {
  const str = inv.str || 50;
  const dex = inv.dex || 50;
  const pow = inv.pow || 50;
  const con = inv.con || 50;
  const app = inv.app || 50;
  const edu = inv.edu || 50;
  const siz = inv.siz || 50;
  const int = inv.int || 50;
  const age = inv.age || 25;

  const { db, build } = calcDBandBuild(str, siz);
  const attrs = { str, dex, con, app, pow, edu, siz, int };

  const halfValues: Record<string, number> = {};
  const fifthValues: Record<string, number> = {};
  for (const [key, val] of Object.entries(attrs)) {
    const d = calcAttrDerivatives(val);
    halfValues[key] = d.half;
    fifthValues[key] = d.fifth;
  }

  return {
    hpMax: calcHPMax(con, siz),
    sanMax: calcSANMax(pow),
    mpMax: calcMPMax(pow),
    mov: calcMov(age, str, dex, siz),
    db,
    build,
    dodge: calcDodge(dex),
    halfValues,
    fifthValues,
  };
}

/** 计算总点数池 */
export function calcPointsPool(inv: Partial<Investigator>): PointsPool {
  const edu = inv.edu || 50;
  const int = inv.int || 50;
  const occupationId = inv.occupationId || 0;
  
  let occupationTotal = edu * 4;
  // Get formula from occupation
  if (occupationId > 1) {
    // We'll compute this when occupation is selected
    occupationTotal = edu * 4; // default
  }
  
  return {
    occupationTotal,
    occupationUsed: (inv.skills || []).reduce((s, sk) => s + sk.occupationPts, 0),
    interestTotal: calcInterestPoints(int),
    interestUsed: (inv.skills || []).reduce((s, sk) => s + sk.interestPts, 0),
    experienceTotal: calcExperiencePoints(inv.experiencePack || ''),
    experienceUsed: (inv.skills || []).reduce((s, sk) => s + sk.experiencePts, 0),
  };
}
