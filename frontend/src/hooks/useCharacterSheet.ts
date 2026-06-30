import { useState, useCallback } from 'react';
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
    weapons: [{ name: '', skill: '斗殴', damage: '1D3+DB', range: '接触', attacks: '1', ammo: '-', malfunction: '-', isTemporary: false }],
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
  const [step, setStep] = useState<WizardStep>(initialInvestigator ? 6 : 1);
  const [isExpertMode, setIsExpertMode] = useState(false);

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
      weapons: [...prev.weapons, { name: '', skill: '斗殴', damage: '1D3+DB', range: '接触', attacks: '1', ammo: '-', malfunction: '-', isTemporary: false }],
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
  const nextStep = useCallback(() => setStep(prev => Math.min(6, prev + 1) as WizardStep), []);
  const prevStep = useCallback(() => setStep(prev => Math.max(1, prev - 1) as WizardStep), []);

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
    goToStep, nextStep, prevStep,
    reset,
  };
}
