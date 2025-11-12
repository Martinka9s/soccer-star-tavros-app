import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Trophy, Bell, ClipboardList, Users, LogOut } from 'lucide-react';
import { User } from '../types';
import { googleCalendarService } from '../services/googleCalendarService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLoginRequired: () => void;
  pendingCount?: number;
}

// Google Calendar Button Component (for admin)
const GoogleCalendarButton: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setIsConnected(googleCalendarService.isConnected());
    setEmail(googleCalendarService.getConnectedEmail());
  }, []);

  const handleConnect = () => {
    googleCalendarService.connect();
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect Google Calendar? Bookings will no longer sync automatically.')) {
      googleCalendarService.clearTokens();
      setIsConnected(false);
      setEmail(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={16} className="text-gray-400" />
        <span className="text-xs text-gray-400">Google Calendar</span>
      </div>
      {isConnected ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-green-400">✓ Connected</span>
          </div>
          {email && (
            <p className="text-xs text-gray-400 mb-2 break-all">{email}</p>
          )}
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="text-xs text-[#6B2FB5] hover:text-[#8b4fd9] transition-colors"
        >
          Connect Calendar
        </button>
      )}
    </div>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLoginRequired: () => void;
  pendingCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  user,
  activeTab,
  onNavigate,
  onLoginRequired,
  pendingCount = 0,
}) => {
  const { t } = useTranslation();

  const handleNavigation = (tab: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      onClose();
      onLoginRequired();
      return;
    }
    onNavigate(tab);
    onClose();
  };

  const menuItems = [
    {
      id: 'calendar',
      label: t('calendar'),
      icon: Calendar,
      requiresAuth: false,
      show: true,
    },
    {
      id: 'championships',
      label: t('championships', { defaultValue: 'Championships' }),
      icon: Trophy,
      requiresAuth: false,
      show: true,
    },
    {
      id: 'myBookings',
      label: user?.role === 'admin' ? t('bookings') : t('myBookings'),
      icon: ClipboardList,
      requiresAuth: true,
      show: true,
      badge: user?.role === 'admin' ? undefined : undefined, // Can add badge later if needed
    },
    {
      id: 'pendingRequests',
      label: t('pendingRequests'),
      icon: Users,
      requiresAuth: true,
      show: user?.role === 'admin',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'notifications',
      label: t('notifications'),
      icon: Bell,
      requiresAuth: true,
      show: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-[#1e293b] dark:bg-[#1e293b] border-r border-slate-700 dark:border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img src="/sst_logo.PNG" alt="Logo" className="h-10 w-auto" />
            <h2 className="text-lg font-bold text-white">
              {t('appName')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            if (!item.show) return null;

            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id, item.requiresAuth)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#6B2FB5] text-white shadow-lg'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>

                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}

                {/* Lock icon for auth-required items when logged out */}
                {item.requiresAuth && !user && (
                  <span className="text-xs opacity-60">🔒</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - User info with all functions */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 dark:border-gray-700 bg-[#1e293b] dark:bg-[#1e293b]">
          {user ? (
            <div className="p-4 space-y-3">
              {/* User Email & Admin Badge */}
              <div>
                <div className="text-xs text-gray-400 mb-1">
                  {t('email')}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white break-all flex-1 mr-2">
                    {user.email}
                  </div>
                  {user.role === 'admin' && (
                    <span className="inline-block text-xs bg-[#6B2FB5] px-2 py-1 rounded text-white flex-shrink-0">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Team Name */}
              {user.teamName && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {t('teamName')}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {user.teamName}
                  </div>
                </div>
              )}

              {/* Google Calendar - Admin only */}
              {user.role === 'admin' && (
                <div className="pt-2 border-t border-slate-700">
                  <GoogleCalendarButton />
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={() => {
                  onClose();
                  // Call logout from parent
                  window.dispatchEvent(new CustomEvent('sidebar-logout'));
                }}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut size={18} />
                <span>{t('logout')}</span>
              </button>
            </div>
          ) : (
            <div className="p-4">
              <button
                onClick={() => {
                  onClose();
                  onLoginRequired();
                }}
                className="w-full px-4 py-3 bg-[#6B2FB5] hover:bg-[#5a2596] text-white rounded-lg font-medium transition-colors"
              >
                {t('login')}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
