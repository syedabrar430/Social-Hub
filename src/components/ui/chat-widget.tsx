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
  const [groups, setGroups] = useState<ChatConversation[]>([]);
  const [directMessages, setDirectMessages] = useState<ChatConversation[]>([]);
  const [filteredDMs, setFilteredDMs] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDMs, setLoadingDMs] = useState(false);
  const [loadingFilteredDMs, setLoadingFilteredDMs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [threadMessages, setThreadMessages] = useState<{ [parentId: string]: ChatMessage[] }>({});
  const [loadingThread, setLoadingThread] = useState<string | null>(null);
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [threadReplyText, setThreadReplyText] = useState<{ [parentId: string]: string }>({});
  const [sendingThreadReply, setSendingThreadReply] = useState<string | null>(null);
  
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
    setLoadingGroups(true);
    setLoadingDMs(true);
    
    try {
      // Load channels with messages
      const channelsData = await rocketChatService.getChannelsWithMessages();
      setChannels(channelsData);
      
      // Load groups with messages
      const groupsData = await rocketChatService.getGroupsWithMessages();
      setGroups(groupsData);
      
      // Load direct messages
      const dmsData = await rocketChatService.getDirectMessagesWithMessages();
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
    setShowList(false);
    setLoadingMessages(true);

    try {
      let conversationMessages: ChatMessage[] = [];
      
      if (conversation.type === 'direct_message' && conversation.other_user) {
        console.log('Loading DM messages for:', conversation.other_user);
        // Load DM messages
        conversationMessages = await rocketChatService.getDirectMessageMessages(conversation.other_user);
      } else {
        console.log('Loading channel messages for:', conversation.name || conversation.id);
        // Load channel messages
        conversationMessages = await rocketChatService.getRocketChatChannelMessages(
          conversation.name || conversation.id,
          conversation.type === 'private_group' ? 'group' : 'channel'
        );
      }
      
      console.log('Loaded messages count:', conversationMessages.length);
      setMessages(conversationMessages);
      setThreadMessages({}); // Reset thread messages when switching conversation
      
      // Debug: Log message data to check for reactions and threads
      console.log('Loaded messages:', conversationMessages);
      conversationMessages.forEach(msg => {
        console.log(`Message ${msg.id}: reactions=${JSON.stringify(msg.reactions)}, thread_count=${msg.thread_count}, reply_count=${msg.reply_count}`);
      });
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

  // Fetch thread messages for a parent message
  const handleViewThread = async (parentMessageId: string) => {
    setLoadingThread(parentMessageId);
    try {
      const result = await rocketChatService.getThreadMessages(parentMessageId);
      setThreadMessages(prev => ({ ...prev, [parentMessageId]: result.messages }));
      setOpenThreads(prev => new Set([...prev, parentMessageId]));
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setThreadMessages(prev => ({ ...prev, [parentMessageId]: [] }));
    } finally {
      setLoadingThread(null);
    }
  };

  const handleCloseThread = (parentMessageId: string) => {
    setOpenThreads(prev => {
      const newSet = new Set(prev);
      newSet.delete(parentMessageId);
      return newSet;
    });
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await rocketChatService.addReaction(messageId, emoji);
      // Reload messages to show the reaction
      if (selectedConversation) {
        if (selectedConversation.type === 'direct_message' && selectedConversation.other_user) {
          const updatedMessages = await rocketChatService.getDirectMessageMessages(selectedConversation.other_user);
          setMessages(updatedMessages);
        } else {
          const updatedMessages = await rocketChatService.getRocketChatChannelMessages(
            selectedConversation.name || selectedConversation.id,
            selectedConversation.type === 'private_group' ? 'group' : 'channel'
          );
          setMessages(updatedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleReactionClick = (messageId: string) => {
    setShowReactionPicker(showReactionPicker === messageId ? null : messageId);
  };

  const handleReplyInThread = (parentMessageId: string) => {
    setOpenThreads(prev => new Set([...prev, parentMessageId]));
    // Focus the thread input field
    setTimeout(() => {
      const input = document.getElementById(`thread-input-${parentMessageId}`);
      if (input) {
        input.focus();
      }
    }, 100);
  };

  const handleSendThreadReply = async (parentMessageId: string) => {
    const replyText = threadReplyText[parentMessageId];
    if (!replyText?.trim() || sendingThreadReply === parentMessageId) return;

    console.log('DEBUG: Sending thread reply:', { parentMessageId, replyText, selectedConversation });
    setSendingThreadReply(parentMessageId);
    try {
      await rocketChatService.sendThreadMessage(selectedConversation?.name || selectedConversation?.id || '', parentMessageId, replyText);
      setThreadReplyText(prev => ({ ...prev, [parentMessageId]: '' }));
      
      // Reload thread messages
      const result = await rocketChatService.getThreadMessages(parentMessageId);
      setThreadMessages(prev => ({ ...prev, [parentMessageId]: result.messages }));
    } catch (error) {
      console.error('Failed to send thread reply:', error);
    } finally {
      setSendingThreadReply(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !selectedConversation) return;

    const messageContent = newMessage;
    console.log('DEBUG: Sending message:', { messageContent, selectedConversation });
    setNewMessage('');
    setSendingMessage(true);

    try {
      // Send to channel or DM based on type
      if (selectedConversation.type === 'direct_message' && selectedConversation.other_user) {
        console.log('DEBUG: Sending DM to:', selectedConversation.other_user);
        await rocketChatService.sendDirectMessage(selectedConversation.other_user, messageContent);
        // Reload DM messages
        const updatedMessages = await rocketChatService.getDirectMessageMessages(selectedConversation.other_user);
        setMessages(updatedMessages);
      } else {
        console.log('DEBUG: Sending channel message to:', selectedConversation.name || selectedConversation.id);
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
              {showList ? 'Chats' : selectedConversation?.name || 'Chat'}
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
                    {activeTab === 'all' && (
                      <>
                        {loadingChannels || loadingGroups ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500">Loading channels and groups...</div>
                          </div>
                        ) : (channels.length === 0 && groups.length === 0) ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500 text-center">
                              No channels or groups found
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Show Channels */}
                            {channels.map((channel) => (
                              <div
                                key={channel.id}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...channel, type: 'channel' })}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {channel.name}
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
                            ))}
                            
                            {/* Show Groups */}
                            {groups.map((group) => (
                              <div
                                key={group.id}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...group, type: 'private_group' })}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {group.name}
                                      </div>
                                      {group.description && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {group.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {group.unread_count && group.unread_count > 0 ? `${group.unread_count} msgs` : 'Click to view'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                    
                    {activeTab === 'groups' && (
                      <>
                        {loadingChannels || loadingGroups ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500">Loading groups...</div>
                          </div>
                        ) : (channels.length === 0 && groups.length === 0) ? (
                          <div className="flex justify-center items-center h-20">
                            <div className="text-sm text-gray-500 text-center">
                              No groups found
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Show Channels in Groups tab */}
                            {channels.map((channel) => (
                              <div
                                key={channel.id}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...channel, type: 'channel' })}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {channel.name}
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
                            ))}
                            
                            {/* Show Private Groups */}
                            {groups.map((group) => (
                              <div
                                key={group.id}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...group, type: 'private_group' })}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {group.name}
                                      </div>
                                      {group.description && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {group.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {group.unread_count && group.unread_count > 0 ? `${group.unread_count} msgs` : 'Click to view'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
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
                            const displayName = dm.name || '';
                            const users = displayName.includes(',')
                              ? displayName.split(',').map(name => name.trim())
                              : [displayName];
                            return users.map((userName, index) => (
                              <div
                                key={`${dm.id}-${index}`}
                                className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                onClick={() => handleConversationSelect({ ...dm, other_user: userName, name: userName, type: 'direct_message' })}
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
                (() => {
                  console.log('Rendering messages:', messages.length, messages);
                  return messages.map((message) => {
                  const isOwnMessage = message.user?.username === user?.email?.split('@')[0];
                  return (
                    <div key={message.id} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
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
                                  {message.user?.username || message.user?.name}
                                </div>
                              )}
                              <div className="text-sm break-words">
                                {message.content || message.text || 'No content'}
                              </div>
                              <div className={`text-xs mt-1 opacity-70`}>
                                {formatTimestamp(message.timestamp)}
                              </div>
                              {/* Message reactions */}
                              {message.reactions && Object.keys(message.reactions).length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {Object.entries(message.reactions).map(([emoji, users]) => (
                                    <button
                                      key={emoji}
                                      className="px-2 py-1 rounded bg-gray-200 text-xs hover:bg-gray-300 cursor-pointer"
                                      onClick={() => handleReaction(message.id, emoji)}
                                    >
                                      {emoji} {users.length}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="mt-2 flex gap-1">
                                {/* Reaction Button */}
                                <div className="relative">
                                  <button
                                    className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    onClick={() => handleReactionClick(message.id)}
                                    title="Add reaction"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Reaction Picker */}
                                  {showReactionPicker === message.id && (
                                    <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 ${
                                      isOwnMessage ? 'right-0' : 'left-0'
                                    }`}>
                                      <div className="flex gap-1">
                                        {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                          <button
                                            key={emoji}
                                            className="text-lg hover:bg-gray-100 rounded p-1"
                                            onClick={() => handleReaction(message.id, emoji)}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Reply in Thread Button */}
                                <button
                                  className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                                  onClick={() => handleReplyInThread(message.id)}
                                  title="Reply in thread"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* Thread replies UI */}
                              {(message.thread_count || message.reply_count) > 0 && !openThreads.has(message.id) && (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewThread(message.id)}
                                    disabled={loadingThread === message.id}
                                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                  >
                                    {loadingThread === message.id ? 'Loading thread...' : `View thread (${message.thread_count || message.reply_count})`}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Thread messages display - positioned below THIS specific message */}
                      {openThreads.has(message.id) && (
                        <div className="mt-2 ml-8">
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-700">Thread replies</h4>
                              <button
                                onClick={() => handleCloseThread(message.id)}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                                title="Close thread"
                              >
                                ✕
                              </button>
                            </div>
                            
                            {/* Thread Messages */}
                            <div className="space-y-3">
                              {threadMessages[message.id] && threadMessages[message.id].length > 0 ? (
                                threadMessages[message.id].map((threadMsg) => (
                                  <div key={threadMsg.id} className="border-l-2 border-blue-200 pl-3">
                                    <div className="text-xs font-medium text-gray-600">
                                      {threadMsg.user?.username || threadMsg.user?.name}
                                    </div>
                                    <div className="text-sm text-gray-800 mt-1">
                                      {threadMsg.content || threadMsg.text || 'No content'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {formatTimestamp(threadMsg.timestamp)}
                                    </div>
                                    {/* Thread message reactions */}
                                    {threadMsg.reactions && Object.keys(threadMsg.reactions).length > 0 && (
                                      <div className="flex gap-2 mt-1">
                                        {Object.entries(threadMsg.reactions).map(([emoji, users]) => (
                                          <span key={emoji} className="px-2 py-1 rounded bg-gray-200 text-xs">
                                            {emoji} {users.length}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  No replies yet. Be the first to reply!
                                </div>
                              )}
                            </div>
                            
                            {/* Thread Reply Input */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex gap-2">
                                <Input
                                  id={`thread-input-${message.id}`}
                                  value={threadReplyText[message.id] || ''}
                                  onChange={(e) => setThreadReplyText(prev => ({ ...prev, [message.id]: e.target.value }))}
                                  placeholder="Reply in thread..."
                                  className="flex-1 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendThreadReply(message.id);
                                    }
                                  }}
                                />
                                <Button 
                                  onClick={() => handleSendThreadReply(message.id)}
                                  disabled={!threadReplyText[message.id]?.trim() || sendingThreadReply === message.id}
                                  size="sm"
                                >
                                  {sendingThreadReply === message.id ? 'Sending...' : 'Reply'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  });
                })()
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
