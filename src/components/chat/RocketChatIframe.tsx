import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RocketChatIframeProps {
  roomId?: string;
  channelName?: string;
  height?: string;
  width?: string;
  showHeader?: boolean;
}

const RocketChatIframe: React.FC<RocketChatIframeProps> = ({
  roomId,
  channelName = 'general',
  height = '600px',
  width = '100%',
  showHeader = true
}) => {
  const { user } = useAuth();
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const generateIframeUrl = async () => {
      try {
        // Rocket.Chat server URL
        const rocketChatUrl = 'http://10.68.0.49:30082';
        
        // Build the iframe URL with embedded layout
        let url = `${rocketChatUrl}/channel/${channelName}?layout=embedded`;
        
        // Add additional parameters for better integration
        url += '&sidebar=hidden'; // Hide sidebar for cleaner look
        url += '&header=hidden'; // Hide header for embedded view
        
        // Add authentication parameters if user is logged in
        if (user) {
          // For now, we'll use the embedded layout without authentication
          // In production, you'd want to implement proper SSO
          url += `&username=${encodeURIComponent(user.username || user.email)}`;
        }
        
        setIframeUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating iframe URL:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    generateIframeUrl();
  }, [user, channelName, roomId]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Iframe Blocked</h3>
          <p className="text-red-600 mb-4">
            Rocket.Chat server has X-Frame-Options: sameorigin which prevents iframe embedding.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Solutions:</h4>
            <ul className="text-sm text-yellow-700 text-left space-y-1">
              <li>• Configure Rocket.Chat to allow iframe embedding</li>
              <li>• Use Rocket.Chat WebSocket API instead</li>
              <li>• Open Rocket.Chat in a new window</li>
            </ul>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => {
                window.open('http://10.68.0.49:30082/channel/general', '_blank');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open Rocket.Chat in New Window
            </button>
            <button 
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Rocket.Chat...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to http://10.68.0.49:30082</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {showHeader && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-800">Rocket.Chat Server</h4>
              <p className="text-sm text-blue-600">Channel: #{channelName}</p>
            </div>
            <div className="text-sm text-blue-600">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Connected
            </div>
          </div>
        </div>
      )}
      
      <iframe
        src={iframeUrl}
        width={width}
        height={height}
        frameBorder="0"
        className="rounded-lg shadow-lg border"
        title={`Rocket.Chat - ${channelName}`}
        allow="microphone; camera; geolocation; clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={() => {
          console.error('Failed to load Rocket.Chat iframe - likely due to X-Frame-Options: sameorigin');
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

export default RocketChatIframe;
