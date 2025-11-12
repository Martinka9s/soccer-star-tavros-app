import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Menu } from 'lucide-react';
import { User as UserType } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  onAuthClick: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onAuthClick, onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

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
    <header className="bg-slate-50 dark:bg-dark-lighter border-b border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-none">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Burger Menu + Logo */}
          <div className="flex items-center space-x-3">
            {/* Burger Menu */}
            <button
              onClick={onMenuClick}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-dark"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo + Brand */}
            <a href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity" aria-label={t('appName') as string}>
              <img 
                src="/sst_logo.PNG" 
                alt="Soccer Star Logo" 
                className="h-8 md:h-10 w-auto"
              />
              <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {t('appName')}
              </span>
            </a>
          </div>

          {/* Right: Theme + Language only */}
          <div className="flex items-center space-x-2 md:space-x-3">
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
