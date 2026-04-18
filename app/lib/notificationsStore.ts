import { create } from 'zustand';

interface NotificationsState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: (amount?: number) => void;
  resetNotifications: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  incrementUnread: (amount = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount + amount) })),
  resetNotifications: () => set({ unreadCount: 0 }),
}));