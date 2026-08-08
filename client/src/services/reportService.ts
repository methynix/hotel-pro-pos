import axiosInstance from './api';
import { Report, ApiResponse, PaginatedResponse } from '../types';

const REPORT_BASE_URL = '/reports';

export const reportService = {
  async getAllReports(params = {}) {
    const response = await axiosInstance.get<PaginatedResponse<Report>>(
      REPORT_BASE_URL,
      { params }
    );
    return response.data;
  },

  async getReportById(id: string) {
    const response = await axiosInstance.get<ApiResponse<Report>>(
      `${REPORT_BASE_URL}/${id}`
    );
    return response.data;
  },

  async generateReport(type: string, filters: Record<string, any>) {
    const response = await axiosInstance.post<ApiResponse<Report>>(
      `${REPORT_BASE_URL}/generate`,
      { type, ...filters }
    );
    return response.data;
  },

  async deleteReport(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${REPORT_BASE_URL}/${id}`
    );
    return response.data;
  },
};
