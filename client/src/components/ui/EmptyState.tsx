import { FC, ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="bg-surface rounded-xl border border-dashed border-border px-6 py-16 text-center">
    <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-text-primary">{title}</h3>
    {description && <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;
