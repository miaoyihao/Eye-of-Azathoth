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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-coc-border/30 hover:border-coc-accent/30 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-coc-text">{name}</span>
          <span className="text-[11px] text-coc-muted/60 font-mono">({abbr})</span>
        </div>
        <span className="text-xl font-bold text-coc-accent tabular-nums">{value}</span>
      </div>

      {/* Slider with inline track fill */}
      <div className="mb-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full"
          style={{ background: `linear-gradient(to right, #1A73E84D 0%, #1A73E84D ${pct}%, #DADCE0 ${pct}%, #DADCE0 100%)` }}
        />
      </div>

      {/* Min/Max */}
      <div className="flex justify-between text-[11px] text-coc-muted/50 mb-2">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {/* Formula & Roll + Derivatives */}
      <div className="flex items-center justify-between">
        {formula && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-coc-muted/60">{formula}</span>
            {onRoll && (
              <button
                onClick={onRoll}
                className="text-[11px] px-1.5 py-0.5 rounded bg-coc-accent/12 text-coc-accent hover:bg-coc-accent/20 transition-colors"
              >
                🎲
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-coc-muted/50">
          <span>½ {half}</span>
          <span className="text-coc-border/50">|</span>
          <span>⅕ {fifth}</span>
        </div>
      </div>

      {/* Special note */}
      {specialNote && (
        <div className={`mt-2 text-[11px] px-2 py-1 rounded ${specialNoteColor || 'bg-coc-warning/12 text-coc-warning'}`}>
          {specialNote}
        </div>
      )}
    </div>
  );
}
