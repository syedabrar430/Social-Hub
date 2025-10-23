import React, { useState, useEffect, useCallback, useRef } from 'react';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { type ChatConversation, type ChatMessage } from '@/services/chat';
import { chatService as rocketChatService } from '@/services/chat';
import { useToast } from '@/hooks/use-toast';
import { Hash, Lock, MessageCircle, Users, User, Search, Send, Smile, Reply } from 'lucide-react';

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

const EnhancedMessagesWidget = () => {
  console.log('🎯 EnhancedMessagesWidget component is rendering');
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'dms'>('all');
  
  // Chat data state
  const [channels, setChannels] = useState<ChatConversation[]>([]);
  const [groups, setGroups] = useState<ChatConversation[]>([]);
  const [directMessages, setDirectMessages] = useState<ChatConversation[]>([]);
  const [filteredDMs, setFilteredDMs] = useState<ChatConversation[]>([]);
  
  // Selected conversation and messages
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Loading states
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDMs, setLoadingDMs] = useState(false);
  const [loadingFilteredDMs, setLoadingFilteredDMs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Message input and sending
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Thread functionality
  const [threadMessages, setThreadMessages] = useState<{ [parentId: string]: ChatMessage[] }>({});
  const [loadingThread, setLoadingThread] = useState<string | null>(null);
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());
  const [threadReplyText, setThreadReplyText] = useState<{ [parentId: string]: string }>({});
  const [sendingThreadReply, setSendingThreadReply] = useState<string | null>(null);
  
  // Reactions
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all chat data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadChannelsAndDMs();
    }
  }, [isAuthenticated]);

  // Filter DMs based on messages
  useEffect(() => {
    let isMounted = true;
    console.log('🔍 DM Filter Effect - directMessages:', directMessages);
    if (directMessages.length > 0) {
      setLoadingFilteredDMs(true);
      // Simply use all DMs without filtering by messages
      setFilteredDMs(directMessages);
      setLoadingFilteredDMs(false);
    } else {
      console.log('❌ No direct messages to filter');
      setFilteredDMs([]);
      setLoadingFilteredDMs(false);
    }
    return () => { isMounted = false; };
  }, [directMessages]);

  const loadChannelsAndDMs = async () => {
    console.log('🔄 Loading channels, groups and DMs...');
    setLoadingChannels(true);
    setLoadingGroups(true);
    setLoadingDMs(true);
    
    try {
      // Load channels with messages
      const channelsData = await rocketChatService.getChannelsWithMessages();
      console.log('📺 Channels loaded:', channelsData);
      setChannels(channelsData);
      
      // Load groups with messages
      const groupsData = await rocketChatService.getGroupsWithMessages();
      console.log('👥 Groups loaded:', groupsData);
      setGroups(groupsData);
      
      // Load direct messages
      const dmsData = await rocketChatService.getDirectMessagesWithMessages();
      console.log('💬 DMs loaded:', dmsData);
      console.log('💬 DMs count:', dmsData.length);
      setDirectMessages(dmsData);
    } catch (error) {
      console.error('Failed to load channels, groups and DMs:', error);
    } finally {
      setLoadingChannels(false);
      setLoadingGroups(false);
      setLoadingDMs(false);
    }
  };

  const handleConversationSelect = async (conversation: ChatConversation) => {
    console.log('Selecting conversation:', conversation);
    setSelectedConversation(conversation);
    setLoadingMessages(true);

    try {
      let conversationMessages: ChatMessage[] = [];
      
      if (conversation.type === 'direct_message' && conversation.other_user) {
        console.log('Loading DM messages for:', conversation.other_user);
        conversationMessages = await rocketChatService.getDirectMessageMessages(conversation.other_user);
      } else {
        console.log('Loading channel messages for:', conversation.name || conversation.id);
        conversationMessages = await rocketChatService.getRocketChatChannelMessages(
          conversation.name || conversation.id,
          conversation.type === 'private_group' ? 'group' : 'channel'
        );
      }
      
      console.log('Loaded messages count:', conversationMessages.length);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !selectedConversation) return;

    const messageContent = newMessage;
    console.log('DEBUG: Sending message:', { messageContent, selectedConversation });
    setNewMessage('');
    setSendingMessage(true);

    try {
      if (selectedConversation.type === 'direct_message' && selectedConversation.other_user) {
        await rocketChatService.sendDirectMessage(selectedConversation.other_user, messageContent);
      } else {
        await rocketChatService.sendRocketChatChannelMessage(
          selectedConversation.name || selectedConversation.id,
          messageContent,
          selectedConversation.type === 'private_group' ? 'group' : 'channel'
        );
      }
      
      // Add the sent message to the messages array instead of reloading
      const newMessageObj: ChatMessage = {
        id: Date.now().toString(), // Temporary ID
        text: messageContent,
        content: messageContent,
        user: {
          id: user?.id?.toString() || '',
          username: user?.email?.split('@')[0] || user?.name || 'You',
          name: user?.name || 'You'
        },
        timestamp: new Date().toISOString(),
        type: 'message'
      };
      
      setMessages(prev => [...prev, newMessageObj]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReactionToggle = async (messageId: string, emoji: string) => {
    try {
      await rocketChatService.toggleReaction(messageId, emoji);
      // Update reactions locally instead of reloading all messages
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const currentReactions = msg.reactions || {};
          const currentUsers = currentReactions[emoji] || [];
          const currentUser = user?.email?.split('@')[0] || user?.name || 'You';
          
          // Toggle reaction
          const newUsers = currentUsers.includes(currentUser) 
            ? currentUsers.filter(u => u !== currentUser)
            : [...currentUsers, currentUser];
          
          // Remove emoji if no users left
          const newReactions = { ...currentReactions };
          if (newUsers.length === 0) {
            delete newReactions[emoji];
          } else {
            newReactions[emoji] = newUsers;
          }
          
          return { ...msg, reactions: newReactions };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleLoadThread = async (parentMessageId: string) => {
    if (openThreads.has(parentMessageId)) {
      setOpenThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentMessageId);
        return newSet;
      });
      return;
    }

    setLoadingThread(parentMessageId);
    try {
      const result = await rocketChatService.getThreadMessages(parentMessageId);
      setThreadMessages(prev => ({ ...prev, [parentMessageId]: result.messages }));
      setOpenThreads(prev => new Set([...prev, parentMessageId]));
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setLoadingThread(null);
    }
  };

  const handleSendThreadReply = async (parentMessageId: string) => {
    const replyText = threadReplyText[parentMessageId];
    if (!replyText?.trim() || sendingThreadReply === parentMessageId) return;

    console.log('DEBUG: Sending thread reply:', { parentMessageId, replyText, selectedConversation });
    setSendingThreadReply(parentMessageId);
    try {
      await rocketChatService.sendThreadMessage(selectedConversation?.name || selectedConversation?.id || '', parentMessageId, replyText);
      setThreadReplyText(prev => ({ ...prev, [parentMessageId]: '' }));
      
      // Add the thread reply to the thread messages instead of reloading
      const newThreadMessage: ChatMessage = {
        id: Date.now().toString(), // Temporary ID
        text: replyText,
        content: replyText,
        user: {
          id: user?.id?.toString() || '',
          username: user?.email?.split('@')[0] || user?.name || 'You',
          name: user?.name || 'You'
        },
        timestamp: new Date().toISOString(),
        type: 'message',
        is_thread_message: true
      };
      
      setThreadMessages(prev => ({
        ...prev,
        [parentMessageId]: [...(prev[parentMessageId] || []), newThreadMessage]
      }));
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    } finally {
      setSendingThreadReply(null);
    }
  };

  // Get conversations based on active tab
  const getConversations = () => {
    console.log('🔍 getConversations called:', {
      activeTab,
      channels: channels.length,
      groups: groups.length,
      directMessages: directMessages.length,
      filteredDMs: filteredDMs.length
    });
    
    switch (activeTab) {
      case 'all':
        return [...channels, ...groups, ...directMessages];
      case 'groups':
        return [...channels, ...groups];
      case 'dms':
        return directMessages;
      default:
        return [];
    }
  };

  const conversations = getConversations();
  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log('🔍 EnhancedMessagesWidget - Conversations:', {
    activeTab,
    channels: channels.length,
    groups: groups.length,
    directMessages: directMessages.length,
    filteredDMs: filteredDMs.length,
    conversations: conversations.length,
    filteredConversations: filteredConversations.length
  });

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
          {/* Conversations List Sidebar */}
          <div className="md:col-span-4 lg:col-span-3">
            <Card className="h-full">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold mb-3">Messages</h2>
                
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
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

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="p-4 space-y-2">
                  {filteredConversations.length === 0 ? (
                    <div className="flex justify-center items-center h-20">
                      <div className="text-sm text-gray-500 text-center">
                        No conversations found
                      </div>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => {
                      const isSelected = selectedConversation?.id === conversation.id;
                      const isDM = conversation.type === 'direct_message';
                      const isGroup = conversation.type === 'private_group';
                      const isChannel = conversation.type === 'channel';
                      
                      return (
                        <div
                          key={conversation.id}
                          className={`p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : ''
                          }`}
                          onClick={() => handleConversationSelect(conversation)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                isDM ? 'bg-green-500' : isGroup ? 'bg-purple-500' : 'bg-blue-500'
                              }`}></div>
                              <div>
                                <div className="font-medium text-sm">
                                  {conversation.display_name || conversation.name || conversation.other_user}
                                </div>
                                {conversation.description && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {conversation.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {conversation.unread_count && conversation.unread_count > 0 ? `${conversation.unread_count} msgs` : 'Click to view'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-8 lg:col-span-9">
            {selectedConversation ? (
              <div className="h-full bg-card rounded-lg border flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                        selectedConversation.type === 'direct_message' ? 'bg-green-500' :
                        selectedConversation.type === 'private_group' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {selectedConversation.type === 'direct_message' ? <User className="h-5 w-5" /> :
                         selectedConversation.type === 'private_group' ? <Users className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                      </div>
                      <div>
                        <h2 className="font-semibold">{selectedConversation.display_name || selectedConversation.name || selectedConversation.other_user}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedConversation.type === 'direct_message' ? 'Direct Message' :
                           selectedConversation.type === 'private_group' ? 'Private Group' : 'Rocket.Chat Channel'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 overflow-y-auto p-4 scrollbar-hide min-h-0 max-h-full">
                  <div className="space-y-4 pb-4">
                    {loadingMessages ? (
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
                        
                        messages.forEach((message, index) => {
                          if (message.is_thread_message) return;
                          
                          const currentMessageDate = new Date(message.timestamp).toDateString();
                          const showDateSeparator = currentMessageDate !== lastDate;
                          
                          if (showDateSeparator) {
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
                          
                          const isSystemMessage = message.type === 'system';
                          const isOwnMessage = message.user?.username === user?.email?.split('@')[0] || 
                                             message.user?.username === 'ankush1' ||
                                             message.user?.username === user?.name?.toLowerCase().replace(/\s+/g, '');
                          
                          messageElements.push(
                            <div key={message.id} className={`${message.is_thread_message ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
                              <div className={`flex ${isOwnMessage && !isSystemMessage ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isSystemMessage
                                    ? 'bg-muted text-center text-sm italic mx-auto'
                                    : isOwnMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}>
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
                                    <div className="flex gap-2 mt-2">
                                      {Object.entries(message.reactions).map(([emoji, usernames]) => (
                                        <button
                                          key={emoji}
                                          className="px-2 py-1 rounded bg-gray-200 text-xs hover:bg-gray-300 cursor-pointer"
                                          onClick={() => handleReactionToggle(message.id, emoji)}
                                        >
                                          {emoji} {usernames.length}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Thread count display */}
                                  {message.thread_count && message.thread_count > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
                                    </div>
                                  )}
                                  
                                  {/* Action buttons */}
                                  {!isSystemMessage && (
                                    <div className="flex items-center space-x-2 mt-2">
                                      <button
                                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        <Smile className="h-3 w-3" />
                                      </button>
                                      {message.thread_count && message.thread_count > 0 && (
                                        <button
                                          onClick={() => handleLoadThread(message.id)}
                                          className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
                                        >
                                          <Reply className="h-3 w-3" />
                                          <span>View thread ({message.thread_count})</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Thread messages */}
                              {openThreads.has(message.id) && threadMessages[message.id] && (
                                <div className="mt-2 space-y-2">
                                  {threadMessages[message.id].map((threadMsg) => (
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
                                  
                                  {/* Thread reply input */}
                                  <div className="ml-6 pl-4">
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        placeholder="Reply in thread..."
                                        value={threadReplyText[message.id] || ''}
                                        onChange={(e) => setThreadReplyText(prev => ({ ...prev, [message.id]: e.target.value }))}
                                        className="flex-1 text-sm"
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendThreadReply(message.id);
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleSendThreadReply(message.id)}
                                        disabled={!threadReplyText[message.id]?.trim() || sendingThreadReply === message.id}
                                      >
                                        {sendingThreadReply === message.id ? 'Sending...' : 'Reply'}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        });
                        
                        return messageElements;
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder={`Message ${selectedConversation.display_name || selectedConversation.name || selectedConversation.other_user}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="w-full"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-card rounded-lg border">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                  <p>Choose a conversation from the sidebar to start viewing messages.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default EnhancedMessagesWidget;
