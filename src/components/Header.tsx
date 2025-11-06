import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, LogOut, User } from 'lucide-react';
import { User as UserType } from '../types';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../hooks/useNotifications';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  onAuthClick: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onAuthClick, activeTab, onTabChange }) => {
  const { t, i18n } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAllAsRead, refresh } = useNotifications(user?.id);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="bg-dark-lighter border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">{t('appName')}</h1>
          </div>

          {user && (
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => onTabChange('calendar')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
                }`}
              >
                {t('calendar')}
              </button>
              <button
                onClick={() => onTabChange('myBookings')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'myBookings'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
                }`}
              >
                {t('myBookings')}
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => onTabChange('pendingRequests')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'pendingRequests'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
                  }`}
                >
                  {t('pendingRequests')}
                </button>
              )}
            </nav>
          )}

          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded ${
                  i18n.language === 'en'
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('el')}
                className={`px-3 py-1 rounded ${
                  i18n.language === 'el'
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ΕΛ
              </button>
            </div>

            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <Bell size={24} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationPanel
                      notifications={notifications}
                      onClose={() => setShowNotifications(false)}
                      onMarkAllRead={markAllAsRead}
                      onRefresh={refresh}
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-dark rounded-lg">
                    <User size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-300">{user.email}</span>
                    {user.role === 'admin' && (
                      <span className="text-xs bg-primary px-2 py-1 rounded">Admin</span>
                    )}
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-300 hover:text-white transition-colors"
                    title={t('logout')}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onAuthClick}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>

        {user && (
          <nav className="md:hidden flex space-x-1 pb-2 overflow-x-auto">
            <button
              onClick={() => onTabChange('calendar')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
              }`}
            >
              {t('calendar')}
            </button>
            <button
              onClick={() => onTabChange('myBookings')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'myBookings'
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
              }`}
            >
              {t('myBookings')}
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => onTabChange('pendingRequests')}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === 'pendingRequests'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark-lighter hover:text-white'
                }`}
              >
                {t('pendingRequests')}
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
