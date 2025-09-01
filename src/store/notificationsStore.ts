import { create } from 'zustand';

// This store is now deprecated in favor of useNotifications hook
// Keeping it for backward compatibility during migration
interface NotificationsState {
  notifications: unknown[];
  unread: unknown[];
  markAllRead: () => void;
  markRead: (id: string) => void;
}
export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unread: [],
  markAllRead: () => {
    console.warn('useNotificationsStore is deprecated. Use useNotifications hook instead.');
    set({ notifications: [], unread: [] });
  },
  markRead: () => {
    console.warn('useNotificationsStore is deprecated. Use useNotifications hook instead.');
  },
}));
