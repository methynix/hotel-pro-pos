import { Transaction, TransactionFilters } from '../types';
import { getPage, createOne, updateOne } from './crud';

const BASE = '/transactions';

export const transactionService = {
  getAllTransactions: (filters: TransactionFilters = {}) => getPage<Transaction>(BASE, filters),
  createTransaction: (data: Partial<Transaction>, idempotencyKey?: string) =>
    createOne<Transaction>(BASE, data, idempotencyKey),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    updateOne<Transaction>(`${BASE}/${id}`, data),
  /** Transactions are never deleted: voiding reverses them and keeps the record. */
  voidTransaction: (id: string, reason: string) => createOne<Transaction>(`${BASE}/${id}/void`, { reason }),
};
