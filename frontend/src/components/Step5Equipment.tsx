import type { Investigator } from '@/types';
import { WEAPONS, ARMORS } from '@/data';

interface Step5Props {
  inv: Investigator;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
  updateWeapon: (i: number, u: Record<string, unknown>) => void;
  addWeapon: () => void;
  removeWeapon: (i: number) => void;
  updateArmor: (i: number, u: Record<string, unknown>) => void;
  addArmor: () => void;
  removeArmor: (i: number) => void;
  updateSpell: (i: number, u: Record<string, unknown>) => void;
  addSpell: () => void;
  removeSpell: (i: number) => void;
  updateCompanion: (i: number, u: Record<string, unknown>) => void;
  addCompanion: () => void;
}

export default function Step5Equipment({
  inv, updateField,
  updateWeapon, addWeapon, removeWeapon,
  updateArmor, addArmor, removeArmor,
  updateSpell, addSpell, removeSpell,
  updateCompanion, addCompanion,
}: Step5Props) {
  return (
    <div>
      <h2 className="text-base font-semibold text-coc-text tracking-tight mb-4">🛠️ 装备</h2>

      <div className="space-y-6">
        {/* Weapons */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coc-text">⚔️ 武器表</h3>
            <button onClick={addWeapon} className="md-ripple text-xs px-2 py-1 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 font-medium">＋ 添加</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-coc-border/30">
            <table className="w-full text-xs">
              <thead><tr className="bg-coc-bg text-coc-muted/70">
                <th className="p-1.5 text-left font-medium">名称</th><th className="p-1.5 text-left font-medium">技能</th><th className="p-1.5 font-medium">伤害</th>
                <th className="p-1.5 font-medium">射程</th><th className="p-1.5 font-medium">时代</th><th className="p-1.5 font-medium">弹药</th>
                <th className="p-1.5 font-medium">故障</th><th className="p-1.5"></th>
              </tr></thead>
              <tbody>
                {inv.weapons.map((w, i) => (
                  <tr key={i} className="border-t border-coc-border/20">
                    <td className="p-1">
                      <select value={w.name} onChange={e => {
                        const weapon = WEAPONS.find(wp => wp.name === e.target.value);
                        if (weapon) {
                          updateWeapon(i, { ...weapon });
                        } else {
                          updateWeapon(i, { name: e.target.value });
                        }
                      }} className="w-full bg-coc-bg rounded text-coc-text text-xs p-0.5 outline-none">
                        <option value="">自定义</option>
                        {WEAPONS.slice(0, 50).map(wp => (
                          <option key={wp.name} value={wp.name}>{wp.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1"><input type="text" value={w.skill} onChange={e => updateWeapon(i, { skill: e.target.value })} className="w-full bg-coc-bg rounded text-coc-text text-xs p-0.5 outline-none" /></td>
                    <td className="p-1"><input type="text" value={w.damage} onChange={e => updateWeapon(i, { damage: e.target.value })} className="w-16 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1"><input type="text" value={w.range} onChange={e => updateWeapon(i, { range: e.target.value })} className="w-14 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1"><input type="text" value={w.era} onChange={e => updateWeapon(i, { era: e.target.value })} className="w-16 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1"><input type="text" value={w.ammo} onChange={e => updateWeapon(i, { ammo: e.target.value })} className="w-10 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1"><input type="text" value={w.malfunction} onChange={e => updateWeapon(i, { malfunction: e.target.value })} className="w-10 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1"><button onClick={() => removeWeapon(i)} className="text-coc-danger hover:text-red-400 text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Armors */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coc-text">🛡️ 护甲</h3>
            <button onClick={addArmor} className="md-ripple text-xs px-2 py-1 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 font-medium">＋ 添加</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-coc-border/30">
            <table className="w-full text-xs">
              <thead><tr className="bg-coc-bg text-coc-muted/70">
                <th className="p-1.5 text-left font-medium">名称</th><th className="p-1.5 font-medium">护甲值</th><th className="p-1.5 font-medium">启用</th><th className="p-1.5"></th>
              </tr></thead>
              <tbody>
                {inv.armors.map((a, i) => (
                  <tr key={i} className="border-t border-coc-border/20">
                    <td className="p-1">
                      <select value={a.name} onChange={e => {
                        const armor = ARMORS.find(ar => ar.name === e.target.value);
                        if (armor) updateArmor(i, { name: armor.name, armorValue: parseInt(armor.armorValue) || 0 });
                        else updateArmor(i, { name: e.target.value });
                      }} className="w-full bg-coc-bg rounded text-coc-text text-xs p-0.5 outline-none">
                        <option value="">自定义</option>
                        {ARMORS.map(ar => <option key={ar.name} value={ar.name}>{ar.name}</option>)}
                      </select>
                    </td>
                    <td className="p-1"><input type="number" value={a.armorValue} onChange={e => updateArmor(i, { armorValue: Number(e.target.value) })} className="w-12 bg-coc-bg rounded text-coc-text text-xs p-0.5 text-center outline-none" /></td>
                    <td className="p-1 text-center">
                      <button onClick={() => updateArmor(i, { isEnabled: !a.isEnabled })} className={a.isEnabled ? 'text-coc-success' : 'text-coc-muted/40'}>{a.isEnabled ? '●' : '○'}</button>
                    </td>
                    <td className="p-1"><button onClick={() => removeArmor(i)} className="text-coc-danger text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Spells */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coc-text">✨ 法术</h3>
            <button onClick={addSpell} className="md-ripple text-xs px-2 py-1 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 font-medium">＋ 添加</button>
          </div>
          <div className="space-y-2">
            {inv.spells.map((sp, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 bg-coc-bg/50 rounded-lg p-2 border border-coc-border/20">
                <input type="text" value={sp.name} onChange={e => updateSpell(i, { name: e.target.value })} placeholder="法术名" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={sp.cost} onChange={e => updateSpell(i, { cost: e.target.value })} placeholder="代价" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={sp.castingTime} onChange={e => updateSpell(i, { castingTime: e.target.value })} placeholder="施法时间" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={sp.effect} onChange={e => updateSpell(i, { effect: e.target.value })} placeholder="效果" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <div className="flex items-center justify-center">
                  <button onClick={() => removeSpell(i)} className="text-coc-danger text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Companions */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coc-text">👥 伙伴/关系</h3>
            <button onClick={addCompanion} className="md-ripple text-xs px-2 py-1 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 font-medium">＋ 添加</button>
          </div>
          <div className="space-y-2">
            {inv.companions.map((c, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 bg-coc-bg/50 rounded-lg p-2 border border-coc-border/20">
                <input type="text" value={c.name} onChange={e => updateCompanion(i, { name: e.target.value })} placeholder="姓名" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={c.player} onChange={e => updateCompanion(i, { player: e.target.value })} placeholder="玩家" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={c.notes} onChange={e => updateCompanion(i, { notes: e.target.value })} placeholder="注释" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
                <input type="text" value={c.scenario} onChange={e => updateCompanion(i, { scenario: e.target.value })} placeholder="相遇模组" className="bg-coc-bg rounded text-coc-text text-xs p-1 outline-none" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
