import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import ChannelList from '@/components/chat/ChannelList';
import ChatWindow from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { type ChatConversation, type ChatMessage } from '@/services/chat';
import { chatService } from '@/services/chat';
import { useToast } from '@/hooks/use-toast';

// Helper function to format message timestamp
const formatMessageTime = (timestamp: string) => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();
  const isYesterday = messageDate.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
  
  if (isToday) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return `Yesterday ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return messageDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
};

const MessagesWidget = () => {
  console.log('🎯 MessagesWidget component is rendering');
  
  const [selectedChannel, setSelectedChannel] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  console.log('🔐 Auth status - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
  console.log('📺 Selected channel:', selectedChannel);
  console.log('📨 Messages:', messages.length);

  // Load messages for selected channel
  const loadMessages = useCallback(async () => {
    console.log('🔄 loadMessages called - selectedChannel:', selectedChannel, 'isAuthenticated:', isAuthenticated);
    
    if (!selectedChannel || !isAuthenticated) {
      console.log('❌ Early return - no channel or not authenticated');
      return;
    }

    try {
      setLoading(true);
      console.log('📡 Loading messages for channel:', selectedChannel.name);

      const channelIdentifier = selectedChannel.name || selectedChannel.id;
      const channelType = selectedChannel.type === 'private_group' ? 'group' : 'channel';

      console.log('🔍 Channel details:', { channelIdentifier, channelType });

      const channelMessages = await chatService.getRocketChatChannelMessages(
        channelIdentifier,
        channelType
      );

      console.log('📨 Raw channel messages received:', channelMessages);

      // Sort messages by timestamp (oldest first)
      const sortedMessages = channelMessages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Add some test messages with different dates for testing
      if (sortedMessages.length === 0) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        
        sortedMessages.push(
          {
            id: 'test-1',
            text: 'This is a message from 2 days ago',
            user: { id: '1', username: 'test1', name: 'Test User 1' },
            timestamp: dayBefore.toISOString(),
            type: 'message',
            reactions: {},
            thread_count: 0,
            thread_messages: []
          },
          {
            id: 'test-2',
            text: 'This is a message from yesterday',
            user: { id: '2', username: 'test2', name: 'Test User 2' },
            timestamp: yesterday.toISOString(),
            type: 'message',
            reactions: {},
            thread_count: 0,
            thread_messages: []
          },
          {
            id: 'test-3',
            text: 'This is a message from today',
            user: { id: '3', username: 'test3', name: 'Test User 3' },
            timestamp: now.toISOString(),
            type: 'message',
            reactions: {},
            thread_count: 0,
            thread_messages: []
          }
        );
      }

      console.log('📋 Sorted messages:', sortedMessages);
      setMessages(sortedMessages);
      console.log(`✅ Loaded ${sortedMessages.length} messages for ${selectedChannel.name}`);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      toast({
        title: "Error",
        description: `Failed to load messages from ${selectedChannel.name}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedChannel, isAuthenticated, toast]);

  // Load messages when selected channel changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <ResponsiveLayout>
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <ResponsiveLayout>
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">Please log in to access Rocket.Chat channels.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full">
          {/* Channel List Sidebar */}
          <div className="md:col-span-4 lg:col-span-3">
            <ChannelList
              selectedChannel={selectedChannel}
              onChannelSelect={setSelectedChannel}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Chat Window */}
          <div className="md:col-span-8 lg:col-span-9">
            {selectedChannel ? (
              <div className="h-full bg-card rounded-lg border flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                        #
                      </div>
                      <div>
                        <h2 className="font-semibold">{selectedChannel.display_name || selectedChannel.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedChannel.type === 'private_group' ? 'Private Group' : 'Rocket.Chat Channel'}
                          {selectedChannel.member_count && ` • ${selectedChannel.member_count} members`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area with Date Separators */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide min-h-0 max-h-full">
                  <div className="space-y-4 pb-4">
                    {loading ? (
                      <div className="text-center text-muted-foreground py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <div className="text-6xl mb-4">💬</div>
                        <p>No messages yet. Start a conversation!</p>
                      </div>
                    ) : (
                      (() => {
                        const messageElements: React.ReactNode[] = [];
                        let lastDate: string | null = null;
                        
                        console.log('🗓️ Processing messages for date separators:', messages.length, 'messages');
                        
                        messages.forEach((message, index) => {
                          // Skip thread messages - they should only be shown when explicitly loaded
                          if (message.is_thread_message) {
                            console.log(`🚫 MessagesWidget: Skipping thread message ${message.id}`);
                            return;
                          }
                          
                          const currentMessageDate = new Date(message.timestamp).toDateString();
                          const showDateSeparator = currentMessageDate !== lastDate;
                          
                          console.log(`📅 Message ${index}: ${currentMessageDate}, lastDate: ${lastDate}, showSeparator: ${showDateSeparator}`);
                          
                          if (showDateSeparator) {
                            console.log(`✨ Adding date separator for: ${currentMessageDate}`);
                            messageElements.push(
                              <div key={`date-${message.id}`} className="flex items-center justify-center my-4">
                                <div className="flex-1 border-t border-muted"></div>
                                <span className="px-3 text-xs text-muted-foreground bg-background">
                                  {new Date(message.timestamp).toLocaleDateString([], { 
                                    weekday: 'long',
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </span>
                                <div className="flex-1 border-t border-muted"></div>
                              </div>
                            );
                            lastDate = currentMessageDate;
                          }
                          
                          // Message component
                          const isSystemMessage = message.type === 'system';
                          const isOwnMessage = message.user?.username === 'ankush1';
                          
                          messageElements.push(
                            <div key={message.id} className={`${message.is_thread_message ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
                              <div
                                className={`flex ${isOwnMessage && !isSystemMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    isSystemMessage
                                      ? 'bg-muted text-center text-sm italic mx-auto'
                                      : isOwnMessage
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                  {!isSystemMessage && (
                    <div className="text-xs text-muted-foreground mb-1">
                      {message.user?.username || message.user?.name}
                    </div>
                  )}
                                  <p className="text-sm">{message.text || message.content}</p>
                                  <div className="text-xs opacity-70 mt-1">
                                    {formatMessageTime(message.timestamp)}
                                  </div>
                                  
                                  {/* Reactions */}
                                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {Object.entries(message.reactions).map(([emoji, usernames]) => (
                                        <button
                                          key={emoji}
                                          className="flex items-center space-x-1 px-2 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-xs"
                                        >
                                          <span>{emoji}</span>
                                          <span>{usernames.length}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Thread count */}
                                  {message.thread_count && message.thread_count > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {message.thread_count} replies
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Thread messages */}
                              {message.thread_messages && message.thread_messages.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.thread_messages.map((threadMsg) => (
                                    <div key={threadMsg.id} className="ml-6 border-l-2 border-muted pl-4">
                                      <div className="flex justify-start">
                                        <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted/50">
                                          <div className="text-xs text-muted-foreground mb-1">
                                            {threadMsg.user?.username || threadMsg.user?.name}
                                          </div>
                                          <p className="text-sm">{threadMsg.text || threadMsg.content}</p>
                                          <div className="text-xs opacity-70 mt-1">
                                            {formatMessageTime(threadMsg.timestamp)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                        
                        console.log('📋 Total elements created:', messageElements.length);
                        return messageElements;
                      })()
                    )}
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <input
                        placeholder={`Message ${selectedChannel.display_name || selectedChannel.name}...`}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                        disabled
                      />
                    </div>
                    <button 
                      disabled
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-card rounded-lg border">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">Select a Channel</h3>
                  <p>Choose a channel from the sidebar to start viewing messages.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default MessagesWidget;