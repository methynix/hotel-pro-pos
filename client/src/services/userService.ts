import axiosInstance from './api';
import { User, ApiResponse, PaginatedResponse } from '../types';

const USER_BASE_URL = '/users';

export const userService = {
  async getAllUsers(params = {}) {
    const response = await axiosInstance.get<PaginatedResponse<User>>(
      USER_BASE_URL,
      { params }
    );
    return response.data;
  },

  async getUserById(id: string) {
    const response = await axiosInstance.get<ApiResponse<User>>(
      `${USER_BASE_URL}/${id}`
    );
    return response.data;
  },

  async createUser(userData: Partial<User> & { password: string }) {
    const response = await axiosInstance.post<ApiResponse<User>>(
      USER_BASE_URL,
      userData
    );
    return response.data;
  },

  async updateUser(id: string, userData: Partial<User>) {
    const response = await axiosInstance.put<ApiResponse<User>>(
      `${USER_BASE_URL}/${id}`,
      userData
    );
    return response.data;
  },

  async deleteUser(id: string) {
    const response = await axiosInstance.delete<ApiResponse<void>>(
      `${USER_BASE_URL}/${id}`
    );
    return response.data;
  },
};
