// Using native EventSource API

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  timestamp: string;
  avatar_url?: string;
}

interface RocketChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  avatar?: string;
}

class ChatService {
  private eventSource: EventSource | null = null;
  private messageListeners: Set<(message: Message) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  // Convert backend message to frontend format
  private convertMessage(chatMessage: ChatMessage, currentUserId?: string): Message {
    return {
      id: chatMessage.id,
      sender: chatMessage.username,
      content: chatMessage.message,
      timestamp: new Date(chatMessage.timestamp),
      isOwn: chatMessage.user_id === currentUserId,
      avatar: chatMessage.avatar_url
    };
  }

  // Send a message to the Rocket.Chat general channel
  async sendMessage(content: string): Promise<void> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/rocket-chat/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send message: ${error}`);
      }
    } catch (error) {
      console.error('Error sending message to Rocket.Chat:', error);
      throw error;
    }
  }

  // Get recent messages from Rocket.Chat general channel
  async getRecentMessages(limit: number = 50): Promise<Message[]> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/rocket-chat/general-messages?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Rocket.Chat messages received:', data);
        // Data is already in the correct Message format from backend
        return data.map((msg: RocketChatMessage) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          isOwn: msg.isOwn,
          avatar: msg.avatar
        }));
      } else {
        console.error('Failed to fetch messages:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching Rocket.Chat messages:', error);
    }
    
    return [];
  }

  // Get current user info
  private async getCurrentUser() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    
    return null;
  }

  // Start polling for new messages from Rocket.Chat
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMessageTimestamp: string | null = null;

  startListening(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No token available for chat connection');
      return;
    }

    // Stop existing polling
    this.stopListening();

    // Set initial connection status
    this.notifyConnectionListeners(true);
    console.log('Starting Rocket.Chat message polling');

    // Poll for new messages every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForNewMessages();
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 3000);
  }

  private async pollForNewMessages(): Promise<void> {
    try {
      const messages = await this.getRecentMessages(10); // Get last 10 messages
      
      if (messages.length > 0) {
        // Check if we have new messages
        const latestMessage = messages[messages.length - 1];
        const latestTimestamp = latestMessage.timestamp.toISOString();
        
        if (!this.lastMessageTimestamp) {
          // First time polling - don't notify about existing messages
          this.lastMessageTimestamp = latestTimestamp;
          console.log('Initial polling setup, timestamp set to:', latestTimestamp);
          return;
        }
        
        if (latestTimestamp > this.lastMessageTimestamp) {
          // Find new messages since last check
          const newMessages = messages.filter(msg => msg.timestamp.toISOString() > this.lastMessageTimestamp!);
          
          console.log(`Found ${newMessages.length} new messages since ${this.lastMessageTimestamp}`);
          
          // Notify listeners about new messages
          newMessages.forEach(message => {
            console.log('Notifying about new message:', message.id, message.content);
            this.notifyMessageListeners(message);
          });
          
          this.lastMessageTimestamp = latestTimestamp;
        }
      }
    } catch (error) {
      console.error('Error polling for new messages:', error);
      this.notifyConnectionListeners(false);
    }
  }

  // Stop polling for messages
  stopListening(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.notifyConnectionListeners(false);
      console.log('Stopped Rocket.Chat message polling');
    }
  }

  // Add message listener
  addMessageListener(callback: (message: Message) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  // Add connection status listener
  addConnectionListener(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // Notify message listeners
  private notifyMessageListeners(message: Message): void {
    this.messageListeners.forEach(callback => callback(message));
  }

  // Notify connection listeners
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => callback(connected));
  }

  // Check if connected (polling is active)
  isConnected(): boolean {
    return this.pollingInterval !== null;
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;