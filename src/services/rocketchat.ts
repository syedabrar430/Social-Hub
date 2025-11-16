/**
 * RocketChat API Integration for posting messages
 */

const ROCKETCHAT_URL = 'http://10.68.0.49:30082';

export interface RocketChatMessage {
  roomId: string;
  text: string;
  emoji?: string;
  avatar?: string;
}

export interface RocketChatCredentials {
  authToken: string;
  userId: string;
}

class RocketChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ROCKETCHAT_URL;
  }

  /**
   * Post a message to a RocketChat room
   */
  async postMessage(
    message: RocketChatMessage,
    credentials: RocketChatCredentials
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': credentials.authToken,
          'X-User-Id': credentials.userId,
        },
        body: JSON.stringify({
          roomId: message.roomId,
          text: message.text,
          emoji: message.emoji,
          avatar: message.avatar,
        }),
      });

      if (!response.ok) {
        console.error('Failed to post message to RocketChat:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error posting message to RocketChat:', error);
      return false;
    }
  }

  /**
   * Post a meeting link to RocketChat
   */
  async postMeetingLink(
    roomId: string,
    meetingUrl: string,
    callType: string,
    credentials: RocketChatCredentials
  ): Promise<boolean> {
    const emoji = callType === 'audio' ? '📞' : callType === 'video' ? '📹' : '👥';
    const text = `${emoji} **${callType.charAt(0).toUpperCase() + callType.slice(1)} Call Started**\n\nJoin here: ${meetingUrl}`;

    return this.postMessage(
      {
        roomId,
        text,
      },
      credentials
    );
  }

  /**
   * Get RocketChat credentials from localStorage or user settings
   */
  getStoredCredentials(): RocketChatCredentials | null {
    const authToken = localStorage.getItem('rocketchat_auth_token');
    const userId = localStorage.getItem('rocketchat_user_id');

    if (authToken && userId) {
      return { authToken, userId };
    }

    return null;
  }

  /**
   * Store RocketChat credentials
   */
  storeCredentials(authToken: string, userId: string): void {
    localStorage.setItem('rocketchat_auth_token', authToken);
    localStorage.setItem('rocketchat_user_id', userId);
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    localStorage.removeItem('rocketchat_auth_token');
    localStorage.removeItem('rocketchat_user_id');
  }

  /**
   * Check if RocketChat is accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/info`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('RocketChat health check failed:', error);
      return false;
    }
  }
}

export const rocketChatService = new RocketChatService();
