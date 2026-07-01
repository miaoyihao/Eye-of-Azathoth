import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCharacterMetas, deleteCharacter, loadCharacter, saveCharacter } from '@/services/storage';
import { exportCharacterToExcel } from '@/services/exportExcel';
import { exportCharacterToPdf } from '@/services/exportPdf';
import { importCharacterFromExcel } from '@/services/importExcel';
import type { SavedCharacterMeta } from '@/services/storage';
import type { Investigator } from '@/types';

// ── 骰娘别名映射 ──
// 同一技能在骰娘中支持多个名称（中文名、缩写、变体）
const SKILL_ALIASES: Record<string, string[]> = {
  '取悦': ['取悦', '魅惑'],
  '计算机使用 Ω': ['计算机', '计算机使用', '电脑'],
  '汽车驾驶': ['汽车', '驾驶', '汽车驾驶'],
  '图书馆使用': ['图书馆', '图书馆使用'],
  '锁匠': ['开锁', '撬锁', '锁匠'],
  '博物学': ['博物学', '自然学'],
  '导航': ['领航', '导航'],
  '操作重型机械': ['重型操作', '重型机械', '操作重型机械', '重型'],
  '格斗：': ['斗殴', '格斗'],
  '射击：': ['射击'],
  '驾驶：': ['驾驶'],
  '生存：': ['生存'],
  '科学①': ['科学'],
  '科学②': ['科学'],
  '科学③': ['科学'],
};

/** 解析技能基础值，支持数字或公式如 DEX/2、1/2DEX */
function parseSkillBase(baseValue: string, inv: Investigator): number {
  const n = Number(baseValue);
  if (!isNaN(n)) return n;
  const attrMap: Record<string, number> = {
    STR: inv.str, DEX: inv.dex, POW: inv.pow, CON: inv.con,
    APP: inv.app, EDU: inv.edu, SIZ: inv.siz, INT: inv.int, LUCK: inv.luck,
  };
  let expr = baseValue.toUpperCase();
  for (const [k, v] of Object.entries(attrMap)) expr = expr.replace(new RegExp(k, 'g'), String(v));
  // 处理 1/2DEX 这种格式
  expr = expr.replace(/(\d+)\/(\d+)(\w+)/g, '($1/$2*$3)');
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return 0;
  try { return Math.floor(new Function(`return ${expr}`)()); } catch { return 0; }
}

/** 计算技能总百分比 */
function skillTotal(skill: { name: string; baseValue: string; occupationPts: number; interestPts: number; experiencePts: number; growthPts: number }, inv: Investigator): number {
  return parseSkillBase(skill.baseValue, inv) + skill.occupationPts + skill.interestPts + skill.experiencePts + skill.growthPts;
}

/** 构建骰娘命令字符串 */
function buildDiceBotString(inv: Investigator): string {
  const parts: string[] = [];
  // 九大属性
  const attrPairs: [string, keyof Investigator][] = [
    ['力量', 'str'], ['敏捷', 'dex'], ['意志', 'pow'], ['体质', 'con'],
    ['外貌', 'app'], ['教育', 'edu'], ['体型', 'siz'], ['智力', 'int'],
  ];
  const attrShort: Record<string, string> = { str: 'str', dex: 'dex', pow: 'pow', con: 'con', app: 'app', edu: 'edu', siz: 'siz', int: 'int', luck: 'luck' };
  for (const [zh, key] of attrPairs) {
    const v = inv[key] ?? 0;
    parts.push(`${zh}${v}${attrShort[key]}${v}`);
  }
  // 智力特殊别名：灵感
  parts.push(`灵感${inv.int}int${inv.int}`);
  // SAN
  const san = inv.sanCurrent ?? 0;
  parts.push(`san${san}san值${san}理智${san}理智值${san}`);
  // 幸运
  const luck = inv.luck ?? 0;
  parts.push(`幸运${luck}运气${luck}`);
  // MP
  const mp = inv.mpCurrent ?? 0;
  parts.push(`mp${mp}魔法${mp}`);
  // HP
  const hp = inv.hpCurrent ?? 0;
  parts.push(`hp${hp}体力${hp}`);
  // 信用
  const cr = inv.creditRating ?? 0;
  parts.push(`信用${cr}信誉${cr}信用评级${cr}`);
  // 克苏鲁神话
  const cm = inv.cthulhuMythos ?? 0;
  parts.push(`克苏鲁${cm}克苏鲁神话${cm}cm${cm}`);
  // 技能
  for (const sk of inv.skills || []) {
    const name = sk.name;
    const total = skillTotal(sk, inv);
    const aliases = SKILL_ALIASES[name];
    if (aliases) {
      for (const alias of aliases) parts.push(`${alias}${total}`);
    } else {
      // 去掉格式后缀如 ： Ω ① ② ③
      const cleanName = name.replace(/[：Ω①②③]$/, '').trim();
      parts.push(cleanName ? `${cleanName}${total}` : `${name}${total}`);
    }
  }
  return '.st ' + parts.join('');
}

