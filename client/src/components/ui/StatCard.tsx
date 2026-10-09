import { FC, ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'primary';
  hint?: ReactNode;
}

const TONES = {
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-50 text-success-600',
  danger: 'bg-danger-50 text-danger-600',
  warning: 'bg-warning-50 text-warning-600',
  info: 'bg-info-50 text-info-600',
  primary: 'bg-primary-50 text-primary-700',
};

const StatCard: FC<StatCardProps> = ({ label, value, icon, tone = 'accent', hint }) => (
  <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-text-secondary">{label}</h3>
      <div className={`p-2 rounded-lg ${TONES[tone]}`}>{icon}</div>
    </div>
    <p className="text-2xl md:text-3xl font-bold text-text-primary truncate">{value}</p>
    {hint && <div className="mt-2 text-sm text-text-secondary">{hint}</div>}
  </div>
);

export default StatCard;
