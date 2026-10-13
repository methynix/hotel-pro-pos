import { FC, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-border">
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      {description && <p className="mt-1 text-sm text-text-secondary max-w-xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
