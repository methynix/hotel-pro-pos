import { FC, ReactNode } from 'react';

interface EmptyStateProps {
  /** Accepted for compatibility; empty states are text-only. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState: FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="panel px-6 py-12">
    <div className="max-w-md">
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  </div>
);

export default EmptyState;
