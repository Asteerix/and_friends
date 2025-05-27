import { create } from "zustand";
import notificationsData from "../data/notifications.json";
import type {
  Notification,
  NotificationType,
} from "../components/notifications/NotificationItem";

interface NotificationsState {
  notifications: Notification[];
  unread: Notification[];
  markAllRead: () => void;
  markRead: (id: string) => void;
}

const validTypes: NotificationType[] = ["invite", "follow", "rsvp", "message"];
const notificationsTyped: Notification[] = (
  notificationsData as Notification[]
).filter((n) => validTypes.includes(n.type as NotificationType));

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: notificationsTyped,
  unread: notificationsTyped.filter((n) => !n.read),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unread: [],
    })),
  markRead: (id: string) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unread: notifications.filter((n) => !n.read),
      };
    }),
}));
