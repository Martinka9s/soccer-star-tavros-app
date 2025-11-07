import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-lighter border-t border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-8 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} Soccer Star Tavros. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
