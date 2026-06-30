import { useState, useCallback, useEffect } from 'react';
import type { Investigator, SkillEntry, WeaponEntry, ArmorEntry, SpellEntry, CompanionEntry, InsanityEntry, WizardStep } from '@/types';
import { getAllSkillNames } from '@/data';
import { calcAllDerived, calcPointsPool } from '@/utils/calculations';

const DEFAULT_ATTR = 50;
const MIN_STR_DEX_INT = 15;
const MIN_SIZ_INT = 40;

function createDefaultSkills(): SkillEntry[] {
  return getAllSkillNames().map(name => ({
    name,
    baseValue: '?',
    occupationPts: 0,
    interestPts: 0,
    experiencePts: 0,
    growthPts: 0,
    isOccupation: false,
  }));
}

function createDefaultInvestigator(): Investigator {
  return {
    name: '', player: '', era: '1920s', occupationId: 0, occupationName: '',
    age: 25, gender: '', residence: '', birthplace: '',
    scenarioYear: 2025, scenarioMonth: 1, scenarioDay: 1,
    str: DEFAULT_ATTR, dex: DEFAULT_ATTR, pow: DEFAULT_ATTR, con: DEFAULT_ATTR,
    app: DEFAULT_ATTR, edu: DEFAULT_ATTR, siz: DEFAULT_ATTR, int: DEFAULT_ATTR, luck: DEFAULT_ATTR,
    creditRating: 0, experiencePack: '',
    hpCurrent: 0, hpMax: 0, sanCurrent: 0, sanMax: 0, mpCurrent: 0, mpMax: 0, mov: 8,
    isMajorWound: false, isTempInsane: false, isIndefInsane: false, isDying: false, isUnconscious: false,
    cthulhuMythos: 0,
    skills: createDefaultSkills(),
    weapons: [{ name: '', skill: '斗殴', damage: '1D3+DB', range: '接触', era: '现代', ammo: '-', malfunction: '-', isTemporary: false }],
    armors: [{ name: '', armorValue: 0, isEnabled: false }],
    spells: [{ name: '', cost: '', castingTime: '', effect: '' }],
    companions: [{ name: '', player: '', notes: '', changes: '', scenario: '' }],
    insanity: [],
    backstory: '', appearance: '', ideology: '', importantPerson: '',
    meaningfulPlace: '', valuableThing: '', traits: '', injuries: '',
  };
}

