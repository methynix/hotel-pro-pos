import { FC, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MdLockOutline } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { AuthUser } from '../../types';
import { Skeleton, SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../ui/Skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AuthUser['role'][];
}

/** Mirrors the app shell (sidebar + header + content) while the session loads. */
const AppShellSkeleton: FC = () => (
  <div className="flex h-screen bg-background overflow-hidden" role="status" aria-label="Loading">
    <div className="hidden md:flex w-64 flex-col bg-primary-900 p-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary-800 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-primary-800 animate-pulse" />
          <div className="h-3 w-32 rounded bg-primary-800 animate-pulse" />
        </div>
      </div>
      <div className="space-y-3 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-primary-800/70 animate-pulse" />
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="h-[73px] bg-surface border-b border-border flex items-center justify-end px-6 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <SkeletonHeader />
        <SkeletonStatCards />
        <SkeletonTable rows={5} />
      </div>
    </div>
  </div>
);

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center">
            <MdLockOutline className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access denied</h1>
          <p className="text-text-secondary mb-6">You don't have permission to view this page.</p>
          <Link to="/app" className="text-accent-600 font-medium hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
