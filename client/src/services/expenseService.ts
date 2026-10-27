import { Expense, ExpenseFilters } from '../types';
import { getPage, createOne, updateOne, deleteOne } from './crud';

const BASE = '/expenses';

export interface PayExpenseInput {
  accountId: string;
  paidDate?: string;
  paymentMethod?: string;
  reference?: string;
}

export const expenseService = {
  getAllExpenses: (filters: ExpenseFilters = {}) => getPage<Expense>(BASE, filters),
  createExpense: (data: Partial<Expense>, idempotencyKey?: string) => createOne<Expense>(BASE, data, idempotencyKey),
  updateExpense: (id: string, data: Partial<Expense>) => updateOne<Expense>(`${BASE}/${id}`, data),
  deleteExpense: (id: string) => deleteOne(`${BASE}/${id}`),
  approve: (id: string) => createOne<Expense>(`${BASE}/${id}/approve`, {}),
  reject: (id: string, reason?: string) => createOne<Expense>(`${BASE}/${id}/reject`, { reason }),
  /** Records the payment in the ledger. Safe to retry with the same key. */
  pay: (id: string, input: PayExpenseInput, idempotencyKey: string) =>
    createOne<Expense>(`${BASE}/${id}/pay`, input, idempotencyKey),
};