export function useCharacterSheet(initialInvestigator?: Investigator) {
  const [investigator, setInvestigator] = useState<Investigator>(() =>
    initialInvestigator ?? createDefaultInvestigator()
  );
  const [step, setStep] = useState<WizardStep>(initialInvestigator ? 7 : 1);
  const [isExpertMode, setIsExpertMode] = useState(false);

  // Sync state when initialInvestigator is loaded asynchronously (edit mode)
  useEffect(() => {
    if (initialInvestigator) {
      setInvestigator(initialInvestigator);
      setStep(7);
    }
  }, [initialInvestigator]);

  // Derived stats (recalculated on every render)
  const derived = calcAllDerived(investigator);
  const pointsPool = calcPointsPool(investigator);

  const updateField = useCallback(<K extends keyof Investigator>(field: K, value: Investigator[K]) => {
    setInvestigator(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateAttr = useCallback((attr: 'str' | 'dex' | 'pow' | 'con' | 'app' | 'edu' | 'siz' | 'int' | 'luck', value: number) => {
    setInvestigator(prev => ({ ...prev, [attr]: value }));
  }, []);

  const updateSkill = useCallback((index: number, updates: Partial<SkillEntry>) => {
    setInvestigator(prev => {
      const skills = [...prev.skills];
      skills[index] = { ...skills[index], ...updates };
      return { ...prev, skills };
    });
  }, []);

  const addWeapon = useCallback(() => {
    setInvestigator(prev => ({
      ...prev,
      weapons: [...prev.weapons, { name: '', skill: '斗殴', damage: '1D3+DB', range: '接触', era: '现代', ammo: '-', malfunction: '-', isTemporary: false }],
    }));
  }, []);

  const updateWeapon = useCallback((index: number, updates: Partial<WeaponEntry>) => {
    setInvestigator(prev => {
      const weapons = [...prev.weapons];
      weapons[index] = { ...weapons[index], ...updates };
      return { ...prev, weapons };
    });
  }, []);

  const removeWeapon = useCallback((index: number) => {
    setInvestigator(prev => ({
      ...prev,
      weapons: prev.weapons.filter((_, i) => i !== index),
    }));
  }, []);

  const addArmor = useCallback(() => {
    setInvestigator(prev => ({
      ...prev,
      armors: [...prev.armors, { name: '', armorValue: 0, isEnabled: true }],
    }));
  }, []);

  const updateArmor = useCallback((index: number, updates: Partial<ArmorEntry>) => {
    setInvestigator(prev => {
      const armors = [...prev.armors];
      armors[index] = { ...armors[index], ...updates };
      return { ...prev, armors };
    });
  }, []);

  const removeArmor = useCallback((index: number) => {
    setInvestigator(prev => ({
      ...prev,
      armors: prev.armors.filter((_, i) => i !== index),
    }));
  }, []);

  const addSpell = useCallback(() => {
    setInvestigator(prev => ({
      ...prev,
      spells: [...prev.spells, { name: '', cost: '', castingTime: '', effect: '' }],
    }));
  }, []);

  const updateSpell = useCallback((index: number, updates: Partial<SpellEntry>) => {
    setInvestigator(prev => {
      const spells = [...prev.spells];
      spells[index] = { ...spells[index], ...updates };
      return { ...prev, spells };
    });
  }, []);

  const removeSpell = useCallback((index: number) => {
    setInvestigator(prev => ({
      ...prev,
      spells: prev.spells.filter((_, i) => i !== index),
    }));
  }, []);

  const addCompanion = useCallback(() => {
    setInvestigator(prev => ({
      ...prev,
      companions: [...prev.companions, { name: '', player: '', notes: '', changes: '', scenario: '' }],
    }));
  }, []);

  const updateCompanion = useCallback((index: number, updates: Partial<CompanionEntry>) => {
    setInvestigator(prev => {
      const companions = [...prev.companions];
      companions[index] = { ...companions[index], ...updates };
      return { ...prev, companions };
    });
  }, []);

  const addInsanity = useCallback(() => {
    setInvestigator(prev => ({
      ...prev,
      insanity: [...prev.insanity, { type: 'phobia' as const, name: '', english: '', description: '' }],
    }));
  }, []);

  const updateInsanity = useCallback((index: number, updates: Partial<InsanityEntry>) => {
    setInvestigator(prev => {
      const insanity = [...prev.insanity];
      insanity[index] = { ...insanity[index], ...updates };
      return { ...prev, insanity };
    });
  }, []);

  const removeInsanity = useCallback((index: number) => {
    setInvestigator(prev => ({
      ...prev,
      insanity: prev.insanity.filter((_, i) => i !== index),
    }));
  }, []);

  const setJobSkills = useCallback((jobSkills: string[]) => {
    setInvestigator(prev => {
      const skills = prev.skills.map(s => ({
        ...s,
        isOccupation: jobSkills.includes(s.name),
      }));
      return { ...prev, skills };
    });
  }, []);

  const rollAttribute = useCallback((formula: string): number => {
    // 3D6×5 → roll 3d6, sum, multiply by 5
    const match = formula.match(/(\d+)D(\d+)/);
    if (!match) return 50;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += Math.floor(Math.random() * sides) + 1;
    }
    if (formula.includes('×5') || formula.includes('*5')) sum *= 5;
    if (formula.includes('+6')) sum += 6;
    return sum;
  }, []);

  const goToStep = useCallback((s: WizardStep) => setStep(s), []);
  const nextStep = useCallback(() => setStep(prev => Math.min(7, prev + 1) as WizardStep), []);
  const prevStep = useCallback(() => setStep(prev => Math.max(1, prev - 1) as WizardStep), []);

  const rollAllAttributes = useCallback(() => {
    setInvestigator(prev => {
      const rollDice = (count: number, sides: number, mult: number = 1): number => {
        let s = 0;
        for (let i = 0; i < count; i++) s += Math.floor(Math.random() * sides) + 1;
        return s * mult;
      };

      const formulas: Record<string, () => number> = {
        str: () => rollDice(3, 6, 5),
        dex: () => rollDice(3, 6, 5),
        pow: () => rollDice(3, 6, 5),
        con: () => rollDice(3, 6, 5),
        app: () => rollDice(3, 6, 5),
        edu: () => (rollDice(2, 6) + 6) * 5,
        siz: () => (rollDice(2, 6) + 6) * 5,
        int: () => (rollDice(2, 6) + 6) * 5,
        luck: () => rollDice(3, 6, 5),
      };

      const attrKeys = ['str', 'dex', 'pow', 'con', 'app', 'edu', 'siz', 'int', 'luck'] as const;

      // Rejection sampling: try up to 2000 times for exact 480
      for (let attempt = 0; attempt < 2000; attempt++) {
        const vals: Record<string, number> = {};
        let total = 0;
        for (const key of attrKeys) {
          vals[key] = formulas[key]();
          total += vals[key];
        }
        if (total === 480) {
          const newInv = { ...prev };
          for (const key of attrKeys) newInv[key] = vals[key];
          return newInv;
        }
      }

      // Fallback: roll once and distribute diff
      const vals: Record<string, number> = {};
      let total = 0;
      for (const key of attrKeys) {
        vals[key] = formulas[key]();
        total += vals[key];
      }

      let diff = 480 - total;
      const priority = ['luck', 'edu', 'dex', 'str', 'pow', 'con', 'app', 'siz', 'int'] as const;
      for (const key of priority) {
        if (diff === 0) break;
        const current = vals[key];
        const min = (key === 'siz' || key === 'int') ? 40 : 15;
        const max = (key === 'edu' || key === 'luck') ? 99 : 90;
        if (diff > 0) {
          const add = Math.min(diff, max - current);
          vals[key] += add;
          diff -= add;
        } else {
          const sub = Math.min(-diff, current - min);
          vals[key] -= sub;
          diff += sub;
        }
      }

      const newInv = { ...prev };
      for (const key of attrKeys) newInv[key] = vals[key];
      return newInv;
    });
  }, []);

  const reset = useCallback(() => {
    setInvestigator(createDefaultInvestigator());
    setStep(1);
  }, []);

  return {
    investigator,
    derived,
    pointsPool,
    step,
    isExpertMode,
    setIsExpertMode,
    updateField,
    updateAttr,
    updateSkill,
    setJobSkills,
    addWeapon, updateWeapon, removeWeapon,
    addArmor, updateArmor, removeArmor,
    addSpell, updateSpell, removeSpell,
    addCompanion, updateCompanion,
    addInsanity, updateInsanity, removeInsanity,
    rollAttribute,
    rollAllAttributes,
    goToStep, nextStep, prevStep,
    reset,
  };
}