export default function CharacterList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<SavedCharacterMeta[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportingExcel, setExportingExcel] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [copiedDiceId, setCopiedDiceId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadList = () => setCharacters(getAllCharacterMetas());

  useEffect(() => { loadList(); }, []);

  const handleDelete = (id: string) => {
    deleteCharacter(id);
    setDeleteConfirm(null);
    loadList();
  };

  const handleExportExcel = async (id: string) => {
    setExportingExcel(id);
    try {
      const saved = loadCharacter(id);
      if (!saved) return;
      await exportCharacterToExcel(saved.investigator, saved.investigator.occupationName || '未选择');
    } catch (err) {
      console.error('导出Excel失败:', err);
      alert('导出失败，请查看控制台错误信息');
    } finally {
      setExportingExcel(null);
    }
  };

  const handleExportPdf = async (id: string) => {
    setExportingPdf(id);
    try {
      const saved = loadCharacter(id);
      if (!saved) return;
      await exportCharacterToPdf(saved.investigator);
    } catch (err) {
      console.error('导出PDF失败:', err);
      alert('导出失败，请查看控制台错误信息');
    } finally {
      setExportingPdf(null);
    }
  };

  const handleCopyToDiceBot = async (id: string) => {
    try {
      const saved = loadCharacter(id);
      if (!saved) return;
      const diceStr = buildDiceBotString(saved.investigator);
      await navigator.clipboard.writeText(diceStr);
      setCopiedDiceId(id);
      setTimeout(() => {
        setCopiedDiceId(prev => prev === id ? null : prev);
      }, 2000);
    } catch (err) {
      console.error('复制到骰娘失败:', err);
      alert('复制失败，请手动复制');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { investigator, warnings } = await importCharacterFromExcel(file);
      if (warnings.length > 0) {
        console.warn('导入警告:', warnings);
      }
      const id = saveCharacter(investigator);
      loadList();
      navigate(`/edit/${id}`);
    } catch (err) {
      console.error('导入 Excel 失败:', err);
      alert('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
      // 重置 input 以允许重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getEraBadge = (era: string) => {
    const colors: Record<string, string> = {
      '1920s': 'bg-amber-100 text-amber-700 border-amber-300',
      '现代': 'bg-blue-100 text-blue-700 border-blue-300',
      '1890s': 'bg-amber-200 text-amber-800 border-amber-400',
    };
    return colors[era] || 'bg-slate-100 text-coc-muted border-coc-border';
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-coc-text">
              人物卡管理
            </h1>
            <p className="text-sm text-coc-muted mt-1">
              共 {characters.length} 个人物
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleImportExcel}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-coc-accent/50 text-coc-accent text-sm font-bold hover:bg-coc-accent/5 hover:border-coc-accent transition-all disabled:opacity-30"
            >
              {importing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 8.25L12 3.75m0 0l4.5 4.5M12 3.75V15" />
                </svg>
              )}
              上传 Excel 人物卡
            </button>
            <button
              onClick={() => navigate('/create')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-transparent bg-coc-accent text-white text-sm font-bold hover:bg-coc-accent/90 hover:shadow-lg hover:shadow-coc-accent/25 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              新建人物卡
            </button>
          </div>
        </div>
      </header>

      {/* Empty state */}
      {characters.length === 0 && (
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="text-6xl mb-4 opacity-30">∅</div>
          <h2 className="text-xl font-bold text-coc-text mb-2">还没有人物卡</h2>
          <p className="text-coc-muted text-sm mb-6">
            点击下方按钮开始创建你的第一位调查员
          </p>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-coc-accent text-white font-bold hover:bg-coc-accent/90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            创建第一张人物卡
          </button>
        </div>
      )}

      {/* Character grid */}
      {characters.length > 0 && (
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(c => (
              <div
                key={c.id}
                className="group bg-coc-card/50 border border-coc-border rounded-2xl p-5 hover:border-coc-accent/40 hover:bg-coc-card/70 transition-all cursor-pointer"
                onClick={() => navigate(`/edit/${c.id}`)}
              >
                {/* Card header */}
                <div className="mb-3">
                  {/* Top row: name + edit/delete icons */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-coc-text truncate">
                        {c.name}
                      </h3>
                      <p className="text-sm text-coc-muted truncate">{c.player}</p>
                    </div>
                    {/* Edit & Delete (icons only) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex gap-1"
                        onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/edit/${c.id}`)}
                          className="p-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-muted hover:text-coc-info hover:border-coc-info/50 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="p-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-muted hover:text-coc-danger hover:border-coc-danger/50 transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                      {/* Random code — very subtle corner display */}
                      <code
                        className="font-mono text-[10px] text-coc-muted/35 select-all"
                        onClick={e => e.stopPropagation()}
                        title="人物ID"
                      >{c.id}</code>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={getEraBadge(c.era)}>
                      {c.era}
                    </span>
                    {c.occupationName && c.occupationName !== '未选择' && (
                      <span className="text-coc-muted bg-coc-bg px-2 py-0.5 rounded-md border border-coc-border">
                        {c.occupationName}
                      </span>
                    )}
                  </div>
                  {(c.age || c.gender) && (
                    <p className="text-coc-muted">
                      {c.age ? `${c.age}岁` : ''}{c.age && c.gender ? ' · ' : ''}{c.gender}
                    </p>
                  )}
                  {/* Stats: HP + SAN */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-coc-muted pt-2 border-t border-coc-border/30">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium text-coc-text/60">HP</span>
                      <span className="text-coc-text font-medium">{c.hpCurrent}/{c.hpMax}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium text-coc-text/60">SAN</span>
                      <span className="text-coc-text font-medium">{c.sanCurrent}/{c.sanMax}</span>
                    </span>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="mt-3"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleExportExcel(c.id)}
                      disabled={exportingExcel === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-muted text-xs font-medium hover:text-coc-accent hover:border-coc-accent/50 transition-colors disabled:opacity-30"
                    >
                      {exportingExcel === c.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      )}
                      导出 Excel
                    </button>
                    <button
                      onClick={() => handleExportPdf(c.id)}
                      disabled={exportingPdf === c.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-muted text-xs font-medium hover:text-coc-danger hover:border-coc-danger/50 transition-colors disabled:opacity-30"
                    >
                      {exportingPdf === c.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                        </svg>
                      )}
                      导出 PDF
                    </button>
                    <div className="relative inline-flex">
                      <button
                        onClick={() => handleCopyToDiceBot(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coc-bg border border-coc-border text-coc-muted text-xs font-medium hover:text-coc-warning hover:border-coc-warning/50 transition-colors"
                        title="复制角色数据到骰娘"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        复制给骰娘
                      </button>
                      {copiedDiceId === c.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-coc-accent text-white text-xs font-medium shadow-lg whitespace-nowrap z-10 animate-fade-in">
                          已复制到剪贴板
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-coc-accent" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-coc-border/50 text-xs text-coc-muted">
                  更新于 {formatDate(c.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-12 pt-6 border-t border-coc-border">
        <div className="text-sm text-coc-muted text-center space-y-1">
          <p>
            <span className="font-bold text-coc-accent">COC 人物卡向导</span>
            <span className="mx-2 text-coc-border">·</span>
            <span className="font-mono">v0.5.0</span>
          </p>
          <p className="text-xs leading-relaxed">
            浅色主题 UI · 蓝色系+绿色系点缀
            <span className="mx-1.5 text-coc-border">·</span>
            全属性拒绝采样掷骰 (总和=480)
            <span className="mx-1.5 text-coc-border">·</span>
            导出 Excel · 导出 PDF
            <span className="mx-1.5 text-coc-border">·</span>
            零依赖离线可用 (HashRouter)
          </p>
        </div>
      </footer>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-coc-card border border-coc-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-3 text-coc-danger font-bold">!</div>
              <h3 className="text-lg font-bold text-coc-text">确认删除</h3>
              <p className="text-sm text-coc-muted mt-2">
                删除后无法恢复，确定要删除这个人物的数据吗？
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-coc-border text-coc-text hover:bg-coc-bg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-coc-danger text-white hover:bg-coc-danger/90 transition-colors text-sm font-bold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
