import apiClient from './api';
import { RecurringTransaction } from '../types/index';

export const recurringTransactionService = {
  async createRecurring(data: {
    amount: number;
    description: string;
    category: string;
    type: 'inflow' | 'outflow';
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    nextDate: string;
  }) {
    const response = await apiClient.post('/recurring-transactions', data);
    return response.data.data as RecurringTransaction;
  },

  async getAllRecurring() {
    const response = await apiClient.get('/recurring-transactions');
    return response.data.data as RecurringTransaction[];
  },

  async getRecurringById(id: string) {
    const response = await apiClient.get(`/recurring-transactions/${id}`);
    return response.data.data as RecurringTransaction;
  },

  async updateRecurring(id: string, data: Partial<RecurringTransaction>) {
    const response = await apiClient.patch(`/recurring-transactions/${id}`, data);
    return response.data.data as RecurringTransaction;
  },

  async toggleRecurring(id: string) {
    const response = await apiClient.patch(`/recurring-transactions/${id}/toggle`);
    return response.data.data as RecurringTransaction;
  },

  async deleteRecurring(id: string) {
    const response = await apiClient.delete(`/recurring-transactions/${id}`);
    return response.data;
  },
};
