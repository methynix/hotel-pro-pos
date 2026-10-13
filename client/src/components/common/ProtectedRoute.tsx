import { FC, ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { MdLockOutline } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import NoOrganization from './NoOrganization';
import { Skeleton, SkeletonHeader, SkeletonStatCards, SkeletonTable } from '../ui/Skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

/** Mirrors the app shell (sidebar + header + content) while the session loads. */
const AppShellSkeleton: FC = () => (
  <div className="flex h-screen bg-background overflow-hidden" role="status" aria-label="Loading">
    <div className="hidden md:flex w-60 flex-col bg-secondary-50 border-r border-border">
      <div className="h-14 px-5 flex items-center border-b border-border">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="px-3 py-4 space-y-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className={`h-7 ${i % 3 === 0 ? 'w-20 h-3 mt-4' : 'w-full'}`} />
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="h-14 border-b border-border flex items-center justify-between px-10">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <div className="px-6 md:px-10 py-8 space-y-6 max-w-[1280px]">
        <SkeletonHeader />
        <SkeletonStatCards />
        <SkeletonTable rows={5} />
      </div>
    </div>
  </div>
);

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated || !user) {
    // Come back to the requested page after signing in.
    return <Navigate to={`/?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!user.organization || !user.role) {
    return <NoOrganization />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-sm">
          <MdLockOutline className="mx-auto mb-3 w-6 h-6 text-text-secondary" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Access denied</h1>
          <p className="text-text-secondary mb-6">You don't have permission to view this page.</p>
          <Link to="/app" className="text-sm text-accent-700 font-medium underline underline-offset-4">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
