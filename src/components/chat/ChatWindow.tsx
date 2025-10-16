import React, { useState, useEffect, useCallback } from 'react';
import { Send, Phone, Video, MoreVertical, Hash, Lock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { chatService, type ChatMessage, type ChatConversation } from '@/services/chat';
import { useToast } from '@/hooks/use-toast';

interface ChatWindowProps {
  selectedChannel: ChatConversation;
  isAuthenticated: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedChannel, isAuthenticated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Load messages for selected channel
  const loadMessages = useCallback(async () => {
    if (!selectedChannel || !isAuthenticated) return;

    try {
      setLoading(true);
      console.log('Loading messages for channel:', selectedChannel.name);

      const channelIdentifier = selectedChannel.name || selectedChannel.id;
      const channelType = selectedChannel.type === 'private_group' ? 'group' : 'channel';

      const channelMessages = await chatService.getRocketChatChannelMessages(
        channelIdentifier,
        channelType
      );

      // Sort messages by timestamp (oldest first)
      const sortedMessages = channelMessages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setMessages(sortedMessages);
      console.log(`Loaded ${sortedMessages.length} messages for ${selectedChannel.name}`);
    } catch (error) {
      console.error('Failed to load messages:', error);
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
      const channelIdentifier = selectedChannel.name || selectedChannel.id;
      const channelType = selectedChannel.type === 'private_group' ? 'group' : 'channel';

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
            messages.map((message) => {
              const isSystemMessage = message.type === 'system';
              const isOwnMessage = message.user?.username === 'ankush1'; // You may want to get this from auth context

              return (
                <div
                  key={message.id}
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
                        {message.user?.name || message.user?.username}
                      </div>
                    )}
                    <p className="text-sm">{message.text || message.content}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
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