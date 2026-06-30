interface StatCardProps {
  icon: string;
  name: string;
  abbr: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  half: number;
  fifth: number;
  formula?: string;
  onRoll?: () => void;
  specialNote?: string;
  specialNoteColor?: string;
}

export default function StatCard({
  icon, name, abbr, value, min, max, step = 5, onChange,
  half, fifth, formula, onRoll, specialNote, specialNoteColor,
}: StatCardProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="bg-coc-card rounded-xl p-4 border border-coc-border hover:border-coc-accent/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-coc-text">{name}</span>
          <span className="text-xs text-coc-muted font-mono">({abbr})</span>
        </div>
        <span className="text-2xl font-bold text-coc-accent tabular-nums">{value}</span>
      </div>

      {/* Slider */}
      <div className="relative mb-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full"
        />
        {/* Track fill */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-coc-accent/30 pointer-events-none" style={{ width: `${pct}%` }} />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-coc-muted mb-3">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {/* Formula & Roll */}
      {formula && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-coc-muted">基础掷骰 {formula}</span>
          {onRoll && (
            <button
              onClick={onRoll}
              className="text-xs px-2 py-0.5 rounded bg-coc-accent/20 text-coc-accent hover:bg-coc-accent/30 transition-colors"
            >
              🎲 骰
            </button>
          )}
        </div>
      )}

      {/* Derivative values */}
      <div className="flex items-center gap-3 text-xs text-coc-muted">
        <span>半值: {half}</span>
        <span className="text-coc-border">|</span>
        <span>1/5: {fifth}</span>
      </div>

      {/* Special note */}
      {specialNote && (
        <div className={`mt-2 text-xs px-2 py-1 rounded ${specialNoteColor || 'bg-coc-warning/20 text-coc-warning'}`}>
          {specialNote}
        </div>
      )}
    </div>
  );
}
