import type { Investigator } from '@/types';
import StatCard from './common/StatCard';

interface Step2Props {
  inv: Investigator;
  updateAttr: (attr: 'str' | 'dex' | 'pow' | 'con' | 'app' | 'edu' | 'siz' | 'int' | 'luck', val: number) => void;
  rollAttribute: (formula: string) => number;
  rollAllAttributes: () => void;
  halfValues: Record<string, number>;
  fifthValues: Record<string, number>;
  derived: { hpMax: number; sanMax: number; mpMax: number; mov: number; db: string; build: number; dodge: number };
}

const ATTRS = [
  { key: 'str' as const, icon: '💪', name: '力量', abbr: 'STR', min: 15, max: 90, formula: '3D6×5' },
  { key: 'dex' as const, icon: '🤸', name: '敏捷', abbr: 'DEX', min: 15, max: 90, formula: '3D6×5' },
  { key: 'pow' as const, icon: '🧠', name: '意志', abbr: 'POW', min: 15, max: 90, formula: '3D6×5' },
  { key: 'con' as const, icon: '🫀', name: '体质', abbr: 'CON', min: 15, max: 90, formula: '3D6×5' },
  { key: 'app' as const, icon: '💄', name: '外貌', abbr: 'APP', min: 15, max: 90, formula: '3D6×5' },
  { key: 'edu' as const, icon: '📚', name: '教育', abbr: 'EDU', min: 15, max: 99, formula: '(2D6+6)×5' },
  { key: 'siz' as const, icon: '📏', name: '体型', abbr: 'SIZ', min: 40, max: 90, formula: '(2D6+6)×5' },
  { key: 'int' as const, icon: '💡', name: '智力', abbr: 'INT', min: 40, max: 90, formula: '(2D6+6)×5' },
  { key: 'luck' as const, icon: '🍀', name: '幸运', abbr: 'LUCK', min: 15, max: 99, formula: '3D6×5' },
];

export default function Step2Attributes({ inv, updateAttr, rollAttribute, rollAllAttributes, halfValues, fifthValues, derived }: Step2Props) {
  const eduEffective = inv.age >= 40 ? Math.max(15, inv.edu - (Math.floor((inv.age - 40) / 10) + 1) * 5) : inv.edu;

  const totalPoints = inv.str + inv.dex + inv.pow + inv.con + inv.app + inv.edu + inv.siz + inv.int + inv.luck;

  return (
    <div>
      <h2 className="text-base font-semibold text-coc-text tracking-tight mb-4">⚡ 九大属性</h2>

      {/* Points tracker — MD3 tonal surface */}
      <div className="flex items-center justify-between bg-coc-accent/6 rounded-lg p-3 mb-4">
        <div className="text-sm text-coc-text">
          已用点数: <span className={`font-semibold ${totalPoints === 480 ? 'text-coc-success' : 'text-coc-accent'}`}>{totalPoints}</span>
          <span className="text-coc-muted/60"> / 480</span>
        </div>
        <button
          onClick={rollAllAttributes}
          className="md-ripple text-xs px-3 py-1.5 rounded-lg bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 transition-colors font-medium"
        >
          🎲 全部随机掷骰（总和=480）
        </button>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ATTRS.map(attr => {
          const isEdu = attr.key === 'edu';
          return (
            <StatCard
              key={attr.key}
              icon={attr.icon}
              name={attr.name}
              abbr={attr.abbr}
              value={inv[attr.key]}
              min={attr.min}
              max={attr.max}
              onChange={v => updateAttr(attr.key, v)}
              half={halfValues[attr.key] || 0}
              fifth={fifthValues[attr.key] || 0}
              formula={attr.formula}
              onRoll={() => updateAttr(attr.key, rollAttribute(attr.formula))}
              specialNote={
                isEdu && inv.age >= 40
                  ? `年龄修正后: ${eduEffective}（-${inv.edu - eduEffective}）`
                  : undefined
              }
              specialNoteColor="bg-coc-info/20 text-coc-info"
            />
          );
        })}
      </div>

      {/* Derived stats summary — MD3 chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <DerivedBadge label="HP" value={derived.hpMax} color="text-coc-text font-semibold" />
        <DerivedBadge label="SAN" value={derived.sanMax} color="text-coc-text font-semibold" />
        <DerivedBadge label="MP" value={derived.mpMax} color="text-coc-text font-semibold" />
        <DerivedBadge label="MOV" value={derived.mov} color="text-coc-text font-semibold" />
        <DerivedBadge label="DB" value={derived.db} color="text-coc-text font-semibold" />
        <DerivedBadge label="体格" value={derived.build} color="text-coc-text font-semibold" />
        <DerivedBadge label="闪避" value={`${derived.dodge}%`} color="text-coc-text font-semibold" />
      </div>
    </div>
  );
}

function DerivedBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-coc-bg rounded-full px-3 py-1 text-xs">
      <span className="text-coc-muted/60">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
