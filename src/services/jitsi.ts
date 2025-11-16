/**
 * Jitsi Meet Integration Service
 * Handles audio calls, video calls, and conferences using Jitsi Meet
 */

// Use HTTPS for proper browser permissions (mic/camera)
// If your Jitsi server doesn't have HTTPS, you need to:
// 1. Use the public Jitsi server (meet.jit.si) OR
// 2. Set up HTTPS on your local server OR  
// 3. Use localhost instead of IP (browsers allow localhost)
const JITSI_SERVER_URL = 'https://meet.jit.si'; // Using public Jitsi for browser permissions

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
  CONFERENCE = 'conference'
}

export interface JitsiCallOptions {
  type: CallType;
  roomName?: string;
  userName?: string;
  userEmail?: string;
  startWithVideoMuted?: boolean;
  startWithAudioMuted?: boolean;
}

class JitsiService {
  private serverUrl: string;

  constructor() {
    this.serverUrl = JITSI_SERVER_URL;
  }

  /**
   * Generate a unique room name
   */
  private generateRoomName(type: CallType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Build Jitsi Meet URL with configuration
   */
  private buildJitsiUrl(options: JitsiCallOptions): string {
    const roomName = options.roomName || this.generateRoomName(options.type);
    let url = `${this.serverUrl}/${roomName}`;

    // Add configuration parameters
    const params: string[] = [];

    // Add user info if provided
    if (options.userName) {
      params.push(`userInfo.displayName=${encodeURIComponent(options.userName)}`);
    }
    if (options.userEmail) {
      params.push(`userInfo.email=${encodeURIComponent(options.userEmail)}`);
    }

    // Common configurations for better UX
    params.push('config.prejoinPageEnabled=false'); // Skip pre-join page, join directly
    params.push('config.disableDeepLinking=true'); // Don't try to open in app
    params.push('config.enableWelcomePage=false'); // Skip welcome page
    params.push('config.requireDisplayName=false'); // Don't require name again
    
    // Configure based on call type
    switch (options.type) {
      case CallType.AUDIO:
        params.push('config.startWithVideoMuted=true');
        params.push('config.startVideoMuted=true');
        params.push('config.startWithAudioMuted=false'); // Unmute audio by default
        break;
      case CallType.VIDEO:
        params.push('config.startWithVideoMuted=false');
        params.push('config.startWithAudioMuted=false'); // Unmute both by default
        break;
      case CallType.CONFERENCE:
        params.push('config.startWithVideoMuted=false');
        params.push('config.startWithAudioMuted=false');
        break;
    }

    // Add custom mute settings if provided (override defaults)
    if (options.startWithVideoMuted !== undefined) {
      params.push(`config.startWithVideoMuted=${options.startWithVideoMuted}`);
    }
    if (options.startWithAudioMuted !== undefined) {
      params.push(`config.startWithAudioMuted=${options.startWithAudioMuted}`);
    }

    // Append parameters to URL
    if (params.length > 0) {
      url += '#' + params.join('&');
    }

    return url;
  }

  /**
   * Start an audio call
   * Opens in new tab for better browser compatibility (especially Brave)
   */
  startAudioCall(userName?: string, userEmail?: string, roomName?: string): string {
    const url = this.buildJitsiUrl({
      type: CallType.AUDIO,
      roomName,
      userName,
      userEmail,
      startWithVideoMuted: true,
      startWithAudioMuted: false
    });

    // Open in new tab instead of popup for better permission handling
    window.open(url, '_blank');
    return url;
  }

  /**
   * Start a video call
   * Opens in new tab for better browser compatibility (especially Brave)
   */
  startVideoCall(userName?: string, userEmail?: string, roomName?: string): string {
    const url = this.buildJitsiUrl({
      type: CallType.VIDEO,
      roomName,
      userName,
      userEmail,
      startWithVideoMuted: false,
      startWithAudioMuted: false
    });

    // Open in new tab instead of popup for better permission handling
    window.open(url, '_blank');
    return url;
  }

  /**
   * Start a conference call
   * Opens in new tab for better browser compatibility (especially Brave)
   */
  startConference(userName?: string, userEmail?: string, roomName?: string): string {
    const url = this.buildJitsiUrl({
      type: CallType.CONFERENCE,
      roomName,
      userName,
      userEmail,
      startWithVideoMuted: false,
      startWithAudioMuted: false
    });

    // Open in new tab instead of popup for better permission handling
    window.open(url, '_blank');
    return url;
  }

  /**
   * Generate shareable meeting link
   */
  generateMeetingLink(type: CallType, roomName?: string): string {
    const room = roomName || this.generateRoomName(type);
    return `${this.serverUrl}/${room}`;
  }

  /**
   * Check if Jitsi server is accessible
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.serverUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Jitsi server health check failed:', error);
      return false;
    }
  }
}

export const jitsiService = new JitsiService();
