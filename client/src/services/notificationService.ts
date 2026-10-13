import axiosInstance from './api';
import { ApiResponse, AppNotification } from '../types';

export const notificationService = {
  async list(limit = 30) {
    const { data } = await axiosInstance.get<ApiResponse<{ items: AppNotification[]; unread: number }>>(
      '/notifications',
      { params: { limit } }
    );
    return data.data;
  },
  markRead: (id: string) => axiosInstance.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosInstance.post('/notifications/read-all'),
};
