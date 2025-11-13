import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Lock } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onRegister }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (isLogin ? t('loginError') : t('registerError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-50 dark:bg-dark-lighter rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isLogin ? t('login') : t('register')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-dark rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email')}
            </label>
            <div className="relative">
              <Mail
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white"
                placeholder={t('emailPlaceholder')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <Lock
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#6B2FB5] focus:border-transparent text-gray-900 dark:text-white"
                placeholder={t('passwordPlaceholder')}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Info for Registration */}
          {!isLogin && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 After registration, you can join a championship by clicking "Join Championship" on the dashboard!
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#6B2FB5] hover:bg-[#5a2596] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('loading') : isLogin ? t('login') : t('register')}
          </button>

          {/* Toggle Login/Register */}
          <div className="text-center pt-4 border-t border-slate-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[#6B2FB5] dark:text-primary hover:text-[#5a2596] dark:hover:text-primary-light transition-colors"
            >
              {isLogin ? t('noAccount') : t('haveAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
