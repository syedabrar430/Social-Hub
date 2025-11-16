import React, { useEffect, useState } from 'react';
import { Phone, Video, X, Check } from 'lucide-react';
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

interface IncomingCallBannerProps {
  invitation: CallInvitation | null;
  onAccept: (link: string) => void;
  onDecline: () => void;
}

const IncomingCallBanner: React.FC<IncomingCallBannerProps> = ({
  invitation,
  onAccept,
  onDecline,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (invitation) {
      console.log('🎨 IncomingCallBanner: Showing popup for invitation:', invitation);
      setIsVisible(true);
      // Trigger animation after mount
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      console.log('🎨 IncomingCallBanner: Hiding popup');
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [invitation]);

  if (!isVisible || !invitation) return null;

  const handleAccept = () => {
    onAccept(invitation.meetingLink);
  };

  const handleDecline = () => {
    onDecline();
  };

  const callIcon = invitation.callType === 'audio' ? Phone : Video;
  const callTypeText = invitation.callType === 'audio' ? 'Audio' : 'Video';
  const CallIcon = callIcon;

  return (
    <>
      {/* Backdrop overlay (semi-transparent) */}
      <div 
        className={`fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDecline}
      />
      
      {/* Call notification banner - WhatsApp style top-right corner */}
      <div
        className={`fixed top-4 right-4 z-[9999] w-full max-w-md px-4 transition-all duration-300 ${
          isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden">
          {/* Animated pulse ring */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-400/20 to-purple-400/20" />
          
          <div className="relative p-4">
            <div className="flex items-center gap-4">
              {/* Pulsing call icon */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30" />
                <div className="relative bg-white/20 p-3 rounded-full backdrop-blur-sm">
                  <CallIcon className="h-6 w-6 text-white animate-pulse" />
                </div>
              </div>

              {/* Caller info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-10 w-10 border-2 border-white/50">
                    <AvatarImage src={invitation.callerAvatar} alt={invitation.callerName} />
                    <AvatarFallback className="text-sm font-semibold bg-white/20 text-white">
                      {invitation.callerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base truncate">
                      {invitation.callerName}
                    </h3>
                    <p className="text-white/90 text-sm">
                      Incoming {callTypeText} call
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Decline button */}
                <Button
                  onClick={handleDecline}
                  size="lg"
                  className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg hover:scale-110 transition-all duration-200 border-2 border-white/30"
                  title="Decline"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Accept button */}
                <Button
                  onClick={handleAccept}
                  size="lg"
                  className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:scale-110 transition-all duration-200 animate-pulse border-2 border-white/30"
                  title="Accept"
                >
                  <Check className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle helper text below */}
        <div className="text-center mt-2">
          <p className="text-xs text-white bg-black/30 rounded-full px-3 py-1 inline-block backdrop-blur-sm">
            Swipe or click outside to dismiss
          </p>
        </div>
      </div>
    </>
  );
};

export default IncomingCallBanner;
