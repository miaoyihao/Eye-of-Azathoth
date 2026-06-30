import type { Investigator } from '@/types';
import { ERAS, getOccupationsByEra } from '@/data';

interface Step1Props {
  inv: Investigator;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
}

export default function Step1BasicInfo({ inv, updateField }: Step1Props) {
  const occupations = getOccupationsByEra(inv.era);

  return (
    <div>
      <h2 className="text-lg font-semibold text-coc-gold mb-4">📋 调查员基本信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 姓名 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">
            姓名 <span className="text-coc-accent">*</span>
          </label>
          <input
            type="text"
            value={inv.name}
            onChange={e => updateField('name', e.target.value)}
            maxLength={32}
            placeholder="调查员姓名"
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text placeholder-coc-muted focus:border-coc-accent outline-none text-sm"
          />
        </div>

        {/* 玩家 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">
            玩家 <span className="text-coc-accent">*</span>
          </label>
          <input
            type="text"
            value={inv.player}
            onChange={e => updateField('player', e.target.value)}
            maxLength={32}
            placeholder="玩家昵称"
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text placeholder-coc-muted focus:border-coc-accent outline-none text-sm"
          />
        </div>

        {/* 时代 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">
            时代 <span className="text-coc-accent">*</span>
          </label>
          <select
            value={inv.era}
            onChange={e => updateField('era', e.target.value)}
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text focus:border-coc-accent outline-none text-sm"
          >
            {ERAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* 职业 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">
            职业 <span className="text-coc-accent">*</span>
          </label>
          <select
            value={inv.occupationId}
            onChange={e => {
              const id = Number(e.target.value);
              updateField('occupationId', id);
              if (id === 0) updateField('occupationName', '');
              else {
                const occ = occupations.find(o => o.id === id);
                updateField('occupationName', occ?.name || '');
              }
            }}
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text focus:border-coc-accent outline-none text-sm"
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
            <label className="block text-sm font-medium text-coc-text mb-1">自定义职业名</label>
            <input
              type="text"
              value={inv.occupationName}
              onChange={e => updateField('occupationName', e.target.value)}
              placeholder="输入职业名称"
              className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text placeholder-coc-muted focus:border-coc-accent outline-none text-sm"
            />
          </div>
        )}

        {/* 年龄 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">年龄</label>
          <input
            type="number"
            value={inv.age}
            onChange={e => updateField('age', Number(e.target.value))}
            min={15} max={89}
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text focus:border-coc-accent outline-none text-sm"
          />
          {inv.age >= 40 && (
            <div className="text-xs text-coc-warning mt-1">
              ⚠️ 年龄≥40：EDU -{Math.floor((inv.age - 40) / 10) + 1}×5，MOV -
              {inv.age >= 80 ? 5 : inv.age >= 70 ? 4 : inv.age >= 60 ? 3 : inv.age >= 50 ? 2 : 1}
            </div>
          )}
        </div>

        {/* 性别 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">性别</label>
          <div className="flex gap-2">
            {['男', '女', '其他'].map(g => (
              <button
                key={g}
                onClick={() => updateField('gender', g)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  inv.gender === g
                    ? 'bg-coc-accent text-white'
                    : 'bg-coc-bg border border-coc-border text-coc-text hover:border-coc-accent/50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 住地 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">住地</label>
          <input
            type="text"
            value={inv.residence}
            onChange={e => updateField('residence', e.target.value)}
            placeholder="当前居住地"
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text placeholder-coc-muted focus:border-coc-accent outline-none text-sm"
          />
        </div>

        {/* 故乡 */}
        <div>
          <label className="block text-sm font-medium text-coc-text mb-1">故乡</label>
          <input
            type="text"
            value={inv.birthplace}
            onChange={e => updateField('birthplace', e.target.value)}
            placeholder="出生地"
            className="w-full px-3 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text placeholder-coc-muted focus:border-coc-accent outline-none text-sm"
          />
        </div>

        {/* 时间设定 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-coc-text mb-1">时间设定</label>
          <div className="flex items-center gap-2">
            <input type="number" value={inv.scenarioYear} onChange={e => updateField('scenarioYear', Number(e.target.value))}
              className="w-20 px-2 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm text-center" />
            <span className="text-coc-muted text-sm">年</span>
            <input type="number" value={inv.scenarioMonth} onChange={e => updateField('scenarioMonth', Number(e.target.value))} min={1} max={12}
              className="w-16 px-2 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm text-center" />
            <span className="text-coc-muted text-sm">月</span>
            <input type="number" value={inv.scenarioDay} onChange={e => updateField('scenarioDay', Number(e.target.value))} min={1} max={31}
              className="w-16 px-2 py-2 bg-coc-bg border border-coc-border rounded-lg text-coc-text text-sm text-center" />
            <span className="text-coc-muted text-sm">日</span>
          </div>
        </div>
      </div>
    </div>
  );
}
