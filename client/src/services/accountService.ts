import { Account } from '../types';
import { getList, createOne, updateOne, deleteOne } from './crud';

const BASE = '/accounts';

export const accountService = {
  getAllAccounts: () => getList<Account>(BASE),
  createAccount: (data: Partial<Account>) => createOne<Account>(BASE, data),
  updateAccount: (id: string, data: Partial<Account>) => updateOne<Account>(`${BASE}/${id}`, data),
  deleteAccount: (id: string) => deleteOne(`${BASE}/${id}`),
};
