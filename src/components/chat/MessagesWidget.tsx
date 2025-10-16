import React, { useState } from 'react';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import ChannelList from '@/components/chat/ChannelList';
import ChatWindow from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { type ChatConversation } from '@/services/chat';

const MessagesWidget = () => {
  console.log('🎯 MessagesWidget component is rendering');
  // Temporary alert to confirm new component is loading
  React.useEffect(() => {
    console.log('🚨 NEW CHANNEL BROWSING WIDGET IS LOADING!');
  }, []);
  
  const [selectedChannel, setSelectedChannel] = useState<ChatConversation | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  console.log('🔐 Auth status - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <ResponsiveLayout>
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <ResponsiveLayout>
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">Please log in to access Rocket.Chat channels.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
          {/* Channel List Sidebar */}
          <div className="md:col-span-4 lg:col-span-3">
            <ChannelList
              selectedChannel={selectedChannel}
              onChannelSelect={setSelectedChannel}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Chat Window */}
          <div className="md:col-span-8 lg:col-span-9">
            {selectedChannel ? (
              <ChatWindow
                selectedChannel={selectedChannel}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-card rounded-lg border">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">Select a Channel</h3>
                  <p>Choose a channel from the sidebar to start viewing messages.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default MessagesWidget;