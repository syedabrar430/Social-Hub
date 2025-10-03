import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID } from '@/config/appwrite';

interface User {
  $id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  // Check for OAuth callback on page load
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') || window.location.hash.includes('success')) {
        // OAuth callback detected, check authentication
        await checkAuth();
      }
    };
    
    handleOAuthCallback();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser({
        $id: currentUser.$id,
        email: currentUser.email,
        name: currentUser.name || currentUser.email
      });
      setError('');
    } catch (error) {
      console.log('No active session');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Register with email and password (following demo pattern)
  const register = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setError('');
      setIsLoading(true);
      
      // Create account
      await account.create(ID.unique(), email, password, name);
      
      // Login after successful registration
      await login(email, password);
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email and password (following demo pattern)
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setError('');
      setIsLoading(true);
      
      // Create session
      await account.createEmailPasswordSession(email, password);
      
      // Get user details
      const userDetails = await account.get();
      setUser({
        $id: userDetails.$id,
        email: userDetails.email,
        name: userDetails.name || userDetails.email
      });
    } catch (error: any) {
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth login (exact demo pattern)
  const loginWithGoogle = async () => {
    try {
      setError('');
      // Redirect to Google OAuth (using correct port 8080)
      (account as any).createOAuth2Session(
        "google",
        "http://localhost:8080", // success redirect → back to your React app
        "http://localhost:8080"  // failure redirect
      );
    } catch (error: any) {
      setError(error.message || 'Google login failed');
    }
  };

  // Logout (following demo pattern)
  const logout = async (): Promise<void> => {
    try {
      setError('');
      await account.deleteSession('current');
      setUser(null);
    } catch (error: any) {
      setError(error.message || 'Logout failed');
      // Even if logout fails, clear local state
      setUser(null);
    }
  };

  const clearError = () => {
    setError('');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    loginWithGoogle,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
