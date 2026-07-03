interface UnsavedChangesModalProps {
  onSaveAndExit: () => void;
  onExitWithoutSaving: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  onSaveAndExit,
  onExitWithoutSaving,
  onCancel,
}: UnsavedChangesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-coc-text mb-2">未保存的更改</h3>
        <p className="text-sm text-coc-muted mb-6 leading-relaxed">
          当前人物卡有未保存的修改，是否在离开前保存？
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveAndExit}
            className="w-full md-ripple px-4 py-2.5 rounded-xl text-sm font-semibold bg-coc-accent text-white shadow-sm hover:shadow-md transition-all"
          >
            保存并退出
          </button>
          <button
            onClick={onExitWithoutSaving}
            className="w-full md-ripple px-4 py-2.5 rounded-xl text-sm font-medium text-coc-danger hover:bg-coc-danger/8 transition-colors"
          >
            不保存直接退出
          </button>
          <button
            onClick={onCancel}
            className="w-full md-ripple px-4 py-2.5 rounded-xl text-sm font-medium text-coc-muted hover:bg-black/[0.04] transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
