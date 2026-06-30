import type { Investigator, DerivedStats, PointsPool } from '@/types';
import { calcAttrDerivatives } from '@/utils/calculations';

interface Step6Props {
  inv: Investigator;
  derived: DerivedStats;
  pointsPool: PointsPool;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
}

export default function Step6Summary({ inv, derived, pointsPool, updateField }: Step6Props) {
  // Validation checks
  const checks = [
    { label: '姓名已填写', pass: inv.name.trim().length > 0, required: true },
    { label: '玩家已填写', pass: inv.player.trim().length > 0, required: true },
    { label: '九属性完整', pass: true, required: true },
    { label: '职业已选择', pass: inv.occupationId > 0, required: true },
    { label: '技能>=1项已分配', pass: inv.skills.some(s => s.occupationPts > 0 || s.interestPts > 0), required: false },
    { label: '背景故事已填写', pass: inv.backstory.trim().length > 0, required: false },
    { label: `职业点分配完成 (${pointsPool.occupationUsed}/${pointsPool.occupationTotal})`, pass: pointsPool.occupationUsed === pointsPool.occupationTotal, required: true },
    { label: `兴趣点分配完成 (${pointsPool.interestUsed}/${pointsPool.interestTotal})`, pass: pointsPool.interestUsed === pointsPool.interestTotal, required: true },
  ];

  const requiredPass = checks.filter(c => c.required).every(c => c.pass);
  const allPass = checks.every(c => c.pass);

  const attrs = ['str', 'dex', 'pow', 'con', 'app', 'edu', 'siz', 'int'] as const;
  const attrNames: Record<string, string> = { str: '力量', dex: '敏捷', pow: '意志', con: '体质', app: '外貌', edu: '教育', siz: '体型', int: '智力' };

  return (
    <div>
      <h2 className="text-lg font-semibold text-coc-gold mb-4">✅ 状态与确认</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Status */}
        <div>
          <h3 className="text-sm font-semibold text-coc-text mb-3">🩸 当前状态</h3>
          <div className="bg-coc-card rounded-xl p-4 border border-coc-border space-y-4">
            {/* HP */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-coc-text">HP</span>
                <span className="text-coc-accent font-bold">{inv.hpCurrent || derived.hpMax} / {derived.hpMax}</span>
              </div>
              <input type="range" min={0} max={derived.hpMax} value={inv.hpCurrent || derived.hpMax}
                onChange={e => updateField('hpCurrent', Number(e.target.value))} className="w-full" />
            </div>
            {/* SAN */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-coc-text">SAN</span>
                <span className="text-coc-info font-bold">{inv.sanCurrent || derived.sanMax} / {derived.sanMax}</span>
              </div>
              <input type="range" min={0} max={derived.sanMax} value={inv.sanCurrent || derived.sanMax}
                onChange={e => updateField('sanCurrent', Number(e.target.value))} className="w-full" />
            </div>
            {/* MP */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-coc-text">MP</span>
                <span className="text-purple-400 font-bold">{inv.mpCurrent || derived.mpMax} / {derived.mpMax}</span>
              </div>
              <input type="range" min={0} max={derived.mpMax} value={inv.mpCurrent || derived.mpMax}
                onChange={e => updateField('mpCurrent', Number(e.target.value))} className="w-full" />
            </div>

            {/* Status toggles */}
            <div className="flex flex-wrap gap-2">
              <ToggleBadge label="重伤" active={inv.isMajorWound} onChange={v => updateField('isMajorWound', v)} />
              <ToggleBadge label="临时疯狂" active={inv.isTempInsane} onChange={v => updateField('isTempInsane', v)} />
              <ToggleBadge label="不定疯狂" active={inv.isIndefInsane} onChange={v => updateField('isIndefInsane', v)} />
              <ToggleBadge label="濒死" active={inv.isDying} onChange={v => updateField('isDying', v)} />
              <ToggleBadge label="昏迷" active={inv.isUnconscious} onChange={v => updateField('isUnconscious', v)} />
            </div>

            {/* Cthulhu Mythos */}
            <div>
              <label className="text-xs text-coc-text">克苏鲁神话: <span className="text-coc-accent font-bold">{inv.cthulhuMythos}</span></label>
              <input type="range" min={0} max={99} value={inv.cthulhuMythos}
                onChange={e => updateField('cthulhuMythos', Number(e.target.value))} className="w-full mt-1" />
            </div>
          </div>
        </div>

        {/* Right: Checks + Stats */}
        <div className="space-y-4">
          {/* Validation checks */}
          <div className="bg-coc-card rounded-xl p-4 border border-coc-border">
            <h3 className="text-sm font-semibold text-coc-text mb-3">📋 完整性检查</h3>
            <div className="space-y-1.5">
              {checks.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${c.pass ? 'text-coc-success' : c.required ? 'text-coc-danger' : 'text-coc-warning'}`}>
                  <span>{c.pass ? '✅' : c.required ? '❌' : '⚠️'}</span>
                  <span>{c.label}</span>
                  {!c.required && <span className="text-coc-muted text-xs opacity-60">(推荐)</span>}
                </div>
              ))}
            </div>
            <div className={`mt-3 text-xs font-bold ${requiredPass ? 'text-coc-success' : 'text-coc-danger'}`}>
              {requiredPass ? '✅ 所有必填项已完成，可以创建！' : '❌ 请完成所有必填项'}
            </div>
          </div>

          {/* Derived stats card */}
          <div className="bg-coc-card rounded-xl p-4 border border-coc-border">
            <h3 className="text-sm font-semibold text-coc-text mb-3">📊 调查员总览</h3>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <StatItem label="HP" value={derived.hpMax} />
              <StatItem label="SAN" value={derived.sanMax} />
              <StatItem label="MP" value={derived.mpMax} />
              <StatItem label="MOV" value={derived.mov} />
              <StatItem label="DB" value={derived.db} />
              <StatItem label="体格" value={derived.build} />
            </div>
          </div>

          {/* Attribute radar-like display */}
          <div className="bg-coc-card rounded-xl p-4 border border-coc-border">
            <h3 className="text-sm font-semibold text-coc-text mb-2">⚡ 属性概览</h3>
            <div className="space-y-1.5">
              {attrs.map(a => {
                const val = inv[a];
                const pct = ((val - 15) / 75) * 100;
                return (
                  <div key={a} className="flex items-center gap-2">
                    <span className="text-xs text-coc-muted w-10 text-right">{attrNames[a]}</span>
                    <div className="flex-1 h-2 bg-coc-bg rounded-full overflow-hidden">
                      <div className="h-full bg-coc-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-coc-text font-mono w-8">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleBadge({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-coc-accent/20 text-coc-accent border border-coc-accent/30' : 'bg-coc-bg text-coc-muted border border-coc-border'
      }`}
    >
      {active ? '☑' : '☐'} {label}
    </button>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-coc-text font-bold text-sm">{value}</div>
      <div className="text-coc-muted text-xs">{label}</div>
    </div>
  );
}
