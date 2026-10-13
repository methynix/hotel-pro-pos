import { FC, ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

const DOTS: Record<BadgeTone, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-400',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  accent: 'bg-accent-600',
  neutral: 'bg-secondary-400',
};

/** Status label: a small coloured dot and plain text, no pastel pill. */
const Badge: FC<{ tone?: BadgeTone; children: ReactNode; icon?: ReactNode }> = ({
  tone = 'neutral',
  children,
  icon,
}) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-text-primary capitalize whitespace-nowrap">
    {icon ?? <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone]}`} />}
    {children}
  </span>
);

export default Badge;
