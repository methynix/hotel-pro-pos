import axiosInstance from './api';
import { DashboardMetrics, ApiResponse } from '../types';

const DASHBOARD_BASE_URL = '/dashboard';

export const dashboardService = {
  async getMetrics(dateRange?: { startDate?: string; endDate?: string }) {
    const response = await axiosInstance.get<ApiResponse<DashboardMetrics>>(
      `${DASHBOARD_BASE_URL}/metrics`,
      { params: dateRange }
    );
    return response.data;
  },

  async getSummary() {
    const response = await axiosInstance.get<ApiResponse<any>>(
      `${DASHBOARD_BASE_URL}/summary`
    );
    return response.data;
  },

  async getTrendData(period: 'week' | 'month' | 'year') {
    const response = await axiosInstance.get<ApiResponse<any>>(
      `${DASHBOARD_BASE_URL}/trends`,
      { params: { period } }
    );
    return response.data;
  },
};
