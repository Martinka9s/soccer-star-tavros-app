import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Eye, EyeOff, Mail, Lock, Users } from 'lucide-react';
import { authService } from '../services/firebaseService';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, teamName: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onRegister }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const friendly = (code?: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return t('auth_email_in_use') || 'Email already in use. Try logging in or reset your password.';
      case 'auth/invalid-email':
        return t('auth_invalid_email') || 'Invalid email address.';
      case 'auth/weak-password':
        return t('auth_weak_password') || 'Password must be at least 6 characters long and include one uppercase letter, one lowercase letter, and one number.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later or reset your password.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      default:
        if (code === 'Team name is required') return code;
        return t(isLogin ? 'loginError' : 'registerError') || 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(email.trim(), password);
      } else {
        if (!teamName.trim()) {
          setErrorCode('Team name is required');
          setLoading(false);
          return;
        }
        await onRegister(email.trim(), password, teamName.trim());
      }
      // Don't close here - let parent handle it on success
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorCode(err?.code || err?.message || 'unknown');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setErrorCode(null);
    setInfo(null);
    if (!email) {
      setErrorCode('auth/invalid-email');
      return;
    }
    try {
      await authService.sendReset(email.trim());
      setInfo(t('reset_sent') || 'Password reset email sent. Check your inbox.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setErrorCode(err?.code || err?.message || 'unknown');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-lighter rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {t(isLogin ? 'loginTitle' : 'registerTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorCode && (
            <div className="p-3 bg-red-500/10 border border-red-500/60 rounded text-red-300 text-sm">
              {friendly(errorCode)}
              {(errorCode === 'auth/email-already-in-use' && !isLogin) && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setErrorCode(null);
                    }}
                    className="underline hover:text-red-200"
                  >
                    {t('signIn')}
                  </button>
                  <span className="mx-1 text-red-400">·</span>
                  <button 
                    type="button" 
                    onClick={handleReset} 
                    className="underline hover:text-red-200"
                  >
                    {t('send_reset_link') || 'Reset password'}
                  </button>
                </div>
              )}
              {(errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') && isLogin && (
                <div className="mt-2">
                  <button 
                    type="button" 
                    onClick={handleReset} 
                    className="underline hover:text-red-200"
                  >
                    {t('send_reset_link') || 'Forgot password?'}
                  </button>
                </div>
              )}
            </div>
          )}

          {info && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/60 rounded text-emerald-300 text-sm">
              {info}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {isLogin && (
              <div className="mt-1 text-right">
                <button 
                  type="button" 
                  onClick={handleReset} 
                  className="text-sm text-primary hover:text-primary-light transition-colors"
                >
                  {t('send_reset_link') || 'Forgot password?'}
                </button>
              </div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('teamName')}
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required={!isLogin}
                  className="w-full pl-10 pr-3 py-2 bg-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  placeholder="e.g., Eagles FC"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : t(isLogin ? 'signIn' : 'signUp')}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-400">
              {t(isLogin ? 'noAccount' : 'hasAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorCode(null);
                setInfo(null);
                setTeamName('');
              }}
              className="text-primary hover:text-primary-light transition-colors font-medium"
            >
              {t(isLogin ? 'signUp' : 'signIn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
