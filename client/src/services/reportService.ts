import apiClient from './api';
import { Report } from '../types/index';

export const reportService = {
  async generateIncomeStatement(startDate: string, endDate: string) {
    const response = await apiClient.post('/reports/income-statement', { startDate, endDate });
    return response.data.data;
  },

  async generateCashFlowStatement(startDate: string, endDate: string) {
    const response = await apiClient.post('/reports/cash-flow', { startDate, endDate });
    return response.data.data;
  },

  async generateBalanceSheet() {
    const response = await apiClient.post('/reports/balance-sheet', {});
    return response.data.data;
  },

  async generateTaxSummary(startDate: string, endDate: string) {
    const response = await apiClient.post('/reports/tax-summary', { startDate, endDate });
    return response.data.data;
  },

  async generateComprehensiveReport(startDate: string, endDate: string) {
    const response = await apiClient.post('/reports/comprehensive', { startDate, endDate });
    return response.data.data;
  },

  async getAllReports(page = 1, limit = 50) {
    const response = await apiClient.get('/reports', { params: { page, limit } });
    return response.data.data as Report[];
  },

  async getReportById(id: string) {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data.data as Report;
  },

  async deleteReport(id: string) {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  },
};
