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
  text?: string;
  content?: string;
  user: ChatUser;
  timestamp: string;
  type?: string; // 'system' for system messages, 'message' for user messages
  edited_at?: string;
  reactions?: Record<string, string[]>;
  thread_count?: number;
  thread_ts?: string; // Thread timestamp for Rocket.Chat
  thread_messages?: ChatMessage[]; // Thread messages
  reply_count?: number;
  is_thread_message?: boolean; // Flag to identify thread messages
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
  display_name?: string;
  description?: string;
  is_private?: boolean;
  member_count?: number;
  joined?: boolean;
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

export interface DirectMessageRoom {
  _id: string;
  roomId?: string;
  name?: string;
  username?: string;
  usernames?: string[];
  myUsername?: string;
  unread?: number;
  lastMessage?: {
    _id: string;
    msg: string;
    ts: string;
    u?: {
      _id: string;
      name?: string;
      username: string;
      avatarUrl?: string;
    };
  };
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

  // Get all Rocket.Chat channels (only channels, not groups)
  async getRocketChatChannels(): Promise<ChatConversation[]> {
    const response = await this.request<{channels: ChatConversation[], groups: ChatConversation[], direct_messages: ChatConversation[]}>('/api/rocket-chat/channels');
    return response.channels || [];
  }

  // Get all Rocket.Chat groups
  async getRocketChatGroups(): Promise<ChatConversation[]> {
    const response = await this.request<{channels: ChatConversation[], groups: ChatConversation[], direct_messages: ChatConversation[]}>('/api/rocket-chat/channels');
    return response.groups || [];
  }

  // Get all Rocket.Chat rooms (channels, groups, DMs)
  async getAllRocketChatRooms(): Promise<{channels: ChatConversation[], groups: ChatConversation[], direct_messages: ChatConversation[]}> {
    return this.request<{channels: ChatConversation[], groups: ChatConversation[], direct_messages: ChatConversation[]}>('/api/rocket-chat/channels');
  }

  // Get channels that have messages > 0
  async getChannelsWithMessages(): Promise<ChatConversation[]> {
    try {
      // First get all channels
      const allChannels = await this.getRocketChatChannels();
      
      // Return all channels - let the frontend handle display logic
      return allChannels;
    } catch (error) {
      console.error('Failed to get channels with messages:', error);
      throw error;
    }
  }

  // Get groups that have messages > 0
  async getGroupsWithMessages(): Promise<ChatConversation[]> {
    try {
      // First get all groups
      const allGroups = await this.getRocketChatGroups();
      
      // Return all groups - let the frontend handle display logic
      return allGroups;
    } catch (error) {
      console.error('Failed to get groups with messages:', error);
      throw error;
    }
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

  // Get messages from any Rocket.Chat channel
  async getRocketChatChannelMessages(
    channelIdentifier: string,
    channelType: string = "channel"
  ): Promise<ChatMessage[]> {
    const params = new URLSearchParams({
      channel_type: channelType,
    });
    
    return this.request<ChatMessage[]>(`/api/rocket-chat/channel-messages/${encodeURIComponent(channelIdentifier)}?${params}`);
  }

  // Send a message
  async sendMessage(channelName: string = "121", text: string): Promise<{ message: ChatMessage }> {
    return this.request<{ message: ChatMessage }>('/chat/send-to-channel', {
      method: 'POST',
      body: JSON.stringify({ channel_name: channelName, text }),
    });
  }

  // Send message to any Rocket.Chat channel
  async sendRocketChatChannelMessage(
    channelIdentifier: string,
    text: string,
    channelType: string = "channel",
    attachments: any[] = []
  ): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams({
      channel_type: channelType,
    });
    
    const requestBody = { 
      text,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    console.log('DEBUG: Service sending message with:', requestBody);
    
    return this.request<{ success: boolean; message: string }>(`/api/rocket-chat/send-channel-message/${encodeURIComponent(channelIdentifier)}?${params}`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // Get direct messages list
  async getDirectMessagesList(): Promise<ChatConversation[]> {
    try {
      const response = await this.request<{ dms: ChatConversation[] }>('/api/rocket-chat/dm-list');
      
      // Return the DMs from the response
      return response.dms || [];
    } catch (error) {
      console.error('Failed to get direct messages list:', error);
      throw error;
    }
  }

  // Get DMs that have messages > 0
  async getDirectMessagesWithMessages(): Promise<ChatConversation[]> {
    try {
      const allDMs = await this.getDirectMessagesList();
      
      // Return all DMs - let the frontend handle display logic
      return allDMs;
    } catch (error) {
      console.error('Failed to get DMs with messages:', error);
      throw error;
    }
  }

  // Get messages from a DM conversation
  async getDirectMessageMessages(username: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const params = new URLSearchParams({
        username,
        limit: limit.toString(),
      });
      
      return this.request<ChatMessage[]>(`/api/rocket-chat/dm-messages?${params}`);
    } catch (error) {
      console.error('Failed to get DM messages:', error);
      throw error;
    }
  }

  // Send direct message to a user
  async sendDirectMessage(username: string, text: string): Promise<{ success: boolean; message: string }> {
    try {
      return this.request<{ success: boolean; message: string }>('/api/rocket-chat/send-dm', {
        method: 'POST',
        body: JSON.stringify({ username, message: text }),
      });
    } catch (error) {
      console.error('Failed to send direct message:', error);
      throw error;
    }
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

  // Toggle reaction (add if not present, remove if present)
  async toggleReaction(messageId: string, emoji: string, currentReactions: Record<string, string[]> = {}): Promise<{ success: boolean }> {
    try {
      console.log('Toggling reaction:', { messageId, emoji, currentReactions });
      
      // Get current user identifier
      const currentUser = localStorage.getItem('user_email')?.split('@')[0] || 'unknown';
      const currentUsers = currentReactions[emoji] || [];
      const hasReaction = currentUsers.includes(currentUser);
      
      console.log('Current user:', currentUser, 'Has reaction:', hasReaction);
      
      // If user already has the reaction, remove it; otherwise add it
      const endpoint = hasReaction ? '/chat/remove-reaction' : '/chat/add-reaction';
      const result = await this.request<{ success: boolean }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ message_id: messageId, emoji }),
      });
      console.log('Toggle reaction result:', result);
      return result;
    } catch (error) {
      console.error('Toggle reaction error:', error);
      throw error;
    }
  }

  // Get thread messages for a parent message
  async getThreadMessages(parentMessageId: string): Promise<{ messages: ChatMessage[] }> {
    const params = new URLSearchParams({
      parent_message_id: parentMessageId,
    });
    
    return this.request<{ messages: ChatMessage[] }>(`/chat/thread-messages?${params}`);
  }

  // Send a message in a thread
  async sendThreadMessage(channelName: string, parentMessageId: string, text: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/rocket-chat/send-thread-message', {
      method: 'POST',
      body: JSON.stringify({ 
        roomId: channelName, 
        threadId: parentMessageId,
        content: text 
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