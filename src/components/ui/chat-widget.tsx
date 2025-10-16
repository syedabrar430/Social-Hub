import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Card } from './card';
import { useAuth } from '@/contexts/AuthContext';
import { chatService as rocketChatService, type ChatConversation, type ChatMessage } from '@/services/chat';

interface ChatWidgetProps {
  onOpenFullChat?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ onOpenFullChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  // New state for chat browsing with tabs
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'dms'>('all');
  const [showList, setShowList] = useState(true);
  const [channels, setChannels] = useState<ChatConversation[]>([]);
  const [directMessages, setDirectMessages] = useState<ChatConversation[]>([]);
  const [filteredDMs, setFilteredDMs] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingDMs, setLoadingDMs] = useState(false);
  const [loadingFilteredDMs, setLoadingFilteredDMs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load channels and DMs when widget opens and user is authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated && showList) {
      loadChannelsAndDMs();
    }
  }, [isOpen, isAuthenticated, showList]);

  const loadChannelsAndDMs = async () => {
    setLoadingChannels(true);
    setLoadingDMs(true);
    
    try {
      // Load channels with messages
      const channelsData = await rocketChatService.getChannelsWithMessages();
      setChannels(channelsData);
      
      // Load direct messages
      const dmsData = await rocketChatService.getDirectMessagesWithMessages();
      setDirectMessages(dmsData);
    } catch (error) {
      console.error('Failed to load channels and DMs:', error);
    } finally {
      setLoadingChannels(false);
      setLoadingDMs(false);
    }
  };

  const handleConversationSelect = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setShowList(false);
    setLoadingMessages(true);

    try {
      let conversationMessages: ChatMessage[] = [];
      
      if (conversation.type === 'direct_message' && conversation.other_user) {
        // Load DM messages
        conversationMessages = await rocketChatService.getDirectMessageMessages(conversation.other_user);
      } else {
        // Load channel messages
        conversationMessages = await rocketChatService.getRocketChatChannelMessages(
          conversation.name || conversation.id,
          conversation.type === 'private_group' ? 'group' : 'channel'
        );
      }
      
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleBackToList = () => {
    setShowList(true);
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !selectedConversation) return;

    const messageContent = newMessage;
    setNewMessage('');
    setSendingMessage(true);

    try {
      // Send to channel or DM based on type
      if (selectedConversation.type === 'direct_message' && selectedConversation.other_user) {
        await rocketChatService.sendDirectMessage(selectedConversation.other_user, messageContent);
        // Reload DM messages
        const updatedMessages = await rocketChatService.getDirectMessageMessages(selectedConversation.other_user);
        setMessages(updatedMessages);
      } else {
        await rocketChatService.sendRocketChatChannelMessage(
          selectedConversation.name || selectedConversation.id,
          messageContent,
          selectedConversation.type === 'private_group' ? 'group' : 'channel'
        );
        // Reload channel messages
        const updatedMessages = await rocketChatService.getRocketChatChannelMessages(
          selectedConversation.name || selectedConversation.id,
          selectedConversation.type === 'private_group' ? 'group' : 'channel'
        );
        setMessages(updatedMessages);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Re-add message to input on error
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOpenFullChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const channelUrl = selectedConversation?.name || 'general';
    setTimeout(() => {
      window.location.href = `http://10.68.0.49:30082/channel/${channelUrl}`;
    }, 0);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    let isMounted = true;
    if (directMessages.length > 0) {
      setLoadingFilteredDMs(true);
      Promise.all(
        directMessages.map(async (dm) => {
          const messages = await rocketChatService.getDirectMessageMessages(dm.other_user || dm.name);
          return messages.length > 0 ? dm : null;
        })
      ).then(results => {
        if (isMounted) {
          setFilteredDMs(results.filter(Boolean) as ChatConversation[]);
          setLoadingFilteredDMs(false);
        }
      });
    } else {
      setFilteredDMs([]);
      setLoadingFilteredDMs(false);
    }
    return () => { isMounted = false; };
  }, [directMessages]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 h-[650px] shadow-2xl flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            {!showList && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="p-1 h-auto"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="font-semibold text-lg">
              {showList ? 'Chats' : selectedConversation?.display_name || selectedConversation?.name || 'Chat'}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!showList && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenFullChat}
                className="p-2 h-auto"
                title="Open in full Rocket.Chat"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="p-2 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
          {showList ? (
            /* List View with Tabs */
            <div>
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 pt-4">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'groups'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('groups')}
                >
                  Groups
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'dms'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('dms')}
                >
                  DM's
                </button>
              </div>

              {/* Conversations List */}
              <div className="p-4 space-y-2">
                {!isAuthenticated ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-sm text-gray-500 text-center">
                      Please log in to access Rocket.Chat
                    </div>
                  </div>
                ) : (
                  <>
                    {(activeTab === 'all' || activeTab === 'groups') && (
                      <>
                        {loadingChannels ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500">Loading channels...</div>
                          </div>
                        ) : channels.length === 0 ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500 text-center">
                              No channels with messages found
                            </div>
                          </div>
                        ) : (
                          channels.map((channel) => (
                            <div
                              key={channel.id}
                              className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              onClick={() => handleConversationSelect(channel)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {channel.display_name || channel.name}
                                    </div>
                                    {channel.description && (
                                      <div className="text-xs text-gray-500 truncate">
                                        {channel.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {channel.unread_count && channel.unread_count > 0 ? `${channel.unread_count} msgs` : 'Click to view'}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}

                    {(activeTab === 'all' || activeTab === 'dms') && (
                      <>
                        {loadingDMs ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500">Loading direct messages...</div>
                          </div>
                        ) : filteredDMs.length === 0 ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500 text-center">
                              No DM's found
                            </div>
                          </div>
                        ) : (
                          filteredDMs.flatMap((dm) => {
                            const displayName = dm.display_name || dm.other_user || dm.name || '';
                            const users = displayName.includes(',')
                              ? displayName.split(',').map(name => name.trim())
                              : [displayName];
                            return users.map((userName, index) => (
                              <div
                                key={`${dm.id}-${index}`}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...dm, other_user: userName, display_name: userName })}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium text-sm">{userName}</div>
                                      <div className="text-xs text-gray-500">Direct message</div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {dm.unread_count && dm.unread_count > 0 ? `${dm.unread_count} msgs` : 'Click to view'}
                                  </div>
                                </div>
                              </div>
                            ));
                          })
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Messages View */
            <div className="p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-sm text-gray-500">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-sm text-gray-500 text-center">
                    No messages in this conversation yet
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.user?.username === user?.email?.split('@')[0];
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        <div className={`p-3 rounded-lg ${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          <div className="flex items-start gap-2">
                            {!isOwnMessage && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={message.user?.avatar} />
                                <AvatarFallback className="text-xs">
                                  {message.user?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              {!isOwnMessage && (
                                <div className="text-xs font-medium mb-1 opacity-70">
                                  {message.user?.name || message.user?.username}
                                </div>
                              )}
                              <div className="text-sm break-words">
                                {message.content || message.text || 'No content'}
                              </div>
                              <div className={`text-xs mt-1 opacity-70`}>
                                {formatTimestamp(message.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input - Only show when viewing messages */}
        {!showList && selectedConversation && (
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                size="sm"
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}

        {/* "See all in Messenger" button */}
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenFullChat}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Rocket.Chat
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatWidget;
