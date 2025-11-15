import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Trophy, Bell, ClipboardList, Users, LogOut, Home } from 'lucide-react';
import { User } from '../types';
import { googleCalendarService } from '../services/googleCalendarService';
import { teamService, notificationService } from '../services/firebaseService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLoginRequired: () => void;
  pendingCount?: number;
}

// Google Calendar Button Component
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
        <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-500 dark:text-gray-400">Google Calendar</span>
      </div>
      {isConnected ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-green-600 dark:text-green-400">✓ Connected</span>
          </div>
          {email && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 break-all">{email}</p>
          )}
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="text-xs text-[#6B2FB5] hover:text-[#5a2596] transition-colors"
        >
          Connect Calendar
        </button>
      )}
    </div>
  );
};

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
  const [pendingTeamsCount, setPendingTeamsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fetch pending teams count for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchPendingTeams = async () => {
        try {
          const pending = await teamService.getPendingTeams();
          setPendingTeamsCount(pending.length);
        } catch (error) {
          console.error('Error fetching pending teams:', error);
        }
      };
      fetchPendingTeams();
      const interval = setInterval(fetchPendingTeams, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    } else {
      setPendingTeamsCount(0);
    }
  }, [user]);

  // Fetch unread notifications count
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        try {
          const notifications = await notificationService.getNotificationsByUser(user.id);
          const unread = notifications.filter(n => !n.read).length;
          setUnreadNotificationsCount(unread);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
      
      // Listen for refresh events
      const handleRefreshNotifications = () => fetchUnreadCount();
      window.addEventListener('refresh-notifications', handleRefreshNotifications);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('refresh-notifications', handleRefreshNotifications);
      };
    } else {
      setUnreadNotificationsCount(0);
    }
  }, [user]);

  const handleNavigation = (tab: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      onClose();
      onLoginRequired();
      return;
    }
    
    // Trigger immediate refresh when navigating to teams or notifications
    if (tab === 'teams' && user?.role === 'admin') {
      teamService.getPendingTeams().then(pending => {
        setPendingTeamsCount(pending.length);
      }).catch(console.error);
    }
    
    if (tab === 'notifications' && user) {
      notificationService.getNotificationsByUser(user.id).then(notifications => {
        const unread = notifications.filter(n => !n.read).length;
        setUnreadNotificationsCount(unread);
      }).catch(console.error);
    }
    
    onNavigate(tab);
    onClose();
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: t('home'),
      icon: Home,
      requiresAuth: false,
      show: true,
    },
    {
      id: 'calendar',
      label: t('calendar'),
      icon: Calendar,
      requiresAuth: false,
      show: true,
    },
    {
      id: 'championships',
      label: t('championships'),
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
    },
    {
      id: 'pendingRequests',
      label: t('pendingRequests'),
      icon: Users,
      requiresAuth: true,
      show: user?.role === 'admin',
      hasDot: pendingCount > 0,
    },
    {
      id: 'teams',
      label: t('teams'),
      icon: Trophy,
      requiresAuth: true,
      show: user?.role === 'admin',
      hasDot: pendingTeamsCount > 0, // NEW: Show red dot for pending teams
    },
    {
      id: 'notifications',
      label: t('notifications'),
      icon: Bell,
      requiresAuth: true,
      show: true,
      hasDot: unreadNotificationsCount > 0, // NEW: Show red dot for unread notifications
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
        className={`fixed top-0 left-0 h-full w-80 bg-slate-50 dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <img src="/sst_logo.PNG" alt="Logo" className="h-10 w-auto" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('appName')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
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
                    : 'text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>

                {/* Red Dot Indicator */}
                {item.hasDot && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - User info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1e293b]">
          {user ? (
            <div className="p-4 space-y-3">
              {/* User Email & Admin Badge */}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('email')}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 mr-2">
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('teamName')}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.teamName}
                  </div>
                </div>
              )}

              {/* Google Calendar - Admin only */}
              {user.role === 'admin' && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <GoogleCalendarButton />
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={() => {
                  onClose();
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
