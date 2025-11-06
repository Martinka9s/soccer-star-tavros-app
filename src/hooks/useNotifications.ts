import { useState, useEffect } from 'react';
import { Notification } from '../types';
import { notificationService } from '../services/firebaseService';

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const userNotifications = await notificationService.getNotificationsByUser(userId);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const refresh = () => {
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      await notificationService.markAllAsRead(userId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const unreadCount = notificationService.getUnreadCount(notifications);

  return { notifications, loading, refresh, markAllAsRead, unreadCount };
};
