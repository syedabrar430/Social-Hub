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

  // Get all Rocket.Chat channels
  async getRocketChatChannels(): Promise<ChatConversation[]> {
    return this.request<ChatConversation[]>('/api/rocket-chat/channels');
  }

  // Get channels that have messages > 0
  async getChannelsWithMessages(): Promise<ChatConversation[]> {
    try {
      // First get all channels
      const allChannels = await this.getRocketChatChannels();
      
      // Filter channels with messages by checking if they have a last_message or message count
      const channelsWithMessages = allChannels.filter(channel => {
        // Channel has messages if it has a last_message or unread_count > 0
        return channel.last_message || (channel.unread_count && channel.unread_count > 0);
      });
      
      // For channels that don't have clear message indicators, 
      // we can do an additional check by trying to get their messages
      const finalChannels: ChatConversation[] = [];
      
      for (const channel of channelsWithMessages) {
        try {
          // Try to get messages for this channel
          const messages = await this.getRocketChatChannelMessages(
            channel.name || channel.id, 
            channel.type === 'private_group' ? 'group' : 'channel'
          );
          
          // Only include if it has messages
          if (messages && messages.length > 0) {
            finalChannels.push({
              ...channel,
              unread_count: messages.length // Update with actual message count
            });
          }
        } catch (error) {
          console.warn(`Failed to check messages for channel ${channel.name}:`, error);
          // If we can't check messages but it had a last_message, include it anyway
          if (channel.last_message) {
            finalChannels.push(channel);
          }
        }
      }
      
      return finalChannels;
    } catch (error) {
      console.error('Failed to get channels with messages:', error);
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
    channelType: string = "channel"
  ): Promise<{ success: boolean; message: string }> {
    const params = new URLSearchParams({
      channel_type: channelType,
    });
    
    return this.request<{ success: boolean; message: string }>(`/api/rocket-chat/send-channel-message/${encodeURIComponent(channelIdentifier)}?${params}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Get direct messages list
  async getDirectMessagesList(): Promise<ChatConversation[]> {
    try {
      const response = await this.request<{ dms: DirectMessageRoom[] }>('/api/rocket-chat/dm-list');
      
      // Transform DM list to ChatConversation format
      const conversations: ChatConversation[] = response.dms.map(dm => ({
        id: dm._id || dm.roomId || dm.name,
        type: 'direct_message',
        name: dm.name || dm.username || dm.usernames?.join(', '),
        display_name: dm.usernames?.filter((username: string) => username !== dm.myUsername).join(', ') || dm.name,
        description: `Direct message with ${dm.usernames?.filter((username: string) => username !== dm.myUsername).join(', ')}`,
        is_private: true,
        member_count: dm.usernames?.length || 2,
        joined: true,
        other_user: dm.usernames?.find((username: string) => username !== dm.myUsername),
        unread_count: dm.unread || 0,
        last_message: dm.lastMessage ? {
          id: dm.lastMessage._id,
          text: dm.lastMessage.msg,
          user: {
            id: dm.lastMessage.u?._id,
            name: dm.lastMessage.u?.name || dm.lastMessage.u?.username,
            username: dm.lastMessage.u?.username,
            avatar: dm.lastMessage.u?.avatarUrl
          },
          timestamp: dm.lastMessage.ts
        } : undefined
      }));

      return conversations;
    } catch (error) {
      console.error('Failed to get direct messages list:', error);
      throw error;
    }
  }

  // Get DMs that have messages > 0
  async getDirectMessagesWithMessages(): Promise<ChatConversation[]> {
    try {
      const allDMs = await this.getDirectMessagesList();
      
      // Filter DMs with messages by checking if they have a last_message or unread_count > 0
      const dmsWithMessages = allDMs.filter(dm => {
        return dm.last_message || (dm.unread_count && dm.unread_count > 0);
      });
      
      return dmsWithMessages;
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