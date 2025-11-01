import React, { useState, useEffect, useCallback } from 'react';
import { Send, Phone, Video, MoreVertical, Hash, Lock, MessageSquare, Reply, Smile, ThumbsUp, Heart, Laugh, Angry, Frown, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { chatService, type ChatMessage, type ChatConversation } from '@/services/chat';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

// Message component with reactions and threads
const MessageComponent: React.FC<{ 
  message: ChatMessage; 
  isThreadMessage?: boolean;
  onReactionToggle: (messageId: string, emoji: string) => void;
  onSendThreadMessage: (parentMessageId: string, text: string) => void;
  onPinMessage: (messageId: string, messageText: string) => void;
  reactionEmojis: Array<{ emoji: string; icon: any; label: string }>;
  showReactionPicker: string | null;
  setShowReactionPicker: (messageId: string | null) => void;
  isPinned?: boolean;
}> = ({ 
  message, 
  isThreadMessage = false, 
  onReactionToggle, 
  onSendThreadMessage,
  onPinMessage,
  reactionEmojis,
  showReactionPicker,
  setShowReactionPicker,
  isPinned = false
}) => {
  const [showThreadInput, setShowThreadInput] = useState(false);
  const [threadMessage, setThreadMessage] = useState('');
  const [sendingThread, setSendingThread] = useState(false);
  const { user } = useAuth();
  
  const isSystemMessage = message.type === 'system';
  
  // Simple: Use the isOwn flag from backend (it's already calculated correctly)
  const isOwnMessage = message.isOwn === true;
  
  // Debug logging for message ownership
  console.log('🔍 ChatWindow Message ownership check:', {
    messageId: message.id,
    messageUser: message.user?.username,
    messageUserName: message.user?.name,
    messageSender: message.sender,
    currentUserEmail: user?.email,
    isOwnFromBackend: message.isOwn,
    isOwnMessage,
    messageData: message
  });
  
  const hasThreadMessages = message.thread_messages && message.thread_messages.length > 0;
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  const handleSendThreadMessageLocal = async () => {
    if (!threadMessage.trim()) return;
    
    setSendingThread(true);
    try {
      await onSendThreadMessage(message.id, threadMessage);
      setThreadMessage('');
      setShowThreadInput(false);
    } finally {
      setSendingThread(false);
    }
  };

  return (
    <div className={`${isThreadMessage ? 'ml-6 border-l-2 border-muted pl-4' : ''}`}>
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
          {!isSystemMessage && !isOwnMessage && (
            <div className="text-xs text-muted-foreground mb-1">
              {message.user?.username || message.user?.name || message.sender}
            </div>
          )}
          <p className="text-sm">{message.text || message.content}</p>
          <div className="text-xs opacity-70 mt-1">
            {formatMessageTime(message.timestamp)}
          </div>
          
          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, usernames]) => (
                <button
                  key={emoji}
                  onClick={() => onReactionToggle(message.id, emoji)}
                  className="flex items-center space-x-1 px-2 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-xs"
                >
                  <span>{emoji}</span>
                  <span>{usernames.length}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Action buttons */}
          {!isSystemMessage && (
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
              >
                <Smile className="h-3 w-3" />
                <span>React</span>
              </button>
              
              <button
                onClick={() => setShowThreadInput(!showThreadInput)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
                {message.thread_count && message.thread_count > 0 && (
                  <span>({message.thread_count})</span>
                )}
              </button>
              
              <button
                onClick={() => onPinMessage(message.id, message.text || message.content || '')}
                className={`text-xs flex items-center space-x-1 ${
                  isPinned 
                    ? 'text-primary hover:text-primary/80' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isPinned ? 'Pinned message' : 'Pin message'}
              >
                <Pin className={`h-3 w-3 ${isPinned ? 'fill-current' : ''}`} />
                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Reaction picker */}
      {showReactionPicker === message.id && (
        <div className="flex space-x-1 mt-2 ml-4">
          {reactionEmojis.map(({ emoji, icon: Icon, label }) => (
            <button
              key={emoji}
              onClick={() => {
                onReactionToggle(message.id, emoji);
                setShowReactionPicker(null);
              }}
              className="p-1 rounded-full hover:bg-secondary transition-colors"
              title={label}
            >
              <span className="text-lg">{emoji}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Thread input */}
      {showThreadInput && (
        <div className="mt-2 ml-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Reply to this message..."
              value={threadMessage}
              onChange={(e) => setThreadMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendThreadMessageLocal();
                }
              }}
              className="flex-1"
              disabled={sendingThread}
            />
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSendThreadMessageLocal();
              }}
              disabled={!threadMessage.trim() || sendingThread}
              size="sm"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Thread messages */}
      {hasThreadMessages && (
        <div className="mt-2 space-y-2">
          {message.thread_messages!.map((threadMsg) => (
            <MessageComponent
              key={threadMsg.id}
              message={threadMsg}
              isThreadMessage={true}
              onReactionToggle={onReactionToggle}
              onSendThreadMessage={onSendThreadMessage}
              onPinMessage={() => {}}
              reactionEmojis={reactionEmojis}
              showReactionPicker={showReactionPicker}
              setShowReactionPicker={setShowReactionPicker}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ChatWindowProps {
  selectedChannel: ChatConversation;
  isAuthenticated: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedChannel, isAuthenticated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const { toast } = useToast();

  // Common reaction emojis
  const reactionEmojis = [
    { emoji: '👍', icon: ThumbsUp, label: 'Like' },
    { emoji: '❤️', icon: Heart, label: 'Love' },
    { emoji: '😂', icon: Laugh, label: 'Laugh' },
    { emoji: '😮', icon: Frown, label: 'Surprised' },
    { emoji: '😢', icon: Frown, label: 'Sad' },
    { emoji: '😡', icon: Angry, label: 'Angry' },
    { emoji: '🔥', icon: Heart, label: 'Fire' },
    { emoji: '💯', icon: ThumbsUp, label: '100' }
  ];

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

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChannel || sending) return;

    try {
      setSending(true);
      
      // For private groups, use rocket_chat_group_id if available, otherwise normalize the name
      let channelIdentifier;
      if (selectedChannel.type === 'private_group') {
        // For private groups, use rocket_chat_group_id if available, otherwise normalize the name
        if ((selectedChannel as any).rocket_chat_group_id) {
          channelIdentifier = (selectedChannel as any).rocket_chat_group_id;
          console.log('🔍 Using rocket_chat_group_id for main message:', channelIdentifier);
        } else {
          // Fallback to normalized group name
          channelIdentifier = selectedChannel.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          console.log('🔍 Using normalized group name for main message:', channelIdentifier);
        }
        
        console.log('🔍 Private group identifier:', { 
          rocket_chat_group_id: (selectedChannel as any).rocket_chat_group_id,
          name: selectedChannel.name,
          normalizedName: channelIdentifier,
          finalIdentifier: channelIdentifier 
        });
      } else {
        channelIdentifier = selectedChannel.name || selectedChannel.id;
      }
      
      const channelType = selectedChannel.type === 'private_group' ? 'group' : 'channel';

      console.log('🔍 Sending message to:', { channelIdentifier, channelType, selectedChannel });

      await chatService.sendRocketChatChannelMessage(
        channelIdentifier,
        newMessage,
        channelType
      );

      setNewMessage('');
      
      // Reload messages to show the new message
      await loadMessages();
      
      toast({
        title: "Message sent!",
        description: `Your message has been sent to ${selectedChannel.name}`,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: `Failed to send message to ${selectedChannel.name}`,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedChannel, sending, loadMessages, toast]);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle reaction toggle
  const handleReactionToggle = async (messageId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = messages.find(m => m.id === messageId);
      if (!message || !message.reactions) return;

      const hasReacted = message.reactions[emoji]?.includes('ankush1'); // Replace with actual current user
      
      if (hasReacted) {
        await chatService.removeReaction(messageId, emoji);
        toast({
          title: "Reaction removed",
          description: `Removed ${emoji} reaction`,
        });
      } else {
        await chatService.addReaction(messageId, emoji);
        toast({
          title: "Reaction added",
          description: `Added ${emoji} reaction`,
        });
      }
      
      // Reload messages to show updated reactions
      await loadMessages();
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  // Handle thread message send
  const handleSendThreadMessage = async (parentMessageId: string, text: string) => {
    try {
      // Use the same channel identifier logic as main message sending
      let channelIdentifier;
      if (selectedChannel.type === 'private_group') {
        // For private groups, use rocket_chat_group_id if available, otherwise normalize the name
        if ((selectedChannel as any).rocket_chat_group_id) {
          channelIdentifier = (selectedChannel as any).rocket_chat_group_id;
          console.log('🔍 Using rocket_chat_group_id for thread message:', channelIdentifier);
        } else {
          // Fallback to normalized group name
          channelIdentifier = selectedChannel.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          console.log('🔍 Using normalized group name for thread message:', channelIdentifier);
        }
        
        console.log('🔍 Thread message - Private group identifier:', { 
          rocket_chat_group_id: (selectedChannel as any).rocket_chat_group_id,
          name: selectedChannel.name,
          normalizedName: channelIdentifier,
          finalIdentifier: channelIdentifier 
        });
      } else {
        channelIdentifier = selectedChannel.name || selectedChannel.id;
      }
      
      await chatService.sendThreadMessage(channelIdentifier, parentMessageId, text);
      
      toast({
        title: "Thread message sent!",
        description: "Your reply has been sent",
      });
      
      // Reload messages to show the new thread message
      await loadMessages();
      
      // Also reload thread messages for this specific parent message
      try {
        console.log('🔄 Reloading thread messages for parent:', parentMessageId);
        const threadMessages = await chatService.getThreadMessages(parentMessageId);
        console.log('📨 Thread messages received:', threadMessages);
        setThreadMessages(prev => {
          const updated = {
            ...prev,
            [parentMessageId]: threadMessages.messages || []
          };
          console.log('🔄 Updated thread messages state:', updated);
          return updated;
        });
      } catch (error) {
        console.error('Failed to reload thread messages:', error);
      }
    } catch (error) {
      console.error('Failed to send thread message:', error);
      toast({
        title: "Error",
        description: "Failed to send thread message",
        variant: "destructive",
      });
    }
  };

  const handlePinMessage = async (messageId: string, messageText: string) => {
    try {
      const roomId = selectedChannel.id;
      const roomName = selectedChannel.name || selectedChannel.display_name || '';
      const roomType = selectedChannel.type === 'private_group' ? 'group' : 'channel';
      
      console.log('📌 Pinning message:', { messageId, roomId, roomName, roomType });
      
      const response = await fetch('http://localhost:8000/chat/pin-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          message_id: messageId,
          room_id: roomId,
          room_name: roomName,
          room_type: roomType,
          message_text: messageText
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to pin message');
      }
      
      toast({
        title: "Message pinned!",
        description: "The message has been pinned successfully",
      });
      
      // Reload messages to update pinned status
      await loadMessages();
    } catch (error) {
      console.error('Failed to pin message:', error);
      toast({
        title: "Error",
        description: "Failed to pin message",
        variant: "destructive",
      });
    }
  };

  const isPrivate = selectedChannel.type === 'private_group' || selectedChannel.is_private;
  const channelDisplayName = selectedChannel.display_name || selectedChannel.name;

  return (
    <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
              {isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="font-semibold">{channelDisplayName}</h2>
              <p className="text-sm text-muted-foreground">
                {isPrivate ? 'Private Group' : 'Rocket.Chat Channel'}
                {selectedChannel.member_count && ` • ${selectedChannel.member_count} members`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="hover:bg-accent/10">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-accent/10">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-accent/10">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 scrollbar-hide min-h-0 max-h-full">
        <div className="space-y-4 pb-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            (() => {
              const messageElements: React.ReactNode[] = [];
              let lastDate: string | null = null;
              
              console.log('🗓️ Processing messages for date separators:', messages.length, 'messages');
              
              messages.forEach((message, index) => {
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
                
                messageElements.push(
                  <MessageComponent
                    key={message.id}
                    message={message}
                    isThreadMessage={false}
                    onReactionToggle={handleReactionToggle}
                    onSendThreadMessage={handleSendThreadMessage}
                    onPinMessage={handlePinMessage}
                    reactionEmojis={reactionEmojis}
                    showReactionPicker={showReactionPicker}
                    setShowReactionPicker={setShowReactionPicker}
                  />
                );
              });
              
              console.log('📋 Total elements created:', messageElements.length);
              return messageElements;
            })()
          )}
          
          {sending && (
            <div className="text-center text-muted-foreground py-2">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span>Sending...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              placeholder={`Message ${channelDisplayName}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="pr-12"
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
            className="transition-spring hover:scale-105"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatWindow;