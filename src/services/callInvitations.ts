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
const CHECK_INTERVAL = 500; // Ultra-aggressive: Check every 500ms
const FORCE_CHECK_KEY = 'social_hub_force_check'; // Trigger immediate checks

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
    // Normalize email to lowercase for consistent matching
    this.currentUserEmail = userEmail.toLowerCase().trim();
    console.log('🎧 Starting listener for normalized email:', this.currentUserEmail);
    
    if (this.pollingInterval) return;

    // Check immediately
    this.checkForInvitations();

    // Poll for new invitations every second
    this.pollingInterval = setInterval(() => {
      this.checkForInvitations();
    }, CHECK_INTERVAL);

    // Listen for storage events from other tabs
    window.addEventListener('storage', this.handleStorageEvent);
    
    // Listen for custom events from same tab
    window.addEventListener('call-invitation-sent', this.handleCustomEvent as EventListener);
    
    // Additional event listeners for maximum reliability
    window.addEventListener('call-force-check', this.handleCustomEvent as EventListener);
    window.addEventListener('focus', this.checkForInvitations);
    
    // Listen for force-check triggers
    this.startForceCheckListener();
  }

  /**
   * Start listening for force-check triggers
   */
  private forceCheckInterval: NodeJS.Timeout | null = null;
  
  private startForceCheckListener() {
    // Poll for force-check triggers every 200ms (hyper-aggressive)
    this.forceCheckInterval = setInterval(() => {
      const forceCheck = localStorage.getItem(FORCE_CHECK_KEY);
      if (forceCheck) {
        console.log('⚡ Force-check triggered!');
        localStorage.removeItem(FORCE_CHECK_KEY);
        this.checkForInvitations();
      }
    }, 200);
  }

  /**
   * Stop listening for incoming call invitations
   */
  stopListening() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.forceCheckInterval) {
      clearInterval(this.forceCheckInterval);
      this.forceCheckInterval = null;
    }
    
    window.removeEventListener('storage', this.handleStorageEvent);
    window.removeEventListener('call-invitation-sent', this.handleCustomEvent as EventListener);
    window.removeEventListener('call-force-check', this.handleCustomEvent as EventListener);
    window.removeEventListener('focus', this.checkForInvitations);
  }

  /**
   * Handle storage events from other tabs/windows
   */
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      console.log('📨 Storage event detected from other tab');
      this.checkForInvitations();
    }
  };

  /**
   * Handle custom events from same tab
   */
  private handleCustomEvent = (event: CustomEvent) => {
    console.log('📨 Custom event detected in same tab:', event.detail);
    setTimeout(() => this.checkForInvitations(), 100);
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
      console.log('🔍 ========================================');
      console.log('🔍 CHECKING FOR INVITATIONS...');
      console.log('🔍 ========================================');
      console.log('🔍 Current user email:', this.currentUserEmail);
      
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('🔍 Raw localStorage value:', stored);
      
      if (!stored) {
        console.log('📬 No invitations in storage (localStorage is empty)');
        return;
      }

      const invitations: CallInvitation[] = JSON.parse(stored);
      
      console.log('📬 Found invitations in storage:');
      console.log('   Total count:', invitations.length);
      invitations.forEach((inv, idx) => {
        console.log(`   [${idx}]:`, {
          id: inv.id,
          callerName: inv.callerName,
          recipientEmail: inv.recipientEmail,
          callType: inv.callType,
          timestamp: new Date(inv.timestamp).toLocaleString()
        });
      });
      
      // Filter invitations for current user (case-insensitive email matching)
      console.log('🔍 Filtering invitations for current user...');
      const myInvitations = invitations.filter(inv => {
        // Normalize recipient email for comparison
        const recipientEmail = inv.recipientEmail ? inv.recipientEmail.toLowerCase().trim() : null;
        const currentEmail = this.currentUserEmail;
        const emailsMatch = recipientEmail === currentEmail;
        const notProcessed = !this.processedInvitations.has(inv.id);
        const matches = emailsMatch && notProcessed;
        
        console.log(`🔍 Checking invitation ${inv.id}:`);
        console.log(`   Recipient email (raw): "${inv.recipientEmail}"`);
        console.log(`   Recipient email (normalized): "${recipientEmail}"`);
        console.log(`   Current user email: "${currentEmail}"`);
        console.log(`   Emails match: ${emailsMatch}`);
        console.log(`   Not processed yet: ${notProcessed}`);
        console.log(`   Final match: ${matches}`);
        
        return matches;
      });
      
      console.log('📨 My invitations count:', myInvitations.length);
      if (myInvitations.length > 0) {
        console.log('📨 My invitations:', myInvitations);
      } else {
        console.log('❌ No matching invitations found!');
        console.log('❌ Possible reasons:');
        console.log('   1. recipientEmail is null/undefined');
        console.log('   2. recipientEmail doesn\'t match currentUserEmail');
        console.log('   3. Invitation already processed');
      }
      console.log('🔍 ========================================');

      // Process each invitation
      myInvitations.forEach(invitation => {
        // Check if invitation is recent (within last 2 minutes)
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        if (invitation.timestamp > twoMinutesAgo) {
          console.log('✅ ========================================');
          console.log('✅ PROCESSING INVITATION!');
          console.log('✅ ========================================');
          console.log('✅ Invitation details:', invitation);
          this.processedInvitations.add(invitation.id);
          this.notifyListeners(invitation);
          console.log('✅ Listeners notified! Popup should appear now!');
          console.log('✅ ========================================');
          
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
      
      // Normalize emails to lowercase for consistent matching
      if (invitation.recipientEmail) {
        invitation.recipientEmail = invitation.recipientEmail.toLowerCase().trim();
      }
      if (invitation.callerEmail) {
        invitation.callerEmail = invitation.callerEmail.toLowerCase().trim();
      }
      
      // Add new invitation
      invitations.push(invitation);
      
      // Save to storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invitations));
      
      console.log('📤 Call invitation sent:', invitation);
      console.log('💾 All invitations in storage:', invitations);
      console.log('🎯 Recipient email (normalized):', invitation.recipientEmail);
      
      // Manually trigger check in same tab immediately
      setTimeout(() => this.checkForInvitations(), 100);
      
      // Also dispatch custom event for better cross-tab communication
      window.dispatchEvent(new CustomEvent('call-invitation-sent', {
        detail: invitation
      }));
      
      // Manually trigger storage event for other tabs
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
