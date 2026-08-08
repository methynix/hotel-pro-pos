import axiosInstance from './api';
import { Account, Banking, ApiResponse, PaginatedResponse } from '../types';

const ACCOUNT_BASE_URL = '/banking';

export const bankingService = {
  async getAllAccounts() {
    const response = await axiosInstance.get<PaginatedResponse<Account>>(
      `${ACCOUNT_BASE_URL}/accounts`
    );
    return response.data;
  },

  async getAccountById(id: string) {
    const response = await axiosInstance.get<ApiResponse<Account>>(
      `${ACCOUNT_BASE_URL}/accounts/${id}`
    );
    return response.data;
  },

  async createAccount(accountData: Partial<Account>) {
    const response = await axiosInstance.post<ApiResponse<Account>>(
      `${ACCOUNT_BASE_URL}/accounts`,
      accountData
    );
    return response.data;
  },

  async updateAccount(id: string, accountData: Partial<Account>) {
    const response = await axiosInstance.put<ApiResponse<Account>>(
      `${ACCOUNT_BASE_URL}/accounts/${id}`,
      accountData
    );
    return response.data;
  },

  async deleteAccount(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${ACCOUNT_BASE_URL}/accounts/${id}`
    );
    return response.data;
  },
};
