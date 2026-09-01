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

  async getAllReports(page = 1, limit = 20) {
    const response = await apiClient.get('/reports', { params: { page, limit } });
    return {
      reports: response.data.data as Report[],
      pagination: response.data.meta,
    };
  },

  async getReportById(id: string) {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data.data as Report;
  },

  async deleteReport(id: string) {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  },

  generatePDF(data: any, filename: string) {
    const element = document.createElement('div');
    element.innerHTML = `
      <h1>${filename}</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(element.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  },
};
