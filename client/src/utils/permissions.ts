import { UserRole } from '../types';

// Mirrors server/src/config/permissions.ts. Admins have full CRUD; other
// roles are progressively limited. The server enforces this too; the UI
// just hides actions a role can't perform.
const CAN_CREATE: UserRole[] = ['admin', 'manager', 'operator'];
const CAN_UPDATE: UserRole[] = ['admin', 'manager'];
const CAN_DELETE: UserRole[] = ['admin'];
const CAN_APPROVE: UserRole[] = ['admin', 'manager'];

export interface Permissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  isAdmin: boolean;
  isReadOnly: boolean;
}

export const getPermissions = (role?: UserRole): Permissions => {
  const has = (allowed: UserRole[]) => !!role && allowed.includes(role);
  return {
    canCreate: has(CAN_CREATE),
    canUpdate: has(CAN_UPDATE),
    canDelete: has(CAN_DELETE),
    canApprove: has(CAN_APPROVE),
    isAdmin: role === 'admin',
    isReadOnly: !has(CAN_CREATE) && !has(CAN_UPDATE) && !has(CAN_DELETE),
  };
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full access: create, edit, delete, approve and manage users',
  manager: 'Create, edit and approve; cannot delete',
  operator: 'Create new records; cannot edit or delete',
  viewer: 'Read-only access',
};
