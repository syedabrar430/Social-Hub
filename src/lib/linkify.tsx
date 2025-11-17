import React from 'react';
import { ExternalLink, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Linkify utility - converts URLs in text to clickable links
 * Detects call invitation messages and renders them with a special UI
 */

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const JITSI_URL_REGEX = /(https?:\/\/meet\.jit\.si\/[^\s]+)/g;

interface LinkifyOptions {
  className?: string;
  linkClassName?: string;
  openInNewTab?: boolean;
  detectCallInvitations?: boolean;
}

/**
 * Check if a message is a call invitation
 */
export function isCallInvitation(text: string): boolean {
  return (
    text.includes('📞') || text.includes('📹')
  ) && (
    text.toLowerCase().includes('call') || 
    text.toLowerCase().includes('invitation')
  ) && JITSI_URL_REGEX.test(text);
}

/**
 * Extract call details from invitation message
 */
export function extractCallDetails(text: string): {
  callType: 'audio' | 'video';
  callerName: string | null;
  meetingLink: string | null;
} {
  const isAudio = text.includes('📞') || text.toLowerCase().includes('audio call');
  const isVideo = text.includes('📹') || text.toLowerCase().includes('video call');
  
  // Extract caller name (looks for patterns like "John is inviting you" or "from John")
  let callerName: string | null = null;
  const callerMatch = text.match(/(?:from |by )?([A-Z][a-zA-Z\s]+) is inviting/i);
  if (callerMatch) {
    callerName = callerMatch[1].trim();
  }
  
  // Extract meeting link
  const linkMatch = text.match(JITSI_URL_REGEX);
  const meetingLink = linkMatch ? linkMatch[0] : null;
  
  return {
    callType: isVideo ? 'video' : 'audio',
    callerName,
    meetingLink,
  };
}

/**
 * Render a call invitation message with special UI
 */
export function renderCallInvitation(
  text: string,
  className?: string
): React.ReactElement {
  const { callType, callerName, meetingLink } = extractCallDetails(text);
  
  if (!meetingLink) {
    // Fallback to regular linkify if no meeting link found
    return <>{linkifyText(text, { className })}</>;
  }
  
  const callIcon = callType === 'audio' ? Phone : Video;
  const callLabel = callType === 'audio' ? 'Audio Call' : 'Video Call';
  const callEmoji = callType === 'audio' ? '📞' : '📹';
  
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Call header */}
      <div className="flex items-center gap-2 font-semibold">
        <span className="text-lg">{callEmoji}</span>
        <span>{callLabel} Invitation</span>
      </div>
      
      {/* Caller info */}
      {callerName && (
        <p className="text-sm opacity-90">
          {callerName} is inviting you to join a {callType} call
        </p>
      )}
      
      {/* Join button */}
      <Button
        onClick={() => window.open(meetingLink, '_blank')}
        className={`w-full ${
          callType === 'audio' 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        size="lg"
      >
        {React.createElement(callIcon, { className: 'h-5 w-5 mr-2' })}
        Join {callLabel}
      </Button>
      
      {/* Meeting link (fallback) */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs opacity-60 mb-1">Or copy the meeting link:</p>
        <a
          href={meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline break-all flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
          <span className="break-all">{meetingLink}</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Convert URLs in text to clickable links
 */
export function linkifyText(
  text: string,
  options: LinkifyOptions = {}
): React.ReactElement[] {
  const {
    className = '',
    linkClassName = 'text-blue-500 hover:underline break-all',
    openInNewTab = true,
    detectCallInvitations = true,
  } = options;
  
  // Check if this is a call invitation and handle it specially
  if (detectCallInvitations && isCallInvitation(text)) {
    return [renderCallInvitation(text, className)];
  }
  
  // Split text by URLs
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          className={linkClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    
    // Regular text - preserve line breaks
    return (
      <React.Fragment key={index}>
        {part.split('\n').map((line, lineIndex, arr) => (
          <React.Fragment key={lineIndex}>
            {line}
            {lineIndex < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  });
}

/**
 * React component wrapper for linkified text
 */
export const Linkify: React.FC<{
  text: string;
  className?: string;
  linkClassName?: string;
  openInNewTab?: boolean;
  detectCallInvitations?: boolean;
}> = ({ text, ...options }) => {
  return <>{linkifyText(text, options)}</>;
};
