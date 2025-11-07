import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { authService } from './services/firebaseService';
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
        onTabChange={setActiveTab}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        {activeTab === 'calendar' && (
          <Calendar user={user} onLoginRequired={() => setShowAuthModal(true)} />
        )}
        {activeTab === 'myBookings' && user && <MyBookings user={user} />}
        {activeTab === 'pendingRequests' && user?.role === 'admin' && <PendingRequests />}
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
