import type { Investigator } from '@/types';
import { INSANITY_DATA } from '@/data';

interface Step6Props {
  inv: Investigator;
  updateField: <K extends keyof Investigator>(f: K, v: Investigator[K]) => void;
  addInsanity: () => void;
  updateInsanity: (i: number, u: Record<string, unknown>) => void;
  removeInsanity: (i: number) => void;
}

export default function Step6Narrative({
  inv, updateField,
  addInsanity, updateInsanity, removeInsanity,
}: Step6Props) {
  return (
    <div>
      <h2 className="text-base font-semibold text-coc-text tracking-tight mb-4">📖 叙事元素</h2>

      <div className="space-y-4">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-coc-text">📖 背景故事</h3>
            <button onClick={addInsanity} className="md-ripple text-xs px-2 py-1 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 font-medium">＋ 疯狂</button>
          </div>
          <textarea value={inv.backstory} onChange={e => updateField('backstory', e.target.value)}
            rows={8} placeholder="调查员的个人背景故事..."
            className="md-textarea" />
        </section>

        <NarrativeField label="👤 外貌描述" value={inv.appearance} onChange={v => updateField('appearance', v)} />
        <NarrativeField label="💭 思想/信念" value={inv.ideology} onChange={v => updateField('ideology', v)} />
        <NarrativeField label="❤️ 重要之人" value={inv.importantPerson} onChange={v => updateField('importantPerson', v)} />
        <NarrativeField label="📍 意义非凡之地" value={inv.meaningfulPlace} onChange={v => updateField('meaningfulPlace', v)} />
        <NarrativeField label="💎 宝贵之物" value={inv.valuableThing} onChange={v => updateField('valuableThing', v)} />
        <NarrativeField label="🦸 特质" value={inv.traits} onChange={v => updateField('traits', v)} />
        <NarrativeField label="🩹 伤口与疤痕" value={inv.injuries} onChange={v => updateField('injuries', v)} />

        {/* Insanity entries */}
        {inv.insanity.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-coc-text mb-2">😨 疯狂/恐惧/躁狂</h3>
            <div className="space-y-2">
              {inv.insanity.map((ins, i) => (
                <div key={i} className="flex items-center gap-2 bg-coc-bg/50 rounded-lg p-2 border border-coc-border/20">
                  <select value={ins.type} onChange={e => updateInsanity(i, { type: e.target.value as 'phobia' | 'mania' })}
                    className="bg-coc-bg rounded text-coc-text text-xs px-2 py-1 outline-none">
                    <option value="phobia">恐惧症</option>
                    <option value="mania">躁狂症</option>
                  </select>
                  <select value={ins.name} onChange={e => {
                    const list = ins.type === 'phobia' ? INSANITY_DATA.fears : INSANITY_DATA.manias;
                    const item = list.find(it => it.name === e.target.value);
                    updateInsanity(i, item ? { ...item } : { name: e.target.value });
                  }} className="flex-1 bg-coc-bg rounded text-coc-text text-xs px-2 py-1 outline-none">
                    <option value="">选择...</option>
                    {(ins.type === 'phobia' ? INSANITY_DATA.fears : INSANITY_DATA.manias).map(it => (
                      <option key={it.name} value={it.name}>{it.name}</option>
                    ))}
                  </select>
                  <button onClick={() => removeInsanity(i)} className="text-coc-danger text-xs">✕</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function NarrativeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-coc-text/80 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        rows={5} className="md-textarea" />
    </div>
  );
}
