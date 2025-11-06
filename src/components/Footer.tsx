import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, MapPin, Globe, Instagram, Facebook, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-dark-lighter border-t border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">{t('contact')}</h3>
            <div className="space-y-3">
              
                href="tel:6984478517"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <Phone size={18} />
                <span>6984478517</span>
              </a>
              
                href="https://www.google.com/maps?q=Alekou+Panagouli+1,+Tavros+177+78"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <MapPin size={18} />
                <span>Alekou Panagouli 1, Tavros 177 78</span>
              </a>
              
                href="https://soccerstartavros.gr/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-300 hover:text-primary transition-colors"
              >
                <Globe size={18} />
                <span>soccerstartavros.gr</span>
              </a>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">{t('followUs')}</h3>
            <div className="flex space-x-4">
              
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-dark hover:bg-primary text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                <Instagram size={24} />
              </a>
              
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-dark hover:bg-primary text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                <Facebook size={24} />
              </a>
              
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-dark hover:bg-primary text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                <Youtube size={24} />
              </a>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">{t('appName')}</h3>
            <p className="text-gray-400 text-sm">
              5x5 Football Pitch Booking System
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} Soccer Star Tavros. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
