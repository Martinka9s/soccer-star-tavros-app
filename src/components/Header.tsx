import React, { useEffect, useState } from 'react';
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

  // Ensure Greek default if nothing stored
  useEffect(() => {
    const lng = i18n.language;
    if (!lng || (!lng.startsWith('el') && !lng.startsWith('en'))) {
      i18n.changeLanguage('el');
    }
  }, [i18n]);

  const isGreek = i18n.language?.startsWith('el');

  const toggleLanguage = () => {
    const next = isGreek ? 'en' : 'el';
    i18n.changeLanguage(next);
    try {
      localStorage.setItem('i18nextLng', next);
    } catch {}
  };

  return (
    <header className="bg-dark-lighter border-b border-gray-700">
      {/* Top row */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-4">
            <a href="/" className="text-2xl font-bold text-white hover:opacity-90" aria-label={t('appName') as string}>
              {t('appName')}
            </a>
          </div>

          {/* Desktop tabs (in top row) */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => onTabChange('calendar')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark hover:text-white'
                }`}
                aria-current={activeTab === 'calendar' ? 'page' : undefined}
              >
                {t('calendar')}
              </button>
              <button
                onClick={() => onTabChange('myBookings')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'myBookings'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark hover:text-white'
                }`}
                aria-current={activeTab === 'myBookings' ? 'page' : undefined}
              >
                {t('myBookings')}
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => onTabChange('pendingRequests')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'pendingRequests'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:bg-dark hover:text-white'
                  }`}
                  aria-current={activeTab === 'pendingRequests' ? 'page' : undefined}
                >
                  {t('pendingRequests')}
                </button>
              )}
            </nav>
          )}

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              aria-label="Language toggle EL/EN"
              className="relative h-9 w-24 rounded-lg bg-dark border border-gray-700 flex items-center justify-between px-3 text-sm font-medium"
            >
              <span
                className={`absolute top-0.5 bottom-0.5 w-11 rounded-md bg-primary transition-all ${
                  isGreek ? 'left-0.5' : 'right-0.5'
                }`}
              />
              <span className={`z-10 ${isGreek ? 'text-white' : 'text-gray-300'}`}>EL</span>
              <span className={`z-10 ${!isGreek ? 'text-white' : 'text-gray-300'}`}>EN</span>
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-300 hover:text-white transition-colors"
                    aria-label={t('notifications') as string}
                  >
                    <Bell size={24} />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                        aria-label={`${unreadCount} unread notifications`}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationPanel
                      notifications={notifications}
                      onClose={() => setShowNotifications(false)}
                      onMarkAllAsRead={markAllRead}
                      onRefresh={refresh}
                    />
                  )}
                </div>

                {/* User pill + logout */}
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
                    title={t('logout') as string}
                    aria-label={t('logout') as string}
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
      </div>

      {/* Mobile sub-bar (separate row under top bar) */}
      {user && (
        <div className="md:hidden border-t border-gray-700 bg-dark-lighter">
          <div className="container mx-auto px-4 py-2">
            {/* two main tabs side-by-side */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTabChange('calendar')}
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 bg-dark hover:bg-dark/80 hover:text-white'
                }`}
                aria-current={activeTab === 'calendar' ? 'page' : undefined}
              >
                {t('calendar')}
              </button>
              <button
                onClick={() => onTabChange('myBookings')}
                className={`px-4 py-2 rounded-lg text-center transition-colors ${
                  activeTab === 'myBookings'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 bg-dark hover:bg-dark/80 hover:text-white'
                }`}
                aria-current={activeTab === 'myBookings' ? 'page' : undefined}
              >
                {t('myBookings')}
              </button>
            </div>

            {/* admin-only third button below */}
            {user.role === 'admin' && (
              <div className="mt-2">
                <button
                  onClick={() => onTabChange('pendingRequests')}
                  className={`w-full px-4 py-2 rounded-lg text-center transition-colors ${
                    activeTab === 'pendingRequests'
                      ? 'bg-primary text-white'
                      : 'text-gray-300 bg-dark hover:bg-dark/80 hover:text-white'
                  }`}
                  aria-current={activeTab === 'pendingRequests' ? 'page' : undefined}
                >
                  {t('pendingRequests')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
