import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
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

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        return;
      }

      // Verify token with backend
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name
        });
        setError('');
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } catch (error) {
      console.log('No active session');
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Register with email and password using backend API
  const register = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setError('');
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name || email.split('@')[0]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Store token and user data
      localStorage.setItem('access_token', data.access_token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email and password using backend API
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setError('');
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store token and user data
      localStorage.setItem('access_token', data.access_token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth login using backend API
  const loginWithGoogle = async () => {
    try {
      setError('');
      // For now, we'll disable Google OAuth. You can implement it later if needed.
      setError('Google login is not implemented yet. Please use email/password login.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      setError(message);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      setError('');
      // Clear local storage
      localStorage.removeItem('access_token');
      setUser(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      setError(message);
      // Even if logout fails, clear local state
      localStorage.removeItem('access_token');
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
