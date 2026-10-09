import { FC, ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-800',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  accent: 'bg-accent-100 text-accent-700',
  neutral: 'bg-secondary-100 text-secondary-700',
};

const Badge: FC<{ tone?: BadgeTone; children: ReactNode; icon?: ReactNode }> = ({
  tone = 'neutral',
  children,
  icon,
}) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TONES[tone]}`}>
    {icon}
    {children}
  </span>
);

export default Badge;
