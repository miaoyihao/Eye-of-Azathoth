import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCharacterMetas, deleteCharacter } from '@/services/storage';
import type { SavedCharacterMeta } from '@/services/storage';

export default function CharacterList() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<SavedCharacterMeta[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadList = () => setCharacters(getAllCharacterMetas());

  useEffect(() => { loadList(); }, []);

  const handleDelete = (id: string) => {
    deleteCharacter(id);
    setDeleteConfirm(null);
    loadList();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getEraBadge = (era: string) => {
    const colors: Record<string, string> = {
      '1920s': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      '现代': 'bg-coc-info/20 text-coc-info border-coc-info/30',
      '1890s': 'bg-amber-700/20 text-amber-600 border-amber-700/30',
    };
    return colors[era] || 'bg-coc-muted/20 text-coc-muted border-coc-muted/30';
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-coc-text">
              <span className="text-coc-gold">🎭</span> 人物卡管理
            </h1>
            <p className="text-sm text-coc-muted mt-1">
              共 {characters.length} 个人物
            </p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coc-accent text-white text-sm font-bold hover:bg-coc-accent/90 hover:shadow-lg hover:shadow-coc-accent/25 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新建人物卡
          </button>
        </div>
      </header>

      {/* Empty state */}
      {characters.length === 0 && (
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="text-6xl mb-4 opacity-30">📜</div>
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
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-coc-text truncate">
                      {c.name}
                    </h3>
                    <p className="text-sm text-coc-muted truncate">{c.player}</p>
                  </div>
                  {/* Action buttons (hidden by default, show on hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-coc-card border border-coc-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">⚠️</div>
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
