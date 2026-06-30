import type { Investigator } from '@/types';
import { OCCUPATIONS, EXPERIENCE_PACKS, getOccupationsByEra } from '@/data';
import { calcOccupationPoints, calcInterestPoints } from '@/utils/calculations';

interface Step3Props {
  inv: Investigator;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
  setJobSkills: (skills: string[]) => void;
}

export default function Step3Occupation({ inv, updateField, setJobSkills }: Step3Props) {
  const occupations = getOccupationsByEra(inv.era);
  const currentOcc = occupations.find(o => o.id === inv.occupationId);
  
  const occPts = calcOccupationPoints(inv.edu, currentOcc?.pointsFormula || '', inv.str, inv.dex, inv.app);
  const intPts = calcInterestPoints(inv.int);

  const handleOccupationChange = (id: number) => {
    const occ = occupations.find(o => o.id === id);
    updateField('occupationId', id);
    updateField('occupationName', occ?.name || '');
    if (occ && occ.jobSkills.length > 0) {
      setJobSkills(occ.jobSkills);
    } else {
      setJobSkills([]);
    }
    // Set credit rating default to middle of range
    if (occ) {
      const mid = Math.floor((occ.creditMin + occ.creditMax) / 2);
      updateField('creditRating', Math.max(occ.creditMin, Math.min(occ.creditMax, mid)));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-coc-gold mb-4">🎓 职业与点数系统</h2>

      {/* Occupation selection */}
      <div className="bg-coc-card rounded-xl p-5 border border-coc-border mb-4">
        <h3 className="text-sm font-semibold text-coc-text mb-3">职业选择</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <select
              value={inv.occupationId}
              onChange={e => handleOccupationChange(Number(e.target.value))}
              className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm focus:border-coc-accent outline-none"
            >
              <option value={0}>自定义职业</option>
              {occupations.map(o => (
                <option key={o.id} value={o.id}>{o.name} (cred: {o.creditMin}-{o.creditMax})</option>
              ))}
            </select>
          </div>

          {/* Credit rating */}
          <div>
            <label className="block text-xs text-coc-muted mb-1">
              信用评级: <span className="text-coc-accent font-bold">{inv.creditRating}%</span>
              {currentOcc && <span className="text-coc-muted ml-1">({currentOcc.creditMin}-{currentOcc.creditMax})</span>}
            </label>
            <input
              type="range"
              min={currentOcc?.creditMin || 0}
              max={currentOcc?.creditMax || 99}
              value={inv.creditRating}
              onChange={e => updateField('creditRating', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Occupation info */}
        {currentOcc && currentOcc.id > 1 && (
          <div className="mt-3 p-3 bg-coc-bg rounded-lg text-xs text-coc-muted">
            <p><span className="text-coc-text font-medium">点数公式:</span> {currentOcc.pointsFormula} = <span className="text-coc-accent">{occPts}</span> 点</p>
            <p className="mt-1"><span className="text-coc-text font-medium">本职技能 ({currentOcc.jobSkills.length}项):</span></p>
            <div className="flex flex-wrap gap-1 mt-1">
              {currentOcc.jobSkills.map(s => (
                <span key={s} className="px-2 py-0.5 bg-coc-accent/10 text-coc-accent rounded text-xs">{s}</span>
              ))}
            </div>
            {currentOcc.description && (
              <p className="mt-2 text-coc-muted leading-relaxed line-clamp-2">{currentOcc.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Points pools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <PointsCard label="职业点数池" value={occPts} formula={currentOcc?.pointsFormula || 'EDU×4'} color="text-blue-400" />
        <PointsCard label="兴趣点数池" value={intPts} formula="INT×2" color="text-green-400" />
        {inv.experiencePack && inv.experiencePack !== '无' && inv.experiencePack !== '自定义经历包' && (
          <PointsCard label="经历包点数池" value={EXPERIENCE_PACK_PTS[inv.experiencePack] || 0} formula={inv.experiencePack} color="text-purple-400" />
        )}
      </div>

      {/* Experience pack */}
      <div className="bg-coc-card rounded-xl p-5 border border-coc-border">
        <label className="block text-sm font-semibold text-coc-text mb-2">经历包（可选）</label>
        <select
          value={inv.experiencePack}
          onChange={e => updateField('experiencePack', e.target.value)}
          className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm focus:border-coc-accent outline-none"
        >
          <option value="">无</option>
          {EXPERIENCE_PACKS.filter(p => p.name !== '自定义经历包').map(p => (
            <option key={p.name} value={p.name}>{p.name} — {p.notes.slice(0, 60)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PointsCard({ label, value, formula, color }: { label: string; value: number; formula: string; color: string }) {
  return (
    <div className="bg-coc-card rounded-xl p-4 border border-coc-border text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-coc-muted mt-1">{label}</div>
      <div className="text-xs text-coc-muted mt-0.5 opacity-60">{formula}</div>
    </div>
  );
}

const EXPERIENCE_PACK_PTS: Record<string, number> = {
  '战场经历包': 70, '警务经历包': 60, '罪犯经历包': 60,
  '医务经历包': 60, '神话经历包': 0,
};
