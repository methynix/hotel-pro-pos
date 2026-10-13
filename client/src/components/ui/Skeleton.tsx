import { CSSProperties, FC } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export const Skeleton: FC<SkeletonProps> = ({ className = '', style }) => (
  <div aria-hidden="true" style={style} className={`animate-pulse rounded-md bg-secondary-200/60 ${className}`} />
);

/** Placeholder for a page title + subtitle (and optional action button). */
export const SkeletonHeader: FC<{ withAction?: boolean }> = ({ withAction = true }) => (
  <div className="flex items-end justify-between gap-4 pb-5 border-b border-border">
    <div className="space-y-2.5">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-3.5 w-72 max-w-full" />
    </div>
    {withAction && <Skeleton className="h-9 w-28" />}
  </div>
);

/** Placeholder matching StatStrip. */
export const SkeletonStatCards: FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    className={`grid grid-cols-1 sm:grid-cols-2 ${
      count >= 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'
    } gap-px bg-border border border-border rounded-xl overflow-hidden`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-surface px-5 py-4 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-32" />
      </div>
    ))}
  </div>
);

/** Placeholder for a ledger table. */
export const SkeletonTable: FC<{ rows?: number; columns?: number }> = ({ rows = 6, columns = 5 }) => (
  <div className="panel overflow-hidden" role="status" aria-label="Loading">
    <div className="bg-secondary-50 border-b border-border px-4 py-3 flex gap-6">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1 max-w-[7rem]" />
      ))}
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-3.5 flex items-center gap-6">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-3.5 flex-1 ${c === columns - 1 ? 'max-w-[5rem] ml-auto' : c === 1 ? '' : 'max-w-[8rem]'}`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Placeholder for a list of rows inside a panel (accounts, categories). */
export const SkeletonCards: FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="panel divide-y divide-border" role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="px-4 py-4 flex items-center gap-4">
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-48 max-w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);

/** Placeholder for a stacked form card (settings, etc). */
export const SkeletonForm: FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="panel p-6 space-y-5" role="status" aria-label="Loading">
    <Skeleton className="h-4 w-40" />
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    ))}
  </div>
);
