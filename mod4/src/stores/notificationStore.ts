// MOD4 Notification Store
// Push notification and in-app alert management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 
  | 'dispatch_alert'
  | 'route_update'
  | 'urgent_message'
  | 'delivery_reminder'
  | 'system_update';

// Renamed to avoid conflict with global Notification
export interface NotificationStoreNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: NotificationStoreNotification[];
  unreadCount: number;
  pushEnabled: boolean;
  pushPermission: NotificationPermission;
  
  // Actions
  addNotification: (notification: Omit<NotificationStoreNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setPushEnabled: (enabled: boolean) => void;
  setPushPermission: (permission: NotificationPermission) => void;
  requestPushPermission: () => Promise<boolean>;
}

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      pushEnabled: false,
      pushPermission: 'default',

      addNotification: (notification) => {
        const newNotification: NotificationStoreNotification = {
          ...notification,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          unreadCount: state.unreadCount + 1,
        }));

        // Show native push if enabled and permission granted
        const { pushEnabled, pushPermission } = get();
        if (pushEnabled && pushPermission === 'granted') {
          showNativeNotification(newNotification);
        }
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount: notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        });
      },

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
      
      setPushPermission: (permission) => set({ pushPermission: permission }),

      requestPushPermission: async () => {
        if (!('Notification' in window)) {
          console.warn('[MOD4] Push notifications not supported');
          return false;
        }

        try {
          const permission = await Notification.requestPermission();
          set({ pushPermission: permission, pushEnabled: permission === 'granted' });
          return permission === 'granted';
        } catch (error) {
          console.error('[MOD4] Failed to request notification permission:', error);
          return false;
        }
      },
    }),
    {
      name: 'mod4-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Only persist last 50
        pushEnabled: state.pushEnabled,
      }),
    }
  )
);

// Show native browser notification
function showNativeNotification(notification: NotificationStoreNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const options: NotificationOptions = {
    body: notification.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: notification.id,
    requireInteraction: notification.priority === 'urgent',
    data: notification,
  };

  const nativeNotif = new Notification(notification.title, options);

  nativeNotif.onclick = () => {
    window.focus();
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    nativeNotif.close();
  };
}

// Mock notification functions removed - real notifications from Supabase Realtime
