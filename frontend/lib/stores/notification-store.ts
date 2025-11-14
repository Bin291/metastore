import { create } from 'zustand';

export interface Notification {
  id: string;
  message: string;
  timestamp: Date;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (message: string) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = {
      id,
      message,
      timestamp: new Date(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 10), // Keep last 10
    }));
  },
  clearNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  clearAll: () => {
    set({ notifications: [] });
  },
}));
