import { Expense, ExpenseFilters } from '../types';
import { getPage, createOne, updateOne, deleteOne } from './crud';

const BASE = '/expenses';

export const expenseService = {
  getAllExpenses: (filters: ExpenseFilters = {}) => getPage<Expense>(BASE, filters),
  createExpense: (data: Partial<Expense>) => createOne<Expense>(BASE, data),
  updateExpense: (id: string, data: Partial<Expense>) => updateOne<Expense>(`${BASE}/${id}`, data),
  deleteExpense: (id: string) => deleteOne(`${BASE}/${id}`),
};
