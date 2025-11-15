import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGoogleCalendarCallback } from './hooks/useGoogleCalendarCallback';
import { authService, bookingService } from './services/firebaseService';
import { TeamLevel, PreferredDay } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import MyBookings from './components/MyBookings';
import PendingRequests from './components/PendingRequests';
import TeamsManagement from './components/TeamsManagement';
import Championships from './components/Championships';
import NotificationsPage from './components/NotificationsPage';
import AuthModal from './components/AuthModal';
import TeamModal from './components/TeamModal';
import './i18n/config';

function App() {
  const { user, loading } = useAuth();
  useGoogleCalendarCallback();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('activeTab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTeamRegistrationModal, setShowTeamRegistrationModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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

  const handleRegister = async (email: string, password: string) => {
    await authService.register(email, password);
    setShowAuthModal(false);
    const newTab = 'myBookings';
    setActiveTab(newTab);
    try {
      sessionStorage.setItem('activeTab', newTab);
    } catch {}
  };

  const handleLogout = async () => {
    await authService.logout();
    const newTab = 'dashboard';
    setActiveTab(newTab);
    setPendingCount(0);
    setIsSidebarOpen(false);
    try {
      sessionStorage.setItem('activeTab', newTab);
    } catch {}
  };

  useEffect(() => {
    const handleSidebarLogout = () => {
      handleLogout();
    };
    window.addEventListener('sidebar-logout', handleSidebarLogout);
    return () => window.removeEventListener('sidebar-logout', handleSidebarLogout);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    try {
      sessionStorage.setItem('activeTab', tab);
    } catch {}
    
    if (tab !== 'pendingRequests' && user?.role === 'admin') {
      bookingService.getPendingBookings().then(bookings => {
        setPendingCount(bookings.length);
      });
    }
  };

  const handleTeamRegistration = async (
    teamName: string, 
    phoneNumber: string,
    teamLevel: TeamLevel,
    preferredDay: PreferredDay
  ) => {
    if (!user) return;
    
    try {
      const { teamService } = await import('./services/firebaseService');
      await teamService.createTeamRequest(
        user.id, 
        user.email, 
        teamName, 
        phoneNumber,
        teamLevel,
        preferredDay
      );
      alert('Team registration submitted! An admin will review your request.');
      setShowTeamRegistrationModal(false);
    } catch (error: any) {
      console.error('Error submitting team registration:', error);
      alert(error.message || 'Failed to submit team registration');
      throw error;
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
        {activeTab === 'dashboard' && (
          <Dashboard 
            onBookNowClick={() => handleTabChange('calendar')}
            onJoinChampionshipClick={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                setShowTeamRegistrationModal(true);
              }
            }}
          />
        )}
        {activeTab === 'calendar' && (
          <Calendar user={user} onLoginRequired={() => setShowAuthModal(true)} />
        )}
        {activeTab === 'myBookings' && user && <MyBookings user={user} />}
        {activeTab === 'pendingRequests' && user?.role === 'admin' && (
          <PendingRequests onCountChange={setPendingCount} />
        )}
        {activeTab === 'teams' && user?.role === 'admin' && (
          <TeamsManagement adminEmail={user.email} />
        )}
        {activeTab === 'championships' && (
          <Championships />
        )}
        {activeTab === 'notifications' && user && (
          <NotificationsPage user={user} />
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

      {showTeamRegistrationModal && user && (
        <TeamModal
          onClose={() => setShowTeamRegistrationModal(false)}
          onSubmit={handleTeamRegistration}
          userEmail={user.email}
          existingTeamName={user.teamName}
          existingPhone={user.phoneNumber}
        />
      )}
    </div>
  );
}

export default App;
