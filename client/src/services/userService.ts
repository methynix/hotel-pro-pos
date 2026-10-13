import { User, ListParams, UserRole } from '../types';
import { getPage, updateOne, deleteOne } from './crud';

// Members of the active organization. People join through invitations
// (invitationService); an admin can change a member's role or remove them.
const BASE = '/users';

export const userService = {
  getAllUsers: (params: ListParams = {}) => getPage<User>(BASE, params),
  updateRole: (id: string, role: UserRole) => updateOne<User>(`${BASE}/${id}`, { role }),
  removeMember: (id: string) => deleteOne(`${BASE}/${id}`),
};
