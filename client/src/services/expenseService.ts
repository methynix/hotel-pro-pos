import axiosInstance from './api';
import { Expense, ExpenseFilters, ApiResponse, PaginatedResponse } from '../types';

const EXPENSE_BASE_URL = '/expenses';

export const expenseService = {
  async getAllExpenses(filters: ExpenseFilters = {}) {
    const response = await axiosInstance.get<PaginatedResponse<Expense>>(
      EXPENSE_BASE_URL,
      { params: filters }
    );
    return response.data;
  },

  async getExpenseById(id: string) {
    const response = await axiosInstance.get<ApiResponse<Expense>>(
      `${EXPENSE_BASE_URL}/${id}`
    );
    return response.data;
  },

  async createExpense(expenseData: Partial<Expense>) {
    const response = await axiosInstance.post<ApiResponse<Expense>>(
      EXPENSE_BASE_URL,
      expenseData
    );
    return response.data;
  },

  async updateExpense(id: string, expenseData: Partial<Expense>) {
    const response = await axiosInstance.patch<ApiResponse<Expense>>(
      `${EXPENSE_BASE_URL}/${id}`,
      expenseData
    );
    return response.data;
  },

  async deleteExpense(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${EXPENSE_BASE_URL}/${id}`
    );
    return response.data;
  },
};
