// ========== 调查员主数据 ==========
export interface SkillEntry {
  name: string;
  baseValue: string; // number or "DEX/2"
  occupationPts: number;
  interestPts: number;
  experiencePts: number;
  growthPts: number;
  isOccupation: boolean;
}

export interface WeaponEntry {
  name: string;
  skill: string;
  damage: string;
  range: string;
  era: string;
  ammo: string;
  malfunction: string;
  isTemporary: boolean;
}

export interface ArmorEntry {
  name: string;
  armorValue: number;
  isEnabled: boolean;
}

export interface SpellEntry {
  name: string;
  cost: string;
  castingTime: string;
  effect: string;
}

export interface CompanionEntry {
  name: string;
  player: string;
  notes: string;
  changes: string;
  scenario: string;
}

export interface InsanityEntry {
  type: 'phobia' | 'mania';
  name: string;
  english: string;
  description: string;
}

export interface Investigator {
  // 基本信息
  name: string;
  player: string;
  era: string;
  occupationId: number;
  occupationName: string;
  age: number;
  gender: string;
  residence: string;
  birthplace: string;
  scenarioYear: number;
  scenarioMonth: number;
  scenarioDay: number;

  // 九大属性
  str: number;
  dex: number;
  pow: number;
  con: number;
  app: number;
  edu: number;
  siz: number;
  int: number;
  luck: number;

  // 点数与职业
  creditRating: number;
  experiencePack: string;

  // 状态
  hpCurrent: number;
  hpMax: number;
  sanCurrent: number;
  sanMax: number;
  mpCurrent: number;
  mpMax: number;
  mov: number;
  isMajorWound: boolean;
  isTempInsane: boolean;
  isIndefInsane: boolean;
  isDying: boolean;
  isUnconscious: boolean;
  cthulhuMythos: number;

  // 子表
  skills: SkillEntry[];
  occupationJobSkills: string[];
  flexibleOccupationSkills: string[];
  weapons: WeaponEntry[];
  armors: ArmorEntry[];
  spells: SpellEntry[];
  companions: CompanionEntry[];
  insanity: InsanityEntry[];

  // 叙事
  backstory: string;
  appearance: string;
  ideology: string;
  importantPerson: string;
  meaningfulPlace: string;
  valuableThing: string;
  traits: string;
  injuries: string;
}

// ========== 种子数据类型 ==========
export interface SkillRule {
  type: 'choose_or_list' | 'choose_any';
  count: number;
  label: string;
  skills?: string[];
}

export interface Occupation {
  id: number;
  name: string;
  era: string;
  creditMin: number;
  creditMax: number;
  pointsFormula: string;
  skillDesc: string;
  contacts: string;
  description: string;
  jobSkills: string[];
  skillRules?: SkillRule[];
}

export interface WeaponRef {
  name: string;
  skill: string;
  damage: string;
  range: string;
  era: string;
  ammo: string;
  malfunction: string;
  penetration?: string;
}

export interface ArmorRef {
  name: string;
  armorValue: string;
  coverage: string;
  movPenalty: string;
}

export interface ExperiencePack {
  name: string;
  sanCost: string;
  skillPts: string;
  notes: string;
}

export interface InsanityItem {
  name: string;
  english: string;
  description: string;
}

export interface SkillBaseValue {
  baseValue: string;
  category: string;
  notes: string;
}

export interface AgeEffect {
  ageStart: number;
  ageEnd: number;
  effect: string;
}

export interface InsanityData {
  instantSymptoms: { id: number; symptom: string }[];
  summarySymptoms: { id: number; symptom: string }[];
  fears: InsanityItem[];
  manias: InsanityItem[];
}

// ========== 表单辅助类型 ==========
export interface PointsPool {
  occupationTotal: number;
  occupationUsed: number;
  interestTotal: number;
  interestUsed: number;
  experienceTotal: number;
  experienceUsed: number;
}

export interface DerivedStats {
  hpMax: number;
  sanMax: number;
  mpMax: number;
  mov: number;
  db: string;
  build: number;
  dodge: number;
  halfValues: Record<string, number>;
  fifthValues: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type Era = '1920s' | '现代' | '1890s' | '煤气灯' | '1980s' | '冷战' | '中世纪' | '远古' | '未来';
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SkillCategory = '调查' | '交涉' | '战斗' | '特技' | '学识';
