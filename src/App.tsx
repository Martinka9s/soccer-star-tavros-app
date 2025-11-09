import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { authService, bookingService } from './services/firebaseService';
import Header from './components/Header';
import Footer from './components/Footer';
import Calendar from './components/Calendar';
import MyBookings from './components/MyBookings';
import PendingRequests from './components/PendingRequests';
import AuthModal from './components/AuthModal';
import './i18n/config';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
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
    try {
      await authService.login(email, password);
      setShowAuthModal(false);
      setActiveTab('myBookings');
    } catch (err) {
      console.error('Login error:', err);
      // Let AuthModal show its own error UI if it has one
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      await authService.register(email, password);
      setShowAuthModal(false);
      setActiveTab('myBookings');
    } catch (err) {
      console.error('Register error:', err);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveTab('calendar');
    setPendingCount(0);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Refresh pending count when navigating away from pending requests
    if (tab !== 'pendingRequests' && user?.role === 'admin') {
      bookingService.getPendingBookings().then(bookings => {
        setPendingCount(bookings.length);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        onAuthClick={() => setShowAuthModal(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
