import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  education_school?: string;
  education_degree?: string;
  location?: string;
  phone?: string;
  profile_picture_url?: string;
}

interface ProfileUpdateData {
  full_name: string;
  bio?: string;
  education_school?: string;
  education_degree?: string;
  location?: string;
  phone?: string;
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
  updateProfile: (profileData: ProfileUpdateData) => Promise<void>;
  uploadProfilePicture: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Helper function to fix profile picture URLs that use wrong port
  const fixProfilePictureUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    // Replace port 8001 with 8000 to fix old URLs
    return url.replace('localhost:8001', 'localhost:8000');
  };

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('CheckAuth: Token found:', !!token);
      if (!token) {
        setUser(null);
        return;
      }

      // Verify token with backend
      console.log('CheckAuth: Verifying token with backend...');
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('CheckAuth: Response status:', response.status);
      if (response.ok) {
        const userData = await response.json();
        console.log('CheckAuth: User data received:', userData);
        const fixedProfilePictureUrl = fixProfilePictureUrl(userData.profile_picture_url);
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.full_name,  // Backend returns 'full_name', not 'name'
          bio: userData.bio,
          education_school: userData.education_school,
          education_degree: userData.education_degree,
          location: userData.location,
          phone: userData.phone,
          profile_picture_url: fixedProfilePictureUrl
        });
        setError('');
      } else {
        console.log('CheckAuth: Token invalid, removing from localStorage');
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } catch (error) {
      console.log('CheckAuth: Error during authentication:', error);
      
      // Only remove token for 401/403 errors, not network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('CheckAuth: Network error, keeping token for retry');
        // Don't remove token on network errors - could be temporary
        setUser(null); // Clear user but keep token for retry
      } else {
        console.log('CheckAuth: Authentication error, removing token');
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register with email and password using backend API
  const register = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setError('');
      setIsLoading(true);
      
      console.log('Register: Attempting registration with:', { email, name });
      
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: name || email.split('@')[0]
        })
      });

      console.log('Register: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Register: Error response:', errorData);
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      console.log('Register: Success response:', data);
      
      // Store token and user data
      localStorage.setItem('access_token', data.access_token);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name,  // Backend returns 'full_name', not 'name'
        bio: data.user.bio,
        education_school: data.user.education_school,
        education_degree: data.user.education_degree,
        location: data.user.location,
        phone: data.user.phone,
        profile_picture_url: fixProfilePictureUrl(data.user.profile_picture_url)
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
        name: data.user.full_name,  // Backend returns 'full_name', not 'name'
        bio: data.user.bio,
        education_school: data.user.education_school,
        education_degree: data.user.education_degree,
        location: data.user.location,
        phone: data.user.phone,
        profile_picture_url: fixProfilePictureUrl(data.user.profile_picture_url)
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

  // Update user profile
  const updateProfile = async (profileData: ProfileUpdateData): Promise<void> => {
    try {
      setError('');
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('UpdateProfile: Sending profile data:', profileData);
      
      const response = await fetch('http://localhost:8000/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Profile update failed');
      }

      const updatedUserData = await response.json();
      
      // Update local user state with new data
      setUser({
        id: updatedUserData.id,
        email: updatedUserData.email,
        name: updatedUserData.full_name,  // Backend returns 'full_name'
        bio: updatedUserData.bio,
        education_school: updatedUserData.education_school,
        education_degree: updatedUserData.education_degree,
        location: updatedUserData.location,
        phone: updatedUserData.phone,
        profile_picture_url: fixProfilePictureUrl(updatedUserData.profile_picture_url)
      });
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      setError(message);
      throw error;
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async (file: File): Promise<string> => {
    try {
      setError('');
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }


      
      const formData = new FormData();
      formData.append('file', file);


      const response = await fetch('http://localhost:8000/auth/upload-profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header - let browser set it for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Profile picture upload failed');
      }

      const uploadData = await response.json();
      
      // Update local user state with new profile picture URL
      if (user) {
        setUser({
          ...user,
          profile_picture_url: fixProfilePictureUrl(uploadData.profile_picture_url)
        });
      }
      
      return uploadData.profile_picture_url;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Profile picture upload failed';
      setError(message);
      throw error;
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
    updateProfile,
    uploadProfilePicture,
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
