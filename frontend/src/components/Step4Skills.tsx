import { useMemo, useState } from 'react';
import type { Investigator, SkillEntry, SkillCategory, SkillRule } from '@/types';
import { SKILL_BASE_VALUES, getOccupationsByEra } from '@/data';
import { resolveSkillBase, calcSkillSuccess, calcSkillLevels } from '@/utils/calculations';

interface Step4Props {
  inv: Investigator;
  updateSkill: (index: number, updates: Partial<SkillEntry>) => void;
  updateField: <K extends keyof Investigator>(field: K, value: Investigator[K]) => void;
  occupationPtsTotal: number;
  interestPtsTotal: number;
  experiencePtsTotal: number;
  toggleFlexibleSkill: (skillName: string, skillRules: SkillRule[]) => void;
}

const CATEGORIES: SkillCategory[] = ['调查', '交涉', '战斗', '特技', '学识'];

/** 分组筛选：从表格过滤列表和搜索 */
export default function Step4Skills({ inv, updateSkill, updateField, occupationPtsTotal, interestPtsTotal, experiencePtsTotal, toggleFlexibleSkill }: Step4Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<SkillCategory | '全部'>('全部');

  const attr = { dex: inv.dex, edu: inv.edu, pow: inv.pow };
  const jobSkills = inv.occupationJobSkills || [];
  const flexSkills = inv.flexibleOccupationSkills || [];

  const occupations = getOccupationsByEra(inv.era);
  const currentOcc = occupations.find(o => o.id === inv.occupationId);
  const skillRules: SkillRule[] = currentOcc?.skillRules || [];

  const creditPts = inv.creditRating;
  const skillsOccupationUsed = inv.skills.filter(sk => sk.name !== '信用评级').reduce((s, sk) => s + sk.occupationPts, 0);
  const occupationUsed = skillsOccupationUsed + creditPts;
  const interestUsed = inv.skills.filter(sk => sk.name !== '信用评级').reduce((s, sk) => s + sk.interestPts, 0);
  const experienceUsed = inv.skills.filter(sk => sk.name !== '信用评级').reduce((s, sk) => s + sk.experiencePts, 0);

  const occRemaining = occupationPtsTotal - occupationUsed;
  const intRemaining = interestPtsTotal - interestUsed;
  const expRemaining = experiencePtsTotal - experienceUsed;
  const allPerfect = occRemaining === 0 && intRemaining === 0 && (experiencePtsTotal === 0 || expRemaining === 0);

  // ===== 计算每个技能的"职业状态" =====
  function getSkillOccupationState(name: string): 'fixed' | 'flex_selected' | 'flex_available' | 'none' {
    if (jobSkills.includes(name)) return 'fixed';
    if (flexSkills.includes(name)) return 'flex_selected';

    // 检查是否属于某个 choose_or_list 规则（且该规则还有空位）
    for (const rule of skillRules) {
      if (rule.type === 'choose_or_list' && rule.skills?.includes(name)) {
        const selectedInList = flexSkills.filter(n => rule.skills!.includes(n));
        if (selectedInList.length < rule.count) {
          return 'flex_available';
        }
      }
    }

    // 检查 choose_any 规则
    const anyRule = skillRules.filter(r => r.type === 'choose_any');
    if (anyRule.length > 0) {
      // choose_any 可选的技能：不属于任何列表、不在 jobSkills
      const inSomeList = skillRules.some(
        r => r.type === 'choose_or_list' && r.skills?.includes(name)
      );
      if (!inSomeList) {
        const anyRuleTotalCount = anyRule.reduce((s, r) => s + r.count, 0);
        const anyRuleSelected = flexSkills.filter(n => {
          const inList = skillRules.some(
            r => r.type === 'choose_or_list' && r.skills?.includes(n)
          );
          return !inList;
        });
        if (anyRuleSelected.length < anyRuleTotalCount) {
          return 'flex_available';
        }
      }
    }

    return 'none';
  }

  // ===== 计算分组计数器 =====
  const ruleCounters = useMemo(() => {
    const counters: Array<{
      ruleIndex: number;
      label: string;
      selected: string[];
      count: number;
    }> = [];

    skillRules.forEach((rule, idx) => {
      if (rule.type === 'choose_or_list' && rule.skills) {
        const selected = flexSkills.filter(n => rule.skills!.includes(n));
        counters.push({
          ruleIndex: idx,
          label: rule.label,
          selected,
          count: rule.count,
        });
      }
    });

    // choose_any 合并在一起
    const anyRules = skillRules.filter(r => r.type === 'choose_any');
    if (anyRules.length > 0) {
      const totalCount = anyRules.reduce((s, r) => s + r.count, 0);
      const selected = flexSkills.filter(n => {
        const inList = skillRules.some(
          r => r.type === 'choose_or_list' && r.skills?.includes(n)
        );
        return !inList;
      });
      const labels = anyRules.map(r => r.label).join('、');
      counters.push({
        ruleIndex: -1,
        label: labels || '其他特长',
        selected,
        count: totalCount,
      });
    }

    return counters;
  }, [skillRules, flexSkills]);

  const filteredSkills = useMemo(() => {
    return inv.skills.filter(s => {
      if (s.name === '信用评级') return false;
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

  function handleToggleFlex(skillName: string) {
    const state = getSkillOccupationState(skillName);
    if (state === 'fixed' || state === 'none') return;
    toggleFlexibleSkill(skillName, skillRules);
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-coc-text tracking-tight mb-4">📊 技能分配</h2>

      {/* Credit Rating — uses occupation points pool */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-coc-border/30 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-medium text-coc-text">💰 信用评级</span>
            <span className="text-coc-accent font-semibold ml-2">{creditPts}%</span>
            {currentOcc && <span className="text-coc-muted/50 text-xs ml-1">（范围 {currentOcc.creditMin}-{currentOcc.creditMax}）</span>}
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
            style={{
              background: `linear-gradient(to right, #1A73E84D 0%, #1A73E84D ${((creditPts - (currentOcc?.creditMin || 0)) / ((currentOcc?.creditMax || 99) - (currentOcc?.creditMin || 0))) * 100}%, #DADCE0 ${((creditPts - (currentOcc?.creditMin || 0)) / ((currentOcc?.creditMax || 99) - (currentOcc?.creditMin || 0))) * 100}%, #DADCE0 100%)`,
            }}
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
            className="w-16 text-center bg-coc-bg rounded text-coc-text text-sm p-1 outline-none"
          />
        </div>
      </div>

      {/* ===== 计数器条已合并到下方 sticky footer 中 ===== */}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 搜索技能..."
          className="md-field w-44"
        />
        <div className="flex flex-wrap gap-1">
          {['全部' as const, ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`md-ripple px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                filterCat === cat ? 'bg-coc-accent text-white shadow-sm' : 'bg-coc-bg text-coc-muted hover:text-coc-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills table */}
      <div className="overflow-x-auto rounded-xl border border-coc-border/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-coc-bg text-coc-muted/70 text-[11px]">
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
              const occState = getSkillOccupationState(sk.name);

              const occupIcon = (() => {
                switch (occState) {
                  case 'fixed':
                    return <span className="text-coc-border text-base select-none" title="固定本职技能">☑</span>;
                  case 'flex_selected':
                    return (
                      <span
                        className="text-coc-accent text-base cursor-pointer hover:opacity-70 select-none"
                        title="点击取消选择"
                        onClick={() => handleToggleFlex(sk.name)}
                      >☑</span>
                    );
                  case 'flex_available':
                    return (
                      <span
                        className="text-coc-accent/60 text-base cursor-pointer hover:text-coc-accent select-none"
                        title="点击选为本职技能"
                        onClick={() => handleToggleFlex(sk.name)}
                      >☐</span>
                    );
                  case 'none':
                  default:
                    return <span className="text-coc-border/40 text-base select-none" title="不可选">✕</span>;
                }
              })();

              return (
                <tr key={sk.name} className="border-t border-coc-border/20 hover:bg-coc-accent/[0.02] transition-colors">
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex items-center justify-center h-7">
                        {occupIcon}
                      </div>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-coc-text text-xs">{sk.name}</span>
                      {info && <span className="text-xs text-coc-muted/40 ml-1">{info.category}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-center text-coc-muted/60 font-mono text-xs">{base}%</td>
                    <td className="py-1.5 px-1 text-center">
                      {hasExp ? (
                        <input type="number" min={0} value={sk.experiencePts || ''} onChange={e => {
                          const v = parseInt(e.target.value) || 0;
                          updateSkill(realIdx, { experiencePts: Math.max(0, v) });
                        }}
                        className="w-12 text-center bg-coc-bg rounded text-xs py-0.5 text-coc-text outline-none"
                        />
                      ) : (
                        <span className="text-coc-border/50 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      {(occState === 'fixed' || occState === 'flex_selected') ? (
                        <input type="number" min={0} value={sk.occupationPts || ''} onChange={e => {
                          const v = parseInt(e.target.value) || 0;
                          updateSkill(realIdx, { occupationPts: Math.max(0, v) });
                        }}
                        className="w-12 text-center bg-coc-bg rounded text-xs py-0.5 text-coc-text outline-none"
                        />
                      ) : (
                        <span className="text-coc-border/50 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <input type="number" min={0} value={sk.interestPts || ''} onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        updateSkill(realIdx, { interestPts: Math.max(0, v) });
                      }}
                      className="w-12 text-center bg-coc-bg rounded text-xs py-0.5 text-coc-text outline-none"
                      />
                    </td>
                    <td className={`py-1.5 px-2 text-center font-semibold font-mono text-xs ${success > 90 ? 'text-coc-warning' : 'text-coc-accent'}`}>
                      {success}%
                    </td>
                    <td className="py-1.5 px-2 text-center text-coc-muted/50 font-mono text-xs">{levels.hard}%</td>
                    <td className="py-1.5 px-2 text-center text-coc-muted/50 font-mono text-xs">{levels.extreme}%</td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky footer - counters + points summary */}
      <div className="sticky bottom-0 mt-3 bg-white/95 backdrop-blur rounded-xl shadow-sm border border-coc-border/30 p-3">
        {/* ── 可选的职业技能（合并到 sticky footer） ── */}
        {skillRules.length > 0 && ruleCounters.length > 0 && (
          <div className="mb-2 pb-2 border-b border-coc-border/20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-coc-accent">📋 可选的职业技能</span>
              <span className="text-[9px] text-coc-accent/50">点击蓝色复选框勾选为本职技能</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ruleCounters.map((rc, i) => {
                const remaining = rc.count - rc.selected.length;
                const isFull = remaining <= 0;
                // 判断是否为社交技能规则
                let isSocialRule = false;
                if (rc.ruleIndex >= 0) {
                  const rule = skillRules[rc.ruleIndex];
                  const SOCIAL = ['取悦', '话术', '恐吓', '说服'];
                  isSocialRule = rule.type === 'choose_or_list' &&
                    rule.skills?.length === 4 &&
                    rule.skills.every(s => SOCIAL.includes(s));
                }
                return (
                  <div key={i} className="flex items-center gap-1 text-[10px] bg-coc-accent/[0.04] rounded-lg px-2 py-1 border border-coc-accent/15">
                    <span className="font-medium text-coc-text whitespace-nowrap">{rc.label}</span>
                    <span className="text-coc-muted/50 mx-0.5">·</span>
                    {rc.selected.length > 0 ? (
                      <span className="text-coc-accent truncate max-w-[100px]">{rc.selected.join('、')}</span>
                    ) : (
                      <span className="text-coc-border/50">（空）</span>
                    )}
                    <span className="text-coc-muted/50 mx-0.5">→</span>
                    <span className={isFull ? 'text-coc-success font-semibold' : 'text-coc-warning font-semibold'}>
                      {isFull ? '已满 ✅' : `${isSocialRule ? '社交技能' : ''}还可选 ${remaining} 项`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── 点数统计 ── */}
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
          {allPerfect && <span className="text-coc-success font-semibold text-xs">✅ 点数已完美分配！</span>}
          <button onClick={clearAllPts} className="md-ripple ml-auto px-3 py-1 rounded-lg bg-coc-danger/10 text-coc-danger hover:bg-coc-danger/20 text-xs font-medium">清空所有分配</button>
        </div>
      </div>
    </div>
  );
}
