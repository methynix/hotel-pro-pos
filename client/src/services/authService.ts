import axiosInstance from './api';
import { AuthUser, LoginCredentials, AuthResponse, ApiResponse } from '../types';

const AUTH_BASE_URL = '/auth';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      `${AUTH_BASE_URL}/login`,
      credentials
    );
    return response.data;
  },

  async getCurrentUser() {
    const response = await axiosInstance.get<ApiResponse<AuthUser>>(
      `${AUTH_BASE_URL}/me`
    );
    return response.data;
  },

  async logout() {
    const response = await axiosInstance.post<ApiResponse<void>>(
      `${AUTH_BASE_URL}/logout`
    );
    return response.data;
  },

  setToken(token: string) {
    localStorage.setItem('token', token);
  },

  setRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
  },

  getToken() {
    return localStorage.getItem('token');
  },

  clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};
