import { FC, ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Kept for call-site compatibility; the strip layout doesn't show icons. */
  icon?: ReactNode;
  tone?: 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'primary';
  hint?: ReactNode;
}

const VALUE_TONES = {
  accent: 'text-text-primary',
  primary: 'text-text-primary',
  info: 'text-text-primary',
  success: 'text-success-700',
  danger: 'text-danger-600',
  warning: 'text-warning-700',
};

/** One cell of a StatStrip. */
const StatCard: FC<StatCardProps> = ({ label, value, tone = 'accent', hint }) => (
  <div className="px-5 py-4 min-w-0">
    <p className="eyebrow">{label}</p>
    <p className={`mt-1.5 font-mono text-xl tabular-nums truncate ${VALUE_TONES[tone]}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-text-secondary truncate">{hint}</p>}
  </div>
);

/** A single bordered row of figures separated by hairlines (1px grid gap over the border colour). */
export const StatStrip: FC<{ children: ReactNode; columns?: 3 | 4 }> = ({ children, columns = 4 }) => (
  <div
    className={`grid grid-cols-1 sm:grid-cols-2 ${
      columns === 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'
    } gap-px bg-border border border-border rounded-xl overflow-hidden [&>*]:bg-surface`}
  >
    {children}
  </div>
);

export default StatCard;
