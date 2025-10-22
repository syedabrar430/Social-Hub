import React from 'react';
import EnhancedRocketChatWidget from './enhanced-rocket-chat-widget';

interface RocketChatWidgetProps {
  className?: string;
}

const RocketChatWidget: React.FC<RocketChatWidgetProps> = ({ className = '' }) => {
  return <EnhancedRocketChatWidget className={className} />;
};

export default RocketChatWidget;