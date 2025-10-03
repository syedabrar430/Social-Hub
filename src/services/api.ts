const API_BASE_URL = 'http://localhost:8000';

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: {
    $id: string;
    email: string;
    full_name: string;
    bio?: string;
    education_school?: string;
    education_degree?: string;
    location?: string;
    phone?: string;
    profile_picture_url?: string;
    $createdAt: string;
    $updatedAt: string;
  };
  session?: {
    $id: string;
    userId: string;
    expire: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
}

export interface GoogleAuthData {
  userId: string;
  email: string;
  name: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add session token if available
    const sessionId = localStorage.getItem('session_id');
    const userId = localStorage.getItem('user_id');
    if (sessionId && userId) {
      config.headers = {
        ...config.headers,
        'X-Session-Token': sessionId,
        'X-User-ID': userId,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async googleAuth(googleData: GoogleAuthData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }

  async logout(): Promise<{ message: string }> {
    const result = { message: 'Logged out successfully' };
    
    // Clear tokens from localStorage  
    localStorage.removeItem('session_id');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user');
    
    return result;
  }

  async getProfile(userId?: string): Promise<AuthResponse['user']> {
    const currentUserId = userId || localStorage.getItem('user_id');
    if (!currentUserId) {
      throw new Error('User ID not found');
    }
    
    const response = await this.request<{ user: AuthResponse['user'] }>(`/auth/profile/${currentUserId}`);
    return response.user;
  }

  async updateProfile(profileData: { 
    full_name?: string; 
    bio?: string;
    education_school?: string;
    education_degree?: string;
    location?: string;
    phone?: string;
  }): Promise<AuthResponse['user']> {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      throw new Error('User ID not found');
    }

    const response = await this.request<{ user: AuthResponse['user'] }>(`/auth/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    
    // Update stored user data
    this.setUser(response.user);
    
    return response.user;
  }

  async uploadProfilePicture(file: File): Promise<{ message: string; profile_picture_url: string }> {
    const userId = localStorage.getItem('user_id');
    const sessionId = localStorage.getItem('session_id');
    
    if (!userId || !sessionId) {
      throw new Error('Authentication required');
    }

    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await fetch(`${this.baseURL}/auth/profile/${userId}/upload-picture`, {
      method: 'POST',
      headers: {
        'X-Session-Token': sessionId,
        'X-User-ID': userId,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || errorData.message || 'Failed to upload profile picture');
    }

    const result = await response.json();
    
    // Update user profile picture URL in localStorage
    const user = this.getUser();
    if (user) {
      user.profile_picture_url = result.profile_picture_url;
      this.setUser(user);
    }

    return result;
  }

  // Utility methods for session and user management
  setSession(sessionId: string, userId: string): void {
    localStorage.setItem('session_id', sessionId);
    localStorage.setItem('user_id', userId);
  }

  getSessionId(): string | null {
    return localStorage.getItem('session_id');
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  setUser(user: AuthResponse['user']): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): AuthResponse['user'] | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!(this.getSessionId() && this.getUserId());
  }

  clearAuth(): void {
    localStorage.removeItem('session_id');
    localStorage.removeItem('user_id'); 
    localStorage.removeItem('user');
  }
}

export const apiService = new ApiService();
