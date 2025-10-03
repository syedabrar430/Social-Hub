import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Search, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import MessageBubble from '@/components/ui/message-bubble';
import { mockConversations, currentUser } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { chatService, type ChatMessage } from '@/services/chat';

const Messages = () => {
  // Initialize with Rocket.Chat conversation immediately
  const rocketChatConv = {
    id: 'rocket-chat',
    participants: [
      currentUser,
      {
        id: 'rocket-chat-bot',
        name: 'Rocket.Chat #121',
        avatar: '🚀',
        email: 'rocket@chat.com',
        bio: 'Rocket.Chat Integration - Room #121',
        following: 0,
        followers: 0
      }
    ],
    messages: [],
    lastMessage: {
      id: 'last',
      senderId: 'rocket-chat-bot',
      receiverId: currentUser.id,
      content: 'Connected to Rocket.Chat',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    }
  };
  
  const [selectedConversation, setSelectedConversation] = useState(rocketChatConv);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages from Rocket.Chat
  const loadMessages = useCallback(async () => {
    try {
      const response = await chatService.getMessages("121");
      // Sort messages by timestamp (oldest first, newest at bottom)
      const sortedMessages = (response.messages || []).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setChatMessages(sortedMessages);
      // Auto-scroll to bottom after loading messages
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages from Rocket.Chat",
        variant: "destructive",
      });
    }
  }, [toast]);

    const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // If it's the Rocket.Chat conversation, send to real Rocket.Chat
    if (selectedConversation?.id === 'rocket-chat') {
      setLoading(true);
      try {
        await chatService.sendMessage("121", newMessage);
        setNewMessage('');
        
        // Reload messages to show the new message
        await loadMessages();
        
        toast({
          title: "Message sent to Rocket.Chat!",
          description: "Your message has been sent to room #121",
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          title: "Error",
          description: "Failed to send message to Rocket.Chat",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Handle mock conversations (existing functionality)
      const message = {
        id: String(Date.now()),
        senderId: currentUser.id,
        receiverId: selectedConversation?.participants.find(p => p.id !== currentUser.id)?.id || '',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };

      setNewMessage('');
      
      toast({
        title: "Mock message sent!",
        description: "Your message has been delivered to mock conversation.",
      });
    }
  };



  // Load messages when component mounts
  useEffect(() => {
    loadMessages();
    // Optionally set up polling to refresh messages
    const interval = setInterval(loadMessages, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadMessages]);



  // Use the already created Rocket.Chat conversation
  const allConversations = [rocketChatConv, ...mockConversations];
  
  const filteredConversations = allConversations.filter(conv =>
    conv.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const otherParticipant = selectedConversation?.participants.find(p => p.id !== currentUser.id);

  return (
    <ResponsiveLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-120px)]">
        <Card className="h-full shadow-card animate-fade-in">
          <div className="grid md:grid-cols-3 h-full">
            {/* Conversations List */}
            <div className="md:col-span-1 border-r">
              <CardHeader className="pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => {
                    const otherUser = conversation.participants.find(p => p.id !== currentUser.id);
                    const isSelected = selectedConversation.id === conversation.id;
                    
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-4 cursor-pointer hover:bg-accent/50 transition-smooth ${
                          isSelected ? 'bg-primary/10 border-r-2 border-r-primary' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                            {otherUser?.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm truncate">
                                {otherUser?.name}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                {conversation.lastMessage.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage.content}
                            </p>
                          </div>
                          {!conversation.lastMessage.read && conversation.lastMessage.senderId !== currentUser.id && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </div>

            {/* Chat Area */}
            <div className="md:col-span-2 flex flex-col min-h-0">
              {selectedConversation ? (
              <>
              {/* Chat Header */}
              <CardHeader className="pb-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                      {otherParticipant?.avatar}
                    </div>
                    <div>
                      <h2 className="font-semibold">{otherParticipant?.name}</h2>
                      <p className="text-sm text-muted-foreground">Active now</p>
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

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 scrollbar-hide min-h-0 max-h-full">
                <div className="space-y-3 min-h-0 w-full max-w-full">
                  {selectedConversation.id === 'rocket-chat' ? (
                    // Show real Rocket.Chat messages
                    chatMessages.length > 0 ? (
                      chatMessages.map((message) => (
                        <div key={message.id} className="flex flex-col space-y-1 max-w-full">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{message.user?.name || message.user?.username || 'Unknown'}</span>
                            <span className="opacity-60">{new Date(message.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="bg-secondary/30 rounded-lg p-3 max-w-[85%] w-fit border">
                            <p className="text-sm break-words">{message.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <div className="text-center">
                          <div className="text-4xl mb-2">💬</div>
                          <p>No messages yet. Send the first message to Rocket.Chat!</p>
                        </div>
                      </div>
                    )
                  ) : (
                    // Show mock conversation messages
                    selectedConversation.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                  {loading && (
                    <div className="text-center text-muted-foreground py-2">
                      <div className="inline-flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Sending...</span>
                      </div>
                    </div>
                  )}
                  {/* Invisible element for auto-scroll */}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="pr-12"
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="transition-spring hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Loading conversations...</p>
              </div>
            )}
            </div>
          </div>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default Messages;