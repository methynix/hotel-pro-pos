import { Transaction, TransactionFilters } from '../types';
import { getPage, createOne, updateOne, deleteOne } from './crud';

const BASE = '/transactions';

export const transactionService = {
  getAllTransactions: (filters: TransactionFilters = {}) => getPage<Transaction>(BASE, filters),
  createTransaction: (data: Partial<Transaction>) => createOne<Transaction>(BASE, data),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    updateOne<Transaction>(`${BASE}/${id}`, data),
  deleteTransaction: (id: string) => deleteOne(`${BASE}/${id}`),
};
