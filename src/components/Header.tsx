import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Calendar, Sun, Moon } from 'lucide-react';
import { User as UserType } from '../types';
import { useActiveBookings } from '../hooks/useActiveBookings';
import { googleCalendarService } from '../services/googleCalendarService';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  onAuthClick: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onAuthClick, activeTab, onTabChange, pendingCount = 0 }) => {
  const { t, i18n } = useTranslation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  // Use active bookings count for the red dot indicator
  const { activeCount } = useActiveBookings(user?.id, user?.teamName);

  // Google Calendar connection status (admin only)
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      setIsCalendarConnected(googleCalendarService.isConnected());
      setCalendarEmail(googleCalendarService.getConnectedEmail());
    }
  }, [user]);

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

  const handleCalendarConnect = () => {
    setShowProfileMenu(false);
    googleCalendarService.connect();
  };

  const handleCalendarDisconnect = () => {
    if (window.confirm('Disconnect Google Calendar? Bookings will no longer sync automatically.')) {
      googleCalendarService.clearTokens();
      setIsCalendarConnected(false);
      setCalendarEmail(null);
      setShowProfileMenu(false);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  // Get bookings label based on user role
  const getBookingsLabel = () => {
    if (!user) return t('myBookings');
    return user.role === 'admin' ? (t('bookings', { defaultValue: 'Bookings' })) : t('myBookings');
  };

  return (
    <header className="bg-slate-50 dark:bg-dark-lighter border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-none">
      {/* Top row */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-4">
            <a href="/" className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white hover:opacity-90" aria-label={t('appName') as string}>
              {t('appName')}
            </a>
          </div>

          {/* Desktop tabs */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => onTabChange('calendar')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-[#6B2FB5] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-dark hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-current={activeTab === 'calendar' ? 'page' : undefined}
              >
                {t('calendar')}
              </button>
              <button
                onClick={() => onTabChange('myBookings')}
                className={`px-4 py-2 rounded-lg transition-colors relative ${
                  activeTab === 'myBookings'
                    ? 'bg-[#6B2FB5] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-dark hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-current={activeTab === 'myBookings' ? 'page' : undefined}
              >
                {getBookingsLabel()}
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => onTabChange('pendingRequests')}
                  className={`px-4 py-2 rounded-lg transition-colors relative ${
                    activeTab === 'pendingRequests'
                      ? 'bg-[#6B2FB5] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-dark hover:text-gray-900 dark:hover:text-white'
                  }`}
                  aria-current={activeTab === 'pendingRequests' ? 'page' : undefined}
                >
                  {t('pendingRequests')}
                  {pendingCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
              )}
            </nav>
          )}

          {/* Right side controls */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Language toggle - Flag version for mobile */}
            <button
              onClick={toggleLanguage}
              aria-label="Language toggle EL/EN"
              className="text-2xl hover:scale-110 transition-transform md:hidden"
              title={isGreek ? 'Switch to English' : 'Αλλαγή σε Ελληνικά'}
            >
              {isGreek ? '🇬🇷' : '🇬🇧'}
            </button>

            {/* Language toggle - Slider version for desktop */}
            <button
              onClick={toggleLanguage}
              aria-label="Language toggle EL/EN"
              className="hidden md:flex relative h-9 w-24 rounded-lg bg-slate-100 dark:bg-dark border border-slate-300 dark:border-gray-700 items-center justify-between px-3 text-sm font-medium"
            >
              <span
                className={`absolute top-0.5 bottom-0.5 w-11 rounded-md bg-[#6B2FB5] transition-all ${
                  isGreek ? 'left-0.5' : 'right-0.5'
                }`}
              />
              <span className={`z-10 ${isGreek ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>EL</span>
              <span className={`z-10 ${!isGreek ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>EN</span>
            </button>

            {user ? (
              <>
                {/* Profile Menu - Mobile: Icon only with dropdown */}
                <div className="relative profile-menu-container md:hidden">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label="User menu"
                  >
                    <User size={20} />
                  </button>
                  
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-50 dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={16} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Email</span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white break-all">{user.email}</p>
                        {user.role === 'admin' && (
                          <span className="inline-block mt-2 text-xs bg-[#6B2FB5] dark:bg-primary px-2 py-1 rounded text-white">Admin</span>
                        )}
                      </div>

                      {/* Google Calendar - Admin only */}
                      {user.role === 'admin' && (
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Google Calendar</span>
                          </div>
                          {isCalendarConnected ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-green-600 dark:text-green-400">✓ Connected</span>
                              </div>
                              {calendarEmail && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-all">{calendarEmail}</p>
                              )}
                              <button
                                onClick={handleCalendarDisconnect}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                Disconnect
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleCalendarConnect}
                              className="text-xs text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light"
                            >
                              Connect Calendar
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-left text-gray-900 dark:text-white"
                      >
                        <LogOut size={18} />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile - Desktop: User pill + calendar + logout */}
                <div className="hidden md:flex items-center space-x-2">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 dark:bg-dark rounded-lg">
                    <User size={18} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-300">{user.email}</span>
                    {user.role === 'admin' && (
                      <span className="text-xs bg-[#6B2FB5] dark:bg-primary px-2 py-1 rounded text-white">Admin</span>
                    )}
                  </div>
                  
                  {/* Google Calendar Button - Admin Only */}
                  {user.role === 'admin' && (
                    <button
                      onClick={isCalendarConnected ? handleCalendarDisconnect : handleCalendarConnect}
                      className={`p-2 transition-colors ${
                        isCalendarConnected 
                          ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      title={isCalendarConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
                      aria-label={isCalendarConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
                    >
                      <Calendar size={20} />
                    </button>
                  )}
                  
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
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
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm md:text-base"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sub-bar (separate row under top bar) */}
      {user && (
        <div className="md:hidden border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-dark-lighter">
          <div className="container mx-auto px-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTabChange('calendar')}
                className={`px-4 py-2 rounded-lg text-center transition-colors text-sm ${
                  activeTab === 'calendar'
                    ? 'bg-[#6B2FB5] text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-dark hover:bg-slate-200 dark:hover:bg-dark/80 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-current={activeTab === 'calendar' ? 'page' : undefined}
              >
                {t('calendar')}
              </button>
              <button
                onClick={() => onTabChange('myBookings')}
                className={`px-4 py-2 rounded-lg text-center transition-colors text-sm relative ${
                  activeTab === 'myBookings'
                    ? 'bg-[#6B2FB5] text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-dark hover:bg-slate-200 dark:hover:bg-dark/80 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-current={activeTab === 'myBookings' ? 'page' : undefined}
              >
                {getBookingsLabel()}
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            {user.role === 'admin' && (
              <div className="mt-2">
                <button
                  onClick={() => onTabChange('pendingRequests')}
                  className={`w-full px-4 py-2 rounded-lg text-center transition-colors text-sm relative ${
                    activeTab === 'pendingRequests'
                      ? 'bg-[#6B2FB5] text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-slate-100 dark:bg-dark hover:bg-slate-200 dark:hover:bg-dark/80 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  aria-current={activeTab === 'pendingRequests' ? 'page' : undefined}
                >
                  {t('pendingRequests')}
                  {pendingCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
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
