import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import EnhancedMessagesWidget from '@/components/chat/EnhancedMessagesWidget';
import RocketChatIframe from '@/components/chat/RocketChatIframe';
import RocketChatPopup from '@/components/chat/RocketChatPopup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Messages: React.FC = () => {
  const [activeTab, setActiveTab] = useState('custom');
  const location = useLocation();
  
  // Get the group to open from navigation state
  const openGroup = location.state?.openGroup;

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="custom">Custom Chat</TabsTrigger>
          <TabsTrigger value="rocketchat">Rocket.Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="custom" className="h-[calc(100%-4rem)]">
          <EnhancedMessagesWidget openGroup={openGroup} />
        </TabsContent>
        
        <TabsContent value="rocketchat" className="h-[calc(100%-4rem)]">
          <div className="h-full p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Rocket.Chat Integration</h3>
              <p className="text-sm text-gray-600">
                Full-featured chat with real-time messaging, file sharing, and more.
              </p>
            </div>
            <RocketChatPopup channelName="general" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Messages;