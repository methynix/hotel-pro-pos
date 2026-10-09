import { UserRole } from '../types/api';

// Role matrix shared by every resource route. Admins have full CRUD;
// everyone else is progressively limited. Keep in sync with
// client/src/utils/permissions.ts.
export const CAN_CREATE: UserRole[] = ['admin', 'manager', 'operator'];
export const CAN_UPDATE: UserRole[] = ['admin', 'manager'];
export const CAN_DELETE: UserRole[] = ['admin'];
export const CAN_APPROVE: UserRole[] = ['admin', 'manager'];

export const hasRole = (role: UserRole | undefined, allowed: UserRole[]): boolean =>
  !!role && allowed.includes(role);
