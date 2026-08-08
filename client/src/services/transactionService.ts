import axiosInstance from './api';
import { Transaction, TransactionFilters, ApiResponse, PaginatedResponse } from '../types';

const TRANSACTION_BASE_URL = '/sales';

export const transactionService = {
  async getAllTransactions(filters: TransactionFilters = {}) {
    const response = await axiosInstance.get<PaginatedResponse<Transaction>>(
      TRANSACTION_BASE_URL,
      { params: filters }
    );
    return response.data;
  },

  async getTransactionById(id: string) {
    const response = await axiosInstance.get<ApiResponse<Transaction>>(
      `${TRANSACTION_BASE_URL}/${id}`
    );
    return response.data;
  },

  async createTransaction(transactionData: Partial<Transaction>) {
    const response = await axiosInstance.post<ApiResponse<Transaction>>(
      TRANSACTION_BASE_URL,
      transactionData
    );
    return response.data;
  },

  async updateTransaction(id: string, transactionData: Partial<Transaction>) {
    const response = await axiosInstance.put<ApiResponse<Transaction>>(
      `${TRANSACTION_BASE_URL}/${id}`,
      transactionData
    );
    return response.data;
  },

  async deleteTransaction(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${TRANSACTION_BASE_URL}/${id}`
    );
    return response.data;
  },
};
