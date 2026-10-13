import axiosInstance from './api';
import { ApiResponse, AuthUser, Organization } from '../types';
import { updateOne } from './crud';

export const organizationService = {
  /** Founds a new organization with the current user as admin and switches to it. */
  async create(name: string): Promise<AuthUser> {
    const { data } = await axiosInstance.post<ApiResponse<AuthUser>>('/organizations', { name });
    return data.data;
  },

  async getCurrent(): Promise<Organization> {
    const { data } = await axiosInstance.get<ApiResponse<Organization>>('/organizations/current');
    return data.data;
  },

  updateCurrent: (changes: Partial<Pick<Organization, 'name' | 'baseCurrency'>>) =>
    updateOne<Organization>('/organizations/current', changes),

  async switchTo(organizationId: string): Promise<AuthUser> {
    const { data } = await axiosInstance.post<ApiResponse<AuthUser>>('/auth/switch-organization', { organizationId });
    return data.data;
  },
};
