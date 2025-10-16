import React from 'react';
import Navbar from '@/components/ui/navbar';
import ChatWidget from '@/components/ui/chat-widget';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  showNavbar = true 
}) => {
  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}
      {showNavbar && <ChatWidget />}
      <main className={`${showNavbar ? 'pt-0' : ''}`}>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveLayout;