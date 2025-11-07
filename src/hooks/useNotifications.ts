import { useEffect, useMemo, useState } from 'react';
import { notificationService } from '../services/firebaseService';
import type { Notification } from '../types';

export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Derive unread count safely
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  // Load once (pull) – only when we have a valid userId
  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await notificationService.getNotificationsByUser(userId);
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  };

  // Don’t create any Firestore listeners if there’s no user yet
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    // initial load
    refresh();
    // You can add a real-time onSnapshot here later if you want,
    // but guard it with `if (!userId) return;`
  }, [userId]);

  // Mark-all as read
  const markAllAsRead = async () => {
    if (!userId || notifications.length === 0) return;
    await notificationService.markAllAsRead(userId);
    // update local state optimistically
    setNotifications(curr => curr.map(n => ({ ...n, read: true })));
  };

  return { notifications, unreadCount, loading, refresh, markAllAsRead };
}
