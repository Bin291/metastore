import { api } from '../api-client';

export interface NotificationDto {
  id: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export const notificationsService = {
  async listNotifications(): Promise<NotificationDto[]> {
    const response = await api.get<NotificationDto[]>('/notifications');
    return response || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch<void, void>(`/notifications/${notificationId}/read`);
  },
};
