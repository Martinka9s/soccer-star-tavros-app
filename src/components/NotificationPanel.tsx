import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCheck } from 'lucide-react';
import { Notification } from '../types';
import { format } from 'date-fns';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onMarkAllRead,
}) => {
  const { t } = useTranslation();

  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-dark-lighter border border-gray-700 rounded-lg shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{t('notifications')}</h3>
        <div className="flex items-center space-x-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={onMarkAllRead}
              className="text-sm text-primary hover:text-primary-light transition-colors flex items-center space-x-1"
            >
              <CheckCheck size={16} />
              <span className="hidden sm:inline">{t('markAllRead')}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close notifications"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {t('noNotifications')}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-dark transition-colors ${
                  !notification.read ? 'bg-dark-darker' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      !notification.read ? 'bg-primary' : 'bg-gray-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(notification.createdAt, 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
