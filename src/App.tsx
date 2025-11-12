import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuth';
import { useGoogleCalendarCallback } from './hooks/useGoogleCalendarCallback';
import { authService, bookingService } from './services/firebaseService';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Calendar from './components/Calendar';
import MyBookings from './components/MyBookings';
import PendingRequests from './components/PendingRequests';
import AuthModal from './components/AuthModal';
import './i18n/config';

function App() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  
  // Google Calendar OAuth callback handler
  useGoogleCalendarCallback();
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Load saved tab from sessionStorage or default to 'calendar'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('activeTab') || 'calendar';
    } catch {
      return 'calendar';
    }
  });
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending bookings count for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchPendingCount = async () => {
        try {
          const pendingBookings = await bookingService.getPendingBookings();
          setPendingCount(pendingBookings.length);
        } catch (error) {
          console.error('Error fetching pending count:', error);
        }
      };
      fetchPendingCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    } else {
      setPendingCount(0);
    }
  }, [user]);

  const handleLogin = async (email: string, password: string) => {
    await authService.login(email, password);
    setShowAuthModal(false);
    const newTab = 'myBookings';
    setActiveTab(newTab);
    try {
      sessionStorage.setItem('activeTab', newTab);
    } catch {}
  };

  const handleRegister = async (email: string, password: string, teamName: string) => {
    await authService.register(email, password, teamName);
    setShowAuthModal(false);
    const newTab = 'myBookings';
    setActiveTab(newTab);
    try {
      sessionStorage.setItem('activeTab', newTab);
    } catch {}
  };

  const handleLogout = async () => {
    await authService.logout();
    const newTab = 'calendar';
    setActiveTab(newTab);
    setPendingCount(0);
    try {
      sessionStorage.setItem('activeTab', newTab);
    } catch {}
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Save to sessionStorage
    try {
      sessionStorage.setItem('activeTab', tab);
    } catch {}
    
    // Refresh pending count when navigating away from pending requests
    if (tab !== 'pendingRequests' && user?.role === 'admin') {
      bookingService.getPendingBookings().then(bookings => {
        setPendingCount(bookings.length);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark flex flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        onAuthClick={() => setShowAuthModal(true)}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        activeTab={activeTab}
        onNavigate={handleTabChange}
        onLoginRequired={() => setShowAuthModal(true)}
        pendingCount={pendingCount}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        {activeTab === 'calendar' && (
          <Calendar user={user} onLoginRequired={() => setShowAuthModal(true)} />
        )}
        {activeTab === 'myBookings' && user && <MyBookings user={user} />}
        {activeTab === 'pendingRequests' && user?.role === 'admin' && (
          <PendingRequests onCountChange={setPendingCount} />
        )}
        {activeTab === 'championships' && (
          <div className="text-center py-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              🏆 Championships
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Coming soon! Championship management and tracking features.
            </p>
          </div>
        )}
        {activeTab === 'notifications' && user && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-50 dark:bg-dark-lighter border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm">
              <div className="p-6 border-b border-slate-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔔 {t('notifications')}
                </h2>
              </div>
              <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-lg">
                  {t('noNotifications')}
                </p>
                <p className="text-sm mt-2">
                  Notification history and updates will appear here.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}

export default App;
