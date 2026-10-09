import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getPermissions, Permissions } from '../utils/permissions';

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  return useMemo(() => getPermissions(user?.role), [user?.role]);
};
