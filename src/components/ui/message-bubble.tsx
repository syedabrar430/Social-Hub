import React from 'react';
import { Message, currentUser } from '@/lib/mockData';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOwn = message.senderId === currentUser.id;

  return (
    <div className={`flex mb-4 animate-fade-in ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl transition-smooth ${
        isOwn
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-card text-card-foreground rounded-bl-md shadow-card'
      }`}>
        <p className="text-sm leading-relaxed">{message.content}</p>
        <div className={`flex items-center justify-between mt-1 ${
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <span className="text-xs">{message.timestamp}</span>
          {isOwn && (
            <span className="text-xs ml-2">
              {message.read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;