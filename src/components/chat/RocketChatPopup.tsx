import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RocketChatPopupProps {
  channelName?: string;
}

const RocketChatPopup: React.FC<RocketChatPopupProps> = ({
  channelName = 'general'
}) => {
  const { user } = useAuth();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const authenticateWithRocketChat = async () => {
    if (!user) {
      setAuthError('User not logged in');
      return null;
    }

    try {
      setIsAuthenticating(true);
      setAuthError(null);

      // Get user credentials for Rocket.Chat
      const response = await fetch('/api/rocket-chat/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          username: user.username || user.email.split('@')[0]
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const authData = await response.json();
      return authData;
    } catch (error) {
      console.error('Rocket.Chat authentication error:', error);
      setAuthError('Failed to authenticate with Rocket.Chat');
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const openRocketChat = async () => {
    try {
      // Try to authenticate with Rocket.Chat first
      const authData = await authenticateWithRocketChat();
      
      let rocketChatUrl;
      
      if (authData && authData.token) {
        // Use authenticated URL if we have a token
        rocketChatUrl = `http://10.68.0.49:30082/channel/${channelName}?username=${encodeURIComponent(authData.username)}&token=${encodeURIComponent(authData.token)}`;
      } else {
        // Fallback: Open with login screen but pre-fill username
        const username = user?.username || user?.email?.split('@')[0] || 'user';
        rocketChatUrl = `http://10.68.0.49:30082/channel/${channelName}?username=${encodeURIComponent(username)}`;
      }
      
      const popup = window.open(
        rocketChatUrl,
        'rocketchat',
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (popup) {
        setIsPopupOpen(true);
        popup.focus();
        
        // Check if popup is closed
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            setIsPopupOpen(false);
            clearInterval(checkClosed);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error opening Rocket.Chat:', error);
      setAuthError('Failed to open Rocket.Chat');
    }
  };

  return (
    <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200">
      <div className="text-center max-w-md">
        <div className="text-blue-500 text-6xl mb-6">🚀</div>
        <h3 className="text-2xl font-bold text-blue-800 mb-4">Rocket.Chat Integration</h3>
        
        {user && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">
              <span className="font-semibold">Logged in as:</span> {user.username || user.email}
            </p>
          </div>
        )}
        
        <p className="text-blue-600 mb-6">
          Open Rocket.Chat in a new window for full functionality including real-time messaging, file sharing, and more.
        </p>
        
        {authError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-700 text-sm">
              <span className="font-semibold">Note:</span> {authError}. Rocket.Chat will open with login screen.
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-2">Features Available:</h4>
          <ul className="text-sm text-gray-600 text-left space-y-1">
            <li>✅ Real-time messaging</li>
            <li>✅ File sharing & attachments</li>
            <li>✅ Voice & video calls</li>
            <li>✅ Screen sharing</li>
            <li>✅ Threads & reactions</li>
            <li>✅ User presence indicators</li>
          </ul>
        </div>

        <button
          onClick={openRocketChat}
          disabled={isPopupOpen || isAuthenticating}
          className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            isPopupOpen
              ? 'bg-green-600 text-white cursor-not-allowed'
              : isAuthenticating
              ? 'bg-yellow-600 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
          }`}
        >
          {isAuthenticating ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Authenticating...
            </span>
          ) : isPopupOpen ? (
            <span className="flex items-center justify-center">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Rocket.Chat is Open
            </span>
          ) : (
            'Open Rocket.Chat'
          )}
        </button>

        {isPopupOpen && (
          <p className="text-sm text-green-600 mt-3">
            Rocket.Chat window is open. You can continue using your Social Hub while chatting.
          </p>
        )}
      </div>
    </div>
  );
};

export default RocketChatPopup;
