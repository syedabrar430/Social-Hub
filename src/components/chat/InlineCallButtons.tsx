import React, { useState } from 'react';
import { Phone, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { jitsiService, CallType } from '@/services/jitsi';
import { chatService } from '@/services/chat';
import { callInvitationManager } from '@/services/callInvitations';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InlineCallButtonsProps {
  recipientName: string;
  recipientEmail?: string;
  recipientUsername?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const InlineCallButtons: React.FC<InlineCallButtonsProps> = ({
  recipientName,
  recipientEmail,
  recipientUsername,
  size = 'sm',
  showLabels = false
}) => {
  const { user } = useAuth();
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [callType, setCallType] = useState<CallType>(CallType.AUDIO);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Debug: Log props when component renders
  console.log('🎯 InlineCallButtons rendered with props:', {
    recipientName,
    recipientEmail,
    recipientUsername,
    currentUser: user?.email
  });

  const sendMeetingInvite = async (link: string, type: CallType) => {
    if (!recipientUsername && !recipientName) {
      console.error('❌ No recipient username or name available');
      toast.error('Cannot send invitation', {
        description: 'Recipient information is missing',
      });
      return;
    }

    console.log('📞 ========================================');
    console.log('📞 ========== SENDING CALL INVITATION ==========');
    console.log('📞 ========================================');
    console.log('📞 Step 1: Initial Recipient Info:', {
      recipientName,
      recipientEmail,
      recipientUsername,
      callType: type,
      meetingLink: link,
      currentUser: user?.email
    });

    // Try to resolve email from backend if not provided
    let effectiveRecipientEmail = recipientEmail;
    console.log('📞 Step 2: Checking if email resolution needed...');
    
    if (!effectiveRecipientEmail && recipientUsername) {
      console.log('🔍 No recipientEmail provided, resolving from backend...');
      try {
        const response = await fetch('http://localhost:8000/api/rocket-chat/resolve-user-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ username: recipientUsername })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📞 Step 3: Backend response:', data);
          if (data.success && data.email) {
            effectiveRecipientEmail = data.email;
            console.log('✅ Successfully resolved email from backend:', effectiveRecipientEmail);
          } else {
            console.error('❌ Backend returned no email:', data);
          }
        } else {
          console.error('❌ Backend response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Failed to resolve email from backend:', error);
      }
    }
    
    console.log('📞 Step 4: Final effective recipient email:', effectiveRecipientEmail);

    if (!effectiveRecipientEmail) {
      console.warn('⚠️ Still no recipientEmail after backend lookup! Popup may not appear.');
      console.warn('⚠️ Message will still be sent, but recipient won\'t get popup notification.');
    }

    setSendingInvite(true);
    try {
      const callTypeEmoji = type === CallType.AUDIO ? '📞' : '📹';
      const callTypeName = type === CallType.AUDIO ? 'Audio Call' : 'Video Call';
      
      // Format message with clickable link for RocketChat
      // RocketChat auto-converts URLs to clickable links
      const message = `${callTypeEmoji} **${callTypeName} Invitation**\n\n${user?.name || 'Someone'} is inviting you to join a ${callTypeName.toLowerCase()}!\n\n🔗 Click the link below to join:\n${link}\n\nThe call is waiting for you to join!`;

      // Use username if available, otherwise fall back to name
      const recipient = recipientUsername || recipientName;
      
      console.log('📤 Sending DM to:', recipient);
      console.log('📝 Message content:', message);
      
      const result = await chatService.sendDirectMessage(recipient, message);
      console.log('📞 Step 5: Send DM result:', result);
      
      if (result.success) {
        console.log('✅ Step 6: Message sent successfully to chat!');
        
        // Trigger immediate message refresh by dispatching a custom event
        console.log('🔄 Triggering immediate message refresh...');
        window.dispatchEvent(new CustomEvent('refresh-messages', { 
          detail: { 
            conversationType: 'direct_message',
            recipient: recipient 
          }
        }));
        
        // Send the popup notification to the recipient
        // This uses localStorage for cross-tab/cross-window communication
        console.log('📞 Step 7: Creating invitation object...');
        const invitation = {
          id: `call-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          callerName: user?.name || 'Someone',
          callerEmail: user?.email,
          callType: (type === CallType.AUDIO ? 'audio' : 'video') as 'audio' | 'video',
          meetingLink: link,
          timestamp: Date.now(),
          recipientEmail: effectiveRecipientEmail, // Use resolved email
        };
        
        console.log('📞 ========================================');
        console.log('📞 Step 8: SENDING POPUP INVITATION');
        console.log('📞 ========================================');
        console.log('🔔 Full invitation object:', JSON.stringify(invitation, null, 2));
        console.log('📧 Popup will appear for user with email:', effectiveRecipientEmail);
        console.log('📧 Current localStorage before send:', localStorage.getItem('social_hub_call_invitations'));
        
        callInvitationManager.sendInvitation(invitation);
        
        console.log('📧 Current localStorage after send:', localStorage.getItem('social_hub_call_invitations'));
        
        // NUCLEAR FORCE: Trigger multiple checks over time to GUARANTEE delivery
        console.log('📞 ========================================');
        console.log('💥 Step 9: NUCLEAR FORCE ACTIVATION');
        console.log('📞 ========================================');
        [100, 300, 500, 1000, 2000].forEach(delay => {
          setTimeout(() => {
            console.log(`💥 NUCLEAR FORCE: Force-check trigger at ${delay}ms`);
            console.log(`   📧 Recipient email: ${effectiveRecipientEmail}`);
            console.log(`   📦 Current localStorage:`, localStorage.getItem('social_hub_call_invitations'));
            localStorage.setItem('social_hub_force_check', Date.now().toString());
            window.dispatchEvent(new CustomEvent('call-force-check', { detail: invitation }));
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'social_hub_call_invitations',
              newValue: localStorage.getItem('social_hub_call_invitations'),
              url: window.location.href
            }));
          }, delay);
        });
        
        console.log('📞 ========================================');
        console.log('📞 ✅ INVITATION SENT WITH NUCLEAR FORCE');
        console.log('📞 ========================================');
        
        toast.success('Call invitation sent!', {
          description: `${recipientName} received the call link in chat${effectiveRecipientEmail ? ' and should see a popup notification' : ''}`,
          duration: 4000,
        });
      } else {
        console.error('❌ Failed to send message:', result.message);
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Failed to send meeting invite:', error);
      toast.error('Could not send invitation', {
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please copy and share the link manually.`,
        duration: 5000,
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAudioCall = async () => {
    try {
      const link = jitsiService.startAudioCall(
        user?.name || user?.email,
        user?.email
      );
      
      setMeetingLink(link);
      setCallType(CallType.AUDIO);
      setShowLinkDialog(true);
      
      // Automatically send the invitation
      await sendMeetingInvite(link, CallType.AUDIO);
      
      toast.success(`Audio call started with ${recipientName}`, {
        description: 'Invitation sent! Waiting for them to join...',
      });
    } catch (error) {
      console.error('Failed to start audio call:', error);
      toast.error('Failed to start audio call');
    }
  };

  const handleVideoCall = async () => {
    try {
      const link = jitsiService.startVideoCall(
        user?.name || user?.email,
        user?.email
      );
      
      setMeetingLink(link);
      setCallType(CallType.VIDEO);
      setShowLinkDialog(true);
      
      // Automatically send the invitation
      await sendMeetingInvite(link, CallType.VIDEO);
      
      toast.success(`Video call started with ${recipientName}`, {
        description: 'Invitation sent! Waiting for them to join...',
      });
    } catch (error) {
      console.error('Failed to start video call:', error);
      toast.error('Failed to start video call');
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    toast.success('Link copied!', {
      description: `Share this link with ${recipientName}`,
    });
  };

  const getCallIcon = () => {
    switch (callType) {
      case CallType.AUDIO: return '📞';
      case CallType.VIDEO: return '📹';
      case CallType.CONFERENCE: return '👥';
    }
  };

  const getCallTitle = () => {
    switch (callType) {
      case CallType.AUDIO: return 'Audio Call';
      case CallType.VIDEO: return 'Video Call';
      case CallType.CONFERENCE: return 'Conference';
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Audio Call Button */}
        <Button
          onClick={handleAudioCall}
          variant="ghost"
          size="icon"
          className={`${sizeClasses[size]} hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors`}
          title={`Audio call with ${recipientName}`}
        >
          <Phone className={iconSizes[size]} />
        </Button>

        {/* Video Call Button */}
        <Button
          onClick={handleVideoCall}
          variant="ghost"
          size="icon"
          className={`${sizeClasses[size]} hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors`}
          title={`Video call with ${recipientName}`}
        >
          <Video className={iconSizes[size]} />
        </Button>
      </div>

      {/* Meeting Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getCallIcon()}</span>
              {getCallTitle()} with {recipientName}
            </DialogTitle>
            <DialogDescription>
              Share this link to invite {recipientName} to the call
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✓</span>
                <span className="font-semibold">Call started & invitation sent</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {recipientName} has been notified and will receive the meeting link in their chat. 
                You're now waiting in the call room.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Meeting Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={copyMeetingLink}
                  variant="outline"
                  size="sm"
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Automatic Notification:</strong> {recipientName} received a message with the meeting link and can join anytime by clicking it.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InlineCallButtons;
