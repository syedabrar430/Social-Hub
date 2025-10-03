import { useState } from 'react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    google: any;
  }
}

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initializeGoogleSignIn = () => {
    console.log('Initializing Google Sign-In...');
    console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('Current origin:', window.location.origin);
    
    if (window.google) {
      console.log('Google object found, initializing...');
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        console.log('Google Sign-In initialized successfully');
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
        toast({
          title: "Google Sign-In Error",
          description: "Failed to initialize Google Sign-In",
          variant: "destructive",
        });
      }
    } else {
      console.error('Google object not found');
      toast({
        title: "Google Sign-In Not Available",
        description: "Google Sign-In script not loaded",
        variant: "destructive",
      });
    }
  };

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const result = await apiService.googleAuth(response.credential);

      // Store token and user data
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('user', JSON.stringify(result.user));

      toast({
        title: "Welcome!",
        description: "Successfully signed in with Google.",
      });

      // Redirect to feed or dashboard
      window.location.href = '/feed';
      
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        title: "Authentication Failed",
        description: error.response?.data?.detail || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      toast({
        title: "Google Sign-In Not Available",
        description: "Please make sure Google Sign-In is loaded and try again.",
        variant: "destructive",
      });
    }
  };

  const renderGoogleButton = (containerId: string) => {
    console.log('Attempting to render Google button for:', containerId);
    
    if (window.google && window.google.accounts) {
      const element = document.getElementById(containerId);
      if (element) {
        console.log('Element found, rendering button...');
        try {
          window.google.accounts.id.renderButton(element, {
            theme: "outline",
            size: "large",
            text: "signup_with",
            shape: "rectangular",
            logo_alignment: "left"
          });
          console.log('Google button rendered successfully');
        } catch (error) {
          console.error('Error rendering Google button:', error);
        }
      } else {
        console.error('Element not found:', containerId);
      }
    } else {
      console.error('Google accounts object not available');
    }
  };

  return {
    isLoading,
    initializeGoogleSignIn,
    signInWithGoogle,
    renderGoogleButton,
  };
};
