import axiosInstance from './api';
import { tokenStorage } from '../utils/tokenStorage';
import {
  AuthUser,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ApiResponse,
  UserPreferences,
} from '../types';

const AUTH_BASE_URL = '/auth';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      `${AUTH_BASE_URL}/login`,
      credentials
    );
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      `${AUTH_BASE_URL}/register`,
      data
    );
    return response.data;
  },

  async getCurrentUser() {
    const response = await axiosInstance.get<ApiResponse<AuthUser>>(
      `${AUTH_BASE_URL}/me`
    );
    return response.data;
  },

  async updateProfile(data: { name?: string; email?: string; preferences?: Partial<UserPreferences> }) {
    const response = await axiosInstance.patch<ApiResponse<AuthUser>>(`${AUTH_BASE_URL}/me`, data);
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await axiosInstance.post(`${AUTH_BASE_URL}/change-password`, { currentPassword, newPassword });
  },

  async logout() {
    const response = await axiosInstance.post<ApiResponse<void>>(
      `${AUTH_BASE_URL}/logout`
    );
    return response.data;
  },

  setToken(token: string, remember: boolean) {
    tokenStorage.set(token, remember);
  },

  getToken() {
    return tokenStorage.get();
  },

  clearTokens() {
    tokenStorage.clear();
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};
