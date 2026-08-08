import axiosInstance from './api';
import { Category, ApiResponse, PaginatedResponse } from '../types';

const CATEGORY_BASE_URL = '/categories';

export const categoryService = {
  async getAllCategories(params = {}) {
    const response = await axiosInstance.get<PaginatedResponse<Category>>(
      CATEGORY_BASE_URL,
      { params }
    );
    return response.data;
  },

  async getCategoryById(id: string) {
    const response = await axiosInstance.get<ApiResponse<Category>>(
      `${CATEGORY_BASE_URL}/${id}`
    );
    return response.data;
  },

  async createCategory(categoryData: Partial<Category>) {
    const response = await axiosInstance.post<ApiResponse<Category>>(
      CATEGORY_BASE_URL,
      categoryData
    );
    return response.data;
  },

  async updateCategory(id: string, categoryData: Partial<Category>) {
    const response = await axiosInstance.put<ApiResponse<Category>>(
      `${CATEGORY_BASE_URL}/${id}`,
      categoryData
    );
    return response.data;
  },

  async deleteCategory(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${CATEGORY_BASE_URL}/${id}`
    );
    return response.data;
  },
};
