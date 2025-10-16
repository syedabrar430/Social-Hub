import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, ExternalLink, X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RocketChatWidgetProps {
  className?: string;
}

const RocketChatWidget: React.FC<RocketChatWidgetProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rocketChatUrl, setRocketChatUrl] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const baseRocketChatUrl = 'http://10.68.0.49:30082';

  // Generate Rocket.Chat SSO URL for current user
  const generateRocketChatUrl = useCallback(async () => {
    if (!user || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access Rocket.Chat",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsLoading(true);
      
      // Call backend to get/create Rocket.Chat session for current user
      const response = await fetch('http://localhost:8000/api/rocket-chat/sso-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.rocketChatUrl || baseRocketChatUrl;
      } else {
        console.error('Failed to generate Rocket.Chat SSO URL');
        return baseRocketChatUrl;
      }
    } catch (error) {
      console.error('Error generating Rocket.Chat URL:', error);
      return baseRocketChatUrl;
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, toast]);

  const handleOpenRocketChat = async () => {
    const url = await generateRocketChatUrl();
    if (url) {
      // Open in new window/tab
      window.open(url, 'rocketchat', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      setIsOpen(false);
    }
  };

  const handleToggleWidget = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access Rocket.Chat",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(!isOpen);
  };

  // Update URL when user changes
  useEffect(() => {
    const updateUrl = async () => {
      if (user && isAuthenticated) {
        const url = await generateRocketChatUrl();
        setRocketChatUrl(url);
      } else {
        setRocketChatUrl(null);
      }
    };
    
    updateUrl();
  }, [user, isAuthenticated, generateRocketChatUrl]);

  return (
    <div className={`fixed top-20 right-4 z-50 ${className}`}>
      {/* Widget Button */}
      <Button
        onClick={handleToggleWidget}
        variant="default"
        size="sm"
        className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-orange-600 hover:bg-orange-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </Button>

      {/* Widget Popup */}
      {isOpen && (
        <Card className="absolute top-14 right-0 w-80 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-lg">Rocket.Chat</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-4">
              {isAuthenticated && user ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p>Logged in as: <span className="font-medium">{user.name}</span></p>
                    <p className="text-xs">{user.email}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleOpenRocketChat}
                      disabled={isLoading}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Open Rocket.Chat
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(baseRocketChatUrl, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <p><strong>Tip:</strong> Your Social Hub account will be automatically logged into Rocket.Chat!</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Please log in to your Social Hub account to access Rocket.Chat
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/login'}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RocketChatWidget;