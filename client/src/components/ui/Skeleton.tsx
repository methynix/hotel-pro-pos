import { FC } from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className = '' }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-base bg-secondary-200/70 ${className}`} />
);

/** Placeholder for a page title + subtitle (and optional action button). */
export const SkeletonHeader: FC<{ withAction?: boolean }> = ({ withAction = true }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="space-y-3">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
    {withAction && <Skeleton className="h-10 w-32" />}
  </div>
);

/** Placeholder for a row of KPI / stat cards. */
export const SkeletonStatCards: FC<{ count?: number }> = ({ count = 4 }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 ${count >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
);

/** Placeholder for a data table. Renders inside the table card. */
export const SkeletonTable: FC<{ rows?: number; columns?: number }> = ({ rows = 6, columns = 5 }) => (
  <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden" role="status" aria-label="Loading">
    <div className="bg-background border-b border-border px-6 py-4 flex gap-6">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-6 py-4 flex items-center gap-6">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[8rem]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Placeholder for a grid of content cards. */
export const SkeletonCards: FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    ))}
  </div>
);

/** Placeholder for a stacked form card (settings, etc). */
export const SkeletonForm: FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-6" role="status" aria-label="Loading">
    <Skeleton className="h-5 w-40" />
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
);
