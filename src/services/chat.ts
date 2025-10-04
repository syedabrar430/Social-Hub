const API_BASE_URL = 'http://localhost:8000';

export interface ChatBootstrapResponse {
  rocket_username: string;
  provisioned: boolean;
  message: string;
}

export interface ChatUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  user: ChatUser;
  timestamp: string;
  edited_at?: string;
  reactions?: Record<string, string[]>;
  thread_count?: number;
  thread_ts?: string; // Thread timestamp for Rocket.Chat
  reply_count?: number;
  file?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  };
  attachments?: Array<{
    id: string;
    title: string;
    image_url?: string;
    type: string;
    size: number;
  }>;
}

export interface ChatConversation {
  id: string;
  type: string;
  name: string;
  other_user?: string;
  last_message?: ChatMessage;
  unread_count: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: string;
  lastMessage?: ChatMessage;
}

class ChatService {
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

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chat API request failed:', error);
      throw error;
    }
  }

  // Bootstrap Rocket.Chat user (setup)
  async bootstrap(): Promise<ChatBootstrapResponse> {
    return this.request<ChatBootstrapResponse>('/chat/setup');
  }

  // Get user conversations
  async getConversations(): Promise<{ conversations: ChatConversation[] }> {
    return this.request<{ conversations: ChatConversation[] }>('/chat/conversations');
  }

  // Start direct message with a user
  async startDirectMessage(targetUsername: string): Promise<{ room: ChatRoom }> {
    return this.request<{ room: ChatRoom }>('/chat/start', {
      method: 'POST',
      body: JSON.stringify({ target_username: targetUsername }),
    });
  }

  // Get messages from a channel
  async getMessages(
    channelName: string = "121"
  ): Promise<{ messages: ChatMessage[] }> {
    const params = new URLSearchParams({
      channel_name: channelName,
    });
    
    return this.request<{ messages: ChatMessage[] }>(`/chat/channel-messages?${params}`);
  }

  // Send a message
  async sendMessage(channelName: string = "121", text: string): Promise<{ message: ChatMessage }> {
    return this.request<{ message: ChatMessage }>('/chat/send-to-channel', {
      method: 'POST',
      body: JSON.stringify({ channel_name: channelName, text }),
    });
  }

  // Search users
  async searchUsers(query: string): Promise<{ users: ChatUser[] }> {
    const params = new URLSearchParams({ q: query });
    return this.request<{ users: ChatUser[] }>(`/chat/users/search?${params}`);
  }

  // Add reaction to a message
  async addReaction(messageId: string, emoji: string): Promise<{ success: boolean }> {
    try {
      console.log('Adding reaction:', { messageId, emoji });
      const result = await this.request<{ success: boolean }>('/chat/add-reaction', {
        method: 'POST',
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      console.log('Reaction result:', result);
      return result;
    } catch (error) {
      console.error('Add reaction error details:', {
        messageId,
        emoji,
        error: error instanceof Error ? error.message : String(error),
        token: localStorage.getItem('access_token') ? 'present' : 'missing'
      });
      throw error;
    }
  }

  // Remove reaction from a message
  async removeReaction(messageId: string, emoji: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/chat/remove-reaction', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, emoji }),
    });
  }

  // Get thread messages for a parent message
  async getThreadMessages(parentMessageId: string): Promise<{ messages: ChatMessage[] }> {
    const params = new URLSearchParams({
      parent_message_id: parentMessageId,
    });
    
    return this.request<{ messages: ChatMessage[] }>(`/chat/thread-messages?${params}`);
  }

  // Send a message in a thread
  async sendThreadMessage(channelName: string, parentMessageId: string, text: string): Promise<{ message: ChatMessage }> {
    return this.request<{ message: ChatMessage }>('/chat/send-thread-message', {
      method: 'POST',
      body: JSON.stringify({ 
        channel_name: channelName, 
        parent_message_id: parentMessageId,
        text 
      }),
    });
  }

  // Send an image
  async sendImage(channelName: string, imageFile: File): Promise<{ message: ChatMessage }> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('channel_name', channelName);

    // Add auth token for form data request
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send image:', error);
      throw error;
    }
  }

  // Utility methods
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const chatService = new ChatService();