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
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-coc-text tracking-tight">{title}</h1>
          <div className="text-xs text-coc-muted/70">
            <span className="text-coc-accent font-medium">{step}</span>
            <span className="mx-1">/</span>
            <span>{totalSteps}</span>
            <span className="mx-1.5 text-coc-border">·</span>
            <span>{STEP_LABELS[step - 1]}</span>
          </div>
        </div>
        {subtitle && <p className="text-sm text-coc-muted/70 mt-0.5">{subtitle}</p>}

        {/* Progress bar — MD3 linear indicator */}
        <div className="mt-4 flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-coc-accent' : i === step - 1 ? 'bg-coc-accent/50' : 'bg-coc-border/60'
              }`}
            />
          ))}
        </div>
        {progress !== undefined && (
          <div className="text-[11px] text-coc-muted/50 mt-1 text-right">{progress}%</div>
        )}
      </div>

      {/* Content card — MD3 elevated surface */}
      <div className="bg-white rounded-xl shadow-sm border border-coc-border/40 p-6 min-h-[400px]">
        {children}
      </div>

      {/* Navigation — MD3 buttons */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {onPrev && (
            <button
              onClick={onPrev}
              className="md-ripple inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-coc-text text-sm font-medium hover:bg-black/[0.04] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {prevLabel || '上一步'}
            </button>
          )}
        </div>
        <div>
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled}
              className={`md-ripple inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                nextDisabled
                  ? 'bg-coc-bg text-coc-muted cursor-not-allowed'
                  : 'bg-coc-accent text-white shadow-sm hover:shadow-md'
              }`}
            >
              {nextLabel || '下一步'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
