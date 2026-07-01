import type { Occupation, WeaponRef, ArmorRef, ExperiencePack, AgeEffect, InsanityData, SkillBaseValue } from '@/types';

// Seed data - in production this would come from API
// For development, we import directly

import occupations from '../../../seed_data/occupations.json';
import weapons from '../../../seed_data/weapons.json';
import armors from '../../../seed_data/armors.json';
import experiencePacks from '../../../seed_data/experience_packs.json';
import ageEffects from '../../../seed_data/age_effects.json';
import insanity from '../../../seed_data/insanity.json';
import skillBaseValues from '../../../seed_data/skill_base_values.json';
import eras from '../../../seed_data/eras.json';

// Convert snake_case JSON keys to camelCase for TypeScript
function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function mapKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(mapKeys);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[toCamelCase(k)] = v;
    }
    return result;
  }
  return obj;
}

export const OCCUPATIONS: Occupation[] = mapKeys(occupations);
export const WEAPONS: WeaponRef[] = weapons;
export const ARMORS: ArmorRef[] = armors;
export const EXPERIENCE_PACKS: ExperiencePack[] = experiencePacks;
export const AGE_EFFECTS: AgeEffect[] = ageEffects;
export const INSANITY_DATA: InsanityData = insanity;
export const SKILL_BASE_VALUES: Record<string, SkillBaseValue> = skillBaseValues;
export const ERAS: string[] = eras;

/** Get occupations filtered by era */
export function getOccupationsByEra(era: string): Occupation[] {
  return OCCUPATIONS.filter(o => o.id === 0 || o.id === 1 || o.era === era);
}

/** Get skill categories in display order */
export function getSkillCategories(): { category: string; skills: string[] }[] {
  const cats: Record<string, string[]> = {
    '调查': [], '交涉': [], '战斗': [], '特技': [], '学识': []
  };
  for (const [name, info] of Object.entries(SKILL_BASE_VALUES)) {
    if (cats[info.category]) {
      cats[info.category].push(name);
    }
  }
  return Object.entries(cats).map(([category, skills]) => ({ category, skills }));
}

/** All skill names */
export function getAllSkillNames(): string[] {
  return Object.keys(SKILL_BASE_VALUES);
}

/** Get experience pack skill allocation */
export function getExperiencePackSkills(packName: string): Record<string, number> {
  // These are typical COC 7e experience pack allocations
  const packs: Record<string, Record<string, number>> = {
    '战场经历包': {
      '闪避': 20, '射击：': 20, '急救': 10, '聆听': 10, '潜行': 10,
    },
    '警务经历包': {
      '法律': 15, '侦查': 15, '闪避': 10, '心理学': 10, '汽车驾驶': 10,
    },
    '罪犯经历包': {
      '锁匠': 15, '潜行': 15, '妙手': 10, '侦查': 10, '斗殴': 10,
    },
    '医务经历包': {
      '急救': 20, '医学': 15, '精神分析': 10, '心理学': 10, '科学①': 5,
    },
    '神话经历包': {
      '克苏鲁神话': 15, '神秘学': 15, '图书馆使用': 10, '外语①': 10, '历史': 10,
    },
  };
  return packs[packName] || {};
}
