import React, { useState } from 'react';
import { Phone, Video, Users, Link as LinkIcon, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { jitsiService, CallType } from '@/services/jitsi';
import { rocketChatService } from '@/services/rocketchat';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CallButtonsProps {
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  postToRocketChat?: boolean;
  rocketChatRoomId?: string;
}

const CallButtons: React.FC<CallButtonsProps> = ({
  className = '',
  showLabels = true,
  orientation = 'horizontal',
  postToRocketChat = false,
  rocketChatRoomId = 'GENERAL'
}) => {
  const { user } = useAuth();
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [callType, setCallType] = useState<CallType>(CallType.AUDIO);

  const postMeetingToRocketChat = async (link: string, type: CallType) => {
    if (!postToRocketChat) return;

    const credentials = rocketChatService.getStoredCredentials();
    if (!credentials) {
      console.warn('RocketChat credentials not found. Cannot post meeting link.');
      return;
    }

    const success = await rocketChatService.postMeetingLink(
      rocketChatRoomId,
      link,
      type,
      credentials
    );

    if (success) {
      toast.success('Meeting link shared in RocketChat', {
        icon: <MessageSquare className="h-4 w-4" />,
      });
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
      
      // Post to RocketChat if enabled
      await postMeetingToRocketChat(link, CallType.AUDIO);
      
      toast.success('Audio call started!', {
        description: 'Opening in new window...',
        icon: '📞',
      });
    } catch (error) {
      console.error('Failed to start audio call:', error);
      toast.error('Failed to start audio call', {
        description: 'Please check if Jitsi server is accessible',
      });
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
      
      // Post to RocketChat if enabled
      await postMeetingToRocketChat(link, CallType.VIDEO);
      
      toast.success('Video call started!', {
        description: 'Opening in new window...',
        icon: '📹',
      });
    } catch (error) {
      console.error('Failed to start video call:', error);
      toast.error('Failed to start video call', {
        description: 'Please check if Jitsi server is accessible',
      });
    }
  };

  const handleConference = async () => {
    try {
      const link = jitsiService.startConference(
        user?.name || user?.email,
        user?.email
      );
      
      setMeetingLink(link);
      setCallType(CallType.CONFERENCE);
      setShowLinkDialog(true);
      
      // Post to RocketChat if enabled
      await postMeetingToRocketChat(link, CallType.CONFERENCE);
      
      toast.success('Conference started!', {
        description: 'Opening in new window...',
        icon: '👥',
      });
    } catch (error) {
      console.error('Failed to start conference:', error);
      toast.error('Failed to start conference', {
        description: 'Please check if Jitsi server is accessible',
      });
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(meetingLink);
    toast.success('Link copied!', {
      description: 'Meeting link copied to clipboard',
      icon: '📋',
    });
  };

  const containerClass = orientation === 'horizontal' 
    ? 'flex items-center gap-3' 
    : 'flex flex-col gap-3';

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

  return (
    <>
      <div className={`${containerClass} ${className}`}>
        {/* Audio Call Button */}
        <Button
          onClick={handleAudioCall}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          size={showLabels ? 'default' : 'icon'}
        >
          <Phone className="h-5 w-5" />
          {showLabels && <span className="ml-2">Audio Call</span>}
        </Button>

        {/* Video Call Button */}
        <Button
          onClick={handleVideoCall}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          size={showLabels ? 'default' : 'icon'}
        >
          <Video className="h-5 w-5" />
          {showLabels && <span className="ml-2">Video Call</span>}
        </Button>

        {/* Conference Button */}
        <Button
          onClick={handleConference}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          size={showLabels ? 'default' : 'icon'}
        >
          <Users className="h-5 w-5" />
          {showLabels && <span className="ml-2">Conference</span>}
        </Button>
      </div>

      {/* Meeting Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getCallIcon()}</span>
              {getCallTitle()} Started
            </DialogTitle>
            <DialogDescription>
              Share this link with others to join the call
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Call window opened</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The call has been opened in a new window. You can share the link below with others.
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
                  size="icon"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Anyone with this link can join the call. Share it via chat or email.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CallButtons;
