import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { User } from '../types';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationsPageProps {
  user: User;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const { notifications, loading, refresh, markAllAsRead } = useNotifications(user.id);

  const formatWithLocale = (date: Date, formatStr: string) => {
    return format(date, formatStr, { locale: i18n.language === 'el' ? el : undefined });
  };

  useEffect(() => {
    refresh();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'cancelled':
        return '🚫';
      case 'match_scheduled':
      case 'booking':
        return '⚽';
      case 'team_approved':
        return '🎉';
      default:
        return '📢';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        {t('loading')}...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={32} className="text-[#6B2FB5] dark:text-primary" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('notifications')}
          </h2>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-[#6B2FB5] hover:bg-[#5a2596] text-white rounded-lg transition-colors"
          >
            <CheckCheck size={18} />
            <span>{t('markAllRead')}</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <Bell size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t('noNotifications')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-slate-50 dark:bg-dark-lighter border rounded-lg p-4 transition-all ${
                !notification.read
                  ? 'border-[#6B2FB5] dark:border-primary shadow-lg'
                  : 'border-slate-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <span className="text-3xl" aria-hidden="true">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Message */}
                  <p className="text-base text-gray-900 dark:text-white font-medium mb-2">
                    {notification.message}
                  </p>

                  {/* Details */}
                  {(notification.date || notification.startTime) && (
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {notification.date && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon size={14} />
                          <span>{notification.date}</span>
                        </div>
                      )}
                      {notification.startTime && (
                        <div className="flex items-center gap-1">
                          <span>🕐</span>
                          <span>{notification.startTime}</span>
                        </div>
                      )}
                      {notification.pitchType && (
                        <div className="flex items-center gap-1">
                          <span>⚽</span>
                          <span>{notification.pitchType}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {formatWithLocale(notification.createdAt, 'EEEE, MMM d, yyyy • HH:mm')}
                  </p>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6B2FB5] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6B2FB5]"></span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
