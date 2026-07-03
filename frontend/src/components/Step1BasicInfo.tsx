import type { Investigator } from '@/types';
import { ERAS, getOccupationsByEra } from '@/data';

interface Step1Props {
  inv: Investigator;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
  setJobSkills: (skills: string[]) => void;
}

export default function Step1BasicInfo({ inv, updateField, setJobSkills }: Step1Props) {
  const occupations = getOccupationsByEra(inv.era);

  return (
    <div>
      <h2 className="text-base font-semibold text-coc-text tracking-tight mb-4">📋 调查员基本信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 姓名 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">
            姓名 <span className="text-coc-accent">*</span>
          </label>
          <input
            type="text"
            value={inv.name}
            onChange={e => updateField('name', e.target.value)}
            maxLength={32}
            placeholder="调查员姓名"
            className="md-field"
          />
        </div>

        {/* 玩家 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">
            玩家 <span className="text-coc-accent">*</span>
          </label>
          <input
            type="text"
            value={inv.player}
            onChange={e => updateField('player', e.target.value)}
            maxLength={32}
            placeholder="玩家昵称"
            className="md-field"
          />
        </div>

        {/* 时代 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">
            时代 <span className="text-coc-accent">*</span>
          </label>
          <select
            value={inv.era}
            onChange={e => updateField('era', e.target.value)}
            className="md-select"
          >
            {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* 职业 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">
            职业 <span className="text-coc-accent">*</span>
          </label>
          <select
            value={inv.occupationId}
            onChange={e => {
              const id = Number(e.target.value);
              updateField('occupationId', id);
              if (id === 0) {
                updateField('occupationName', '');
                setJobSkills([]);
              } else {
                const occ = occupations.find(o => o.id === id);
                updateField('occupationName', occ?.name || '');
                if (occ && occ.jobSkills.length > 0) {
                  setJobSkills(occ.jobSkills);
                } else {
                  setJobSkills([]);
                }
              }
            }}
            className="md-select"
          >
            <option value={0}>自定义职业</option>
            {occupations.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* 自定义职业名 */}
        {inv.occupationId <= 1 && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-coc-text/80 mb-1">自定义职业名</label>
            <input
              type="text"
              value={inv.occupationName}
              onChange={e => updateField('occupationName', e.target.value)}
              placeholder="输入职业名称"
              className="md-field"
            />
          </div>
        )}

        {/* 年龄 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">年龄</label>
          <input
            type="number"
            value={inv.age}
            onChange={e => updateField('age', Number(e.target.value))}
            min={15} max={89}
            className="md-field"
          />
          {inv.age >= 40 && (
            <div className="text-xs text-coc-warning mt-1 flex items-center gap-1">
              <span>⚠️</span>
              <span>年龄≥40：EDU -{Math.floor((inv.age - 40) / 10) + 1}×5，MOV -{inv.age >= 80 ? 5 : inv.age >= 70 ? 4 : inv.age >= 60 ? 3 : inv.age >= 50 ? 2 : 1}</span>
            </div>
          )}
        </div>

        {/* 性别 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">性别</label>
          <div className="flex gap-2">
            {['男', '女', '其他'].map(g => (
              <button
                key={g}
                onClick={() => updateField('gender', g)}
                className={`md-ripple px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  inv.gender === g
                    ? 'bg-coc-accent text-white shadow-sm'
                    : 'bg-coc-bg text-coc-text hover:bg-coc-border/40'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 住地 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">住地</label>
          <input
            type="text"
            value={inv.residence}
            onChange={e => updateField('residence', e.target.value)}
            placeholder="当前居住地"
            className="md-field"
          />
        </div>

        {/* 故乡 */}
        <div>
          <label className="block text-xs font-medium text-coc-text/80 mb-1">故乡</label>
          <input
            type="text"
            value={inv.birthplace}
            onChange={e => updateField('birthplace', e.target.value)}
            placeholder="出生地"
            className="md-field"
          />
        </div>


      </div>
    </div>
  );
}
