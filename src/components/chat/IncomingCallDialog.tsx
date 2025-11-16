import React, { useEffect, useState } from 'react';
import { Phone, Video, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CallInvitation {
  id: string;
  callerName: string;
  callerEmail?: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  meetingLink: string;
  timestamp: number;
}

interface IncomingCallDialogProps {
  invitation: CallInvitation | null;
  onAccept: (link: string) => void;
  onDecline: () => void;
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  invitation,
  onAccept,
  onDecline,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ringtoneAudio] = useState(() => {
    // Create audio element for ringtone (optional - can be silent)
    const audio = new Audio();
    audio.loop = true;
    return audio;
  });

  useEffect(() => {
    if (invitation) {
      setIsOpen(true);
      // Play ringtone (optional)
      // ringtoneAudio.play().catch(console.error);
    } else {
      setIsOpen(false);
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }

    return () => {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    };
  }, [invitation, ringtoneAudio]);

  if (!invitation) return null;

  const handleAccept = () => {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
    onAccept(invitation.meetingLink);
    setIsOpen(false);
  };

  const handleDecline = () => {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
    onDecline();
    setIsOpen(false);
  };

  const callIcon = invitation.callType === 'audio' ? Phone : Video;
  const callTypeText = invitation.callType === 'audio' ? 'Audio' : 'Video';
  const CallIcon = callIcon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDecline()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
        
        <div className="relative p-6">
          <DialogHeader className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {/* Pulsing call icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-full shadow-lg">
                  <CallIcon className="h-8 w-8 text-white animate-pulse" />
                </div>
              </div>

              {/* Caller info */}
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                  <AvatarImage src={invitation.callerAvatar} alt={invitation.callerName} />
                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                    {invitation.callerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <DialogTitle className="text-2xl font-bold">
                    {invitation.callerName}
                  </DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Incoming {callTypeText} Call
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {/* Decline button */}
            <Button
              onClick={handleDecline}
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
              title="Decline call"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Accept button */}
            <Button
              onClick={handleAccept}
              size="lg"
              className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 animate-pulse"
              title="Accept call"
            >
              <CallIcon className="h-8 w-8" />
            </Button>
          </div>

          {/* Subtle helper text */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Call will open in a new tab
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;
