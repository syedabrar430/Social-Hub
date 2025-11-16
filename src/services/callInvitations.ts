/**
 * Call Invitation Manager
 * Handles incoming call notifications using localStorage for cross-tab communication
 */

export interface CallInvitation {
  id: string;
  callerName: string;
  callerEmail?: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  meetingLink: string;
  timestamp: number;
  recipientEmail?: string;
}

type InvitationCallback = (invitation: CallInvitation) => void;

const STORAGE_KEY = 'social_hub_call_invitations';
const CHECK_INTERVAL = 1000; // Check every second

class CallInvitationManager {
  private listeners: InvitationCallback[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedInvitations = new Set<string>();
  private currentUserEmail: string | null = null;

  /**
   * Set the current user's email to filter invitations
   */
  setCurrentUser(email: string) {
    this.currentUserEmail = email;
  }

  /**
   * Start listening for incoming call invitations
   */
  startListening(userEmail: string) {
    this.currentUserEmail = userEmail;
    
    if (this.pollingInterval) return;

    // Check immediately
    this.checkForInvitations();

    // Poll for new invitations every second
    this.pollingInterval = setInterval(() => {
      this.checkForInvitations();
    }, CHECK_INTERVAL);

    // Listen for storage events from other tabs
    window.addEventListener('storage', this.handleStorageEvent);
  }

  /**
   * Stop listening for incoming call invitations
   */
  stopListening() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    window.removeEventListener('storage', this.handleStorageEvent);
  }

  /**
   * Handle storage events from other tabs/windows
   */
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      this.checkForInvitations();
    }
  };

  /**
   * Subscribe to incoming call invitations
   */
  onInvitation(callback: InvitationCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Check for new call invitations from storage
   */
  private checkForInvitations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const invitations: CallInvitation[] = JSON.parse(stored);
      
      console.log('📬 Checking invitations:', {
        currentUserEmail: this.currentUserEmail,
        totalInvitations: invitations.length,
        allInvitations: invitations
      });
      
      // Filter invitations for current user
      const myInvitations = invitations.filter(inv => 
        inv.recipientEmail === this.currentUserEmail &&
        !this.processedInvitations.has(inv.id)
      );
      
      console.log('📨 My invitations:', myInvitations);

      // Process each invitation
      myInvitations.forEach(invitation => {
        // Check if invitation is recent (within last 2 minutes)
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        if (invitation.timestamp > twoMinutesAgo) {
          console.log('✅ Processing invitation:', invitation);
          this.processedInvitations.add(invitation.id);
          this.notifyListeners(invitation);
          
          // Remove the invitation after processing
          this.removeInvitation(invitation.id);
        } else {
          console.log('⏰ Invitation too old, skipping:', invitation);
        }
      });

      // Clean up old invitations
      this.cleanupOldInvitations();
    } catch (error) {
      console.error('Error checking for call invitations:', error);
    }
  }

  /**
   * Send a call invitation to a recipient
   */
  sendInvitation(invitation: CallInvitation) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const invitations: CallInvitation[] = stored ? JSON.parse(stored) : [];
      
      // Add new invitation
      invitations.push(invitation);
      
      // Save to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invitations));
      
      console.log('📤 Call invitation sent:', invitation);
      console.log('💾 All invitations in storage:', invitations);
      
      // Manually trigger storage event for same-tab detection
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(invitations),
        url: window.location.href
      }));
    } catch (error) {
      console.error('Error sending call invitation:', error);
    }
  }

  /**
   * Remove a specific invitation
   */
  private removeInvitation(invitationId: string) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const invitations: CallInvitation[] = JSON.parse(stored);
      const filtered = invitations.filter(inv => inv.id !== invitationId);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing invitation:', error);
    }
  }

  /**
   * Clean up old invitations (older than 5 minutes)
   */
  private cleanupOldInvitations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const invitations: CallInvitation[] = JSON.parse(stored);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      const recent = invitations.filter(inv => inv.timestamp > fiveMinutesAgo);
      
      if (recent.length !== invitations.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
      }
    } catch (error) {
      console.error('Error cleaning up invitations:', error);
    }
  }

  /**
   * Notify all listeners about an invitation
   */
  private notifyListeners(invitation: CallInvitation) {
    this.listeners.forEach(callback => {
      try {
        callback(invitation);
      } catch (error) {
        console.error('Error in invitation callback:', error);
      }
    });
  }

  /**
   * Manually trigger an invitation (for same-user testing)
   */
  triggerInvitation(invitation: CallInvitation) {
    if (!this.processedInvitations.has(invitation.id)) {
      this.processedInvitations.add(invitation.id);
      this.notifyListeners(invitation);
    }
  }
}

export const callInvitationManager = new CallInvitationManager();
