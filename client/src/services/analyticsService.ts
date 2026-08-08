import apiClient from './api';

export interface DashboardMetrics {
  totalInflows: number;
  totalExpenses: number;
  netCashFlow: number;
  accountBalance: number;
  transactionCount: number;
  pendingCount: number;
  inflowsChange: number;
  expensesChange: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface DailyTrend {
  date: string;
  inflow: number;
  outflow: number;
}

export const analyticsService = {
  async getDashboardMetrics(timeframe: 'month' | 'quarter' | 'year' = 'month') {
    const { data } = await apiClient.get('/analytics/dashboard', {
      params: { timeframe },
    });
    return data.data as DashboardMetrics;
  },

  async getTopCategories(limit = 5) {
    const { data } = await apiClient.get('/analytics/categories', {
      params: { limit },
    });
    return data.data as CategorySpending[];
  },

  async getCashFlowTrend(days = 30) {
    const { data } = await apiClient.get('/analytics/cashflow', {
      params: { days },
    });
    return data.data as DailyTrend[];
  },

  async getMonthlyComparison() {
    const { data } = await apiClient.get('/analytics/monthly');
    return data.data;
  },

  async getFullDashboardData(timeframe: 'month' | 'quarter' | 'year' = 'month') {
    const { data } = await apiClient.get('/analytics/full', {
      params: { timeframe },
    });
    return data.data;
  },
};
