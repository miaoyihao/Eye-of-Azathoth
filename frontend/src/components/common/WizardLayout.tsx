import type { ReactNode } from 'react';
import type { WizardStep } from '@/types';

interface WizardLayoutProps {
  step: WizardStep;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  isValid?: boolean;
  progress?: number;
}

const STEP_LABELS = [
  '基本信息',
  '九大属性',
  '职业与点数',
  '技能分配',
  '装备与叙事',
  '状态与确认',
];

export default function WizardLayout({
  step, totalSteps, title, subtitle, children,
  onPrev, onNext, prevLabel, nextLabel, nextDisabled, progress,
}: WizardLayoutProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-coc-text">{title}</h1>
          <div className="text-sm text-coc-muted">
            <span className="text-coc-accent font-mono">{step}</span>
            <span>/</span>
            <span>{totalSteps}</span>
            <span className="mx-2">·</span>
            <span>{STEP_LABELS[step - 1]}</span>
          </div>
        </div>
        {subtitle && <p className="text-sm text-coc-muted">{subtitle}</p>}

        {/* Progress bar */}
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-coc-accent' : i === step - 1 ? 'bg-coc-accent/60' : 'bg-coc-border'
              }`}
            />
          ))}
        </div>
        {progress !== undefined && (
          <div className="text-xs text-coc-muted mt-1 text-right">{progress}%</div>
        )}
      </div>

      {/* Content */}
      <div className="bg-coc-card/50 rounded-2xl border border-coc-border p-6 min-h-[400px]">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {onPrev && (
            <button
              onClick={onPrev}
              className="px-5 py-2.5 rounded-xl border border-coc-border text-coc-text hover:bg-coc-card transition-colors text-sm font-medium"
            >
              ← {prevLabel || '上一步'}
            </button>
          )}
        </div>
        <div>
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                nextDisabled
                  ? 'bg-coc-border text-coc-muted cursor-not-allowed'
                  : 'bg-coc-accent text-white hover:bg-coc-accent/90 hover:shadow-lg hover:shadow-coc-accent/25'
              }`}
            >
              {nextLabel || '下一步 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
