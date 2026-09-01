import apiClient from './api';
import { Budget } from '../types/index';

export const budgetService = {
  async createBudget(data: {
    categoryId: string;
    amount: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    alertThreshold?: number;
  }) {
    const response = await apiClient.post('/budgets', data);
    return response.data.data as Budget;
  },

  async getAllBudgets() {
    const response = await apiClient.get('/budgets');
    return response.data.data as (Budget & { percentageUsed: number; isAlertTriggered: boolean })[];
  },

  async getBudgetById(id: string) {
    const response = await apiClient.get(`/budgets/${id}`);
    return response.data.data;
  },

  async updateBudget(id: string, data: Partial<Budget>) {
    const response = await apiClient.patch(`/budgets/${id}`, data);
    return response.data.data as Budget;
  },

  async deleteBudget(id: string) {
    const response = await apiClient.delete(`/budgets/${id}`);
    return response.data;
  },

  async getAlerts() {
    const response = await apiClient.get('/budgets/alerts');
    return response.data.data as Array<{
      budgetId: string;
      category: string;
      message: string;
      severity: 'warning' | 'critical';
      percentageUsed: number;
    }>;
  },
};
