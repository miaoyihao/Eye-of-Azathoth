import { useMemo, useState } from 'react';
import type { Investigator, SkillEntry, SkillCategory } from '@/types';
import { SKILL_BASE_VALUES, getOccupationsByEra } from '@/data';
import { resolveSkillBase, calcSkillSuccess, calcSkillLevels } from '@/utils/calculations';

interface Step4Props {
  inv: Investigator;
  updateSkill: (index: number, updates: Partial<SkillEntry>) => void;
  updateField: <K extends keyof Investigator>(field: K, value: Investigator[K]) => void;
  occupationPtsTotal: number;
  interestPtsTotal: number;
  experiencePtsTotal: number;
}

const CATEGORIES: SkillCategory[] = ['调查', '交涉', '战斗', '特技', '学识'];

export default function Step4Skills({ inv, updateSkill, updateField, occupationPtsTotal, interestPtsTotal, experiencePtsTotal }: Step4Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<SkillCategory | '全部'>('全部');

  const attr = { dex: inv.dex, edu: inv.edu, pow: inv.pow };

  const occupations = getOccupationsByEra(inv.era);
  const currentOcc = occupations.find(o => o.id === inv.occupationId);

  const creditPts = inv.creditRating;
  const skillsOccupationUsed = inv.skills.reduce((s, sk) => s + sk.occupationPts, 0);
  const occupationUsed = skillsOccupationUsed + creditPts;
  const interestUsed = inv.skills.reduce((s, sk) => s + sk.interestPts, 0);
  const experienceUsed = inv.skills.reduce((s, sk) => s + sk.experiencePts, 0);

  const occRemaining = occupationPtsTotal - occupationUsed;
  const intRemaining = interestPtsTotal - interestUsed;
  const expRemaining = experiencePtsTotal - experienceUsed;
  const allPerfect = occRemaining === 0 && intRemaining === 0 && (experiencePtsTotal === 0 || expRemaining === 0);

  const filteredSkills = useMemo(() => {
    return inv.skills.filter(s => {
      const info = SKILL_BASE_VALUES[s.name];
      if (!info) return false;
      if (search && !s.name.includes(search)) return false;
      if (filterCat !== '全部' && info.category !== filterCat) return false;
      return true;
    });
  }, [inv.skills, search, filterCat]);

  function clearAllPts() {
    inv.skills.forEach((_, i) => updateSkill(i, { occupationPts: 0, interestPts: 0, experiencePts: 0 }));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-coc-gold mb-4">📊 技能分配</h2>

      {/* Credit Rating — uses occupation points pool */}
      <div className="bg-coc-card rounded-xl p-4 border border-coc-border mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-semibold text-coc-text">💰 信用评级</span>
            <span className="text-coc-accent font-bold ml-2">{creditPts}%</span>
            {currentOcc && <span className="text-coc-muted text-xs ml-1">（范围 {currentOcc.creditMin}-{currentOcc.creditMax}）</span>}
          </div>
          <span className="text-xs text-coc-warning">占用 {creditPts} 职业点</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={currentOcc?.creditMin || 0}
            max={currentOcc?.creditMax || 99}
            value={creditPts}
            onChange={e => updateField('creditRating', Number(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            value={creditPts}
            min={currentOcc?.creditMin || 0}
            max={currentOcc?.creditMax || 99}
            onChange={e => {
              const raw = Number(e.target.value);
              const clamped = Math.min(Math.max(raw, currentOcc?.creditMin || 0), currentOcc?.creditMax || 99);
              updateField('creditRating', clamped);
            }}
            className="w-16 text-center bg-coc-bg border border-coc-border rounded text-coc-text text-sm p-1 focus:border-coc-accent outline-none"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 搜索技能..."
          className="px-3 py-1.5 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm w-40 focus:border-coc-accent outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {['全部' as const, ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                filterCat === cat ? 'bg-coc-accent text-white' : 'bg-coc-bg border border-coc-border text-coc-muted hover:text-coc-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills table */}
      <div className="overflow-x-auto rounded-xl border border-coc-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-coc-bg text-coc-muted text-xs">
              <th className="py-2 px-3 text-left font-medium">本职</th>
              <th className="py-2 px-3 text-left font-medium">技能名</th>
              <th className="py-2 px-2 text-center font-medium w-14">基础值</th>
              <th className="py-2 px-2 text-center font-medium w-16">经历包</th>
              <th className="py-2 px-2 text-center font-medium w-16">职业</th>
              <th className="py-2 px-2 text-center font-medium w-16">兴趣</th>
              <th className="py-2 px-2 text-center font-medium w-16">成功率</th>
              <th className="py-2 px-2 text-center font-medium w-12">困难</th>
              <th className="py-2 px-2 text-center font-medium w-12">极难</th>
            </tr>
          </thead>
          <tbody>
            {filteredSkills.map((sk, idx) => {
              const realIdx = inv.skills.findIndex(s => s.name === sk.name);
              const base = resolveSkillBase(sk.name, attr);
              const success = calcSkillSuccess(sk, attr);
              const levels = calcSkillLevels(success);
              const info = SKILL_BASE_VALUES[sk.name];
              const hasExp = inv.experiencePack && inv.experiencePack !== '无' && inv.experiencePack !== '自定义经历包';

              return (
                <tr key={sk.name} className="border-t border-coc-border/50 hover:bg-coc-card/50 transition-colors">
                  <td className="py-1.5 px-3 text-center">
                    {sk.isOccupation ? '✅' : (
                      <svg className="w-3.5 h-3.5 text-coc-muted/50 inline-block align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    <span className="text-coc-text text-xs">{sk.name}</span>
                    {info && <span className="text-xs text-coc-muted ml-1 opacity-50">{info.category}</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center text-coc-muted font-mono text-xs">{base}%</td>
                  <td className="py-1.5 px-1 text-center">
                    {hasExp ? (
                      <input type="number" min={0} value={sk.experiencePts || ''} onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        updateSkill(realIdx, { experiencePts: Math.max(0, v) });
                      }}
                      className="w-12 text-center bg-coc-bg border border-coc-border rounded text-xs py-0.5 text-coc-text focus:border-coc-accent outline-none"
                      />
                    ) : (
                      <span className="text-coc-border text-xs">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {sk.isOccupation ? (
                      <input type="number" min={0} value={sk.occupationPts || ''} onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        updateSkill(realIdx, { occupationPts: Math.max(0, v) });
                      }}
                      className="w-12 text-center bg-coc-bg border border-coc-border rounded text-xs py-0.5 text-coc-text focus:border-coc-accent outline-none"
                      />
                    ) : (
                      <span className="text-coc-border text-xs">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    <input type="number" min={0} value={sk.interestPts || ''} onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateSkill(realIdx, { interestPts: Math.max(0, v) });
                    }}
                    className="w-12 text-center bg-coc-bg border border-coc-border rounded text-xs py-0.5 text-coc-text focus:border-coc-accent outline-none"
                    />
                  </td>
                  <td className={`py-1.5 px-2 text-center font-bold font-mono text-xs ${success > 90 ? 'text-coc-warning' : 'text-coc-accent'}`}>
                    {success}%
                  </td>
                  <td className="py-1.5 px-2 text-center text-coc-muted font-mono text-xs">{levels.hard}%</td>
                  <td className="py-1.5 px-2 text-center text-coc-muted font-mono text-xs">{levels.extreme}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky footer - points summary */}
      <div className="sticky bottom-0 mt-3 bg-coc-card/95 backdrop-blur rounded-xl border border-coc-border p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {experiencePtsTotal > 0 && (
            <div className={`${expRemaining === 0 ? 'text-coc-success' : 'text-coc-warning'}`}>
              经历包: {experienceUsed}/{experiencePtsTotal} {expRemaining === 0 ? '✅' : `剩余${expRemaining}`}
            </div>
          )}
          <div className={`${occRemaining === 0 ? 'text-coc-success' : 'text-coc-warning'}`}>
            职业点: {occupationUsed}/{occupationPtsTotal}（含信用评级 {creditPts}）{occRemaining === 0 ? '✅' : `剩余${occRemaining}`}
          </div>
          <div className={`${intRemaining === 0 ? 'text-coc-success' : 'text-coc-warning'}`}>
            兴趣点: {interestUsed}/{interestPtsTotal} {intRemaining === 0 ? '✅' : `剩余${intRemaining}`}
          </div>
          {allPerfect && <span className="text-coc-success font-bold">✅ 点数已完美分配！</span>}
          <button onClick={clearAllPts} className="ml-auto px-3 py-1 rounded-lg bg-coc-danger/20 text-coc-danger hover:bg-coc-danger/30 text-xs">清空所有分配</button>
        </div>
      </div>
    </div>
  );
}
