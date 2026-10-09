import { User, ListParams } from '../types';
import { getPage, createOne, updateOne, deleteOne } from './crud';

const BASE = '/users';

export type UserInput = Pick<User, 'name' | 'email' | 'role' | 'isActive'> & { password?: string };

export const userService = {
  getAllUsers: (params: ListParams = {}) => getPage<User>(BASE, params),
  createUser: (data: UserInput & { password: string }) => createOne<User>(BASE, data),
  updateUser: (id: string, data: Partial<UserInput>) => updateOne<User>(`${BASE}/${id}`, data),
  deleteUser: (id: string) => deleteOne(`${BASE}/${id}`),
};
