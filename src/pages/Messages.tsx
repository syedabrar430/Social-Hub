import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Search, Phone, Video, MoreVertical, Reply, MessageSquare, Paperclip, X, Download, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import MessageBubble from '@/components/ui/message-bubble';
import { currentUser } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { chatService, type ChatMessage } from '@/services/chat';

const Messages = () => {
  // Initialize multiple Rocket.Chat conversations
  const rocketChatConversations = [
    {
      id: 'rocket-chat-121',
      channelName: '121',
      participants: [
        currentUser,
        {
          id: 'rocket-chat-bot-121',
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
        id: 'last-121',
        senderId: 'rocket-chat-bot-121',
        receiverId: currentUser.id,
        content: 'Connected to Rocket.Chat #121',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      }
    },
    {
      id: 'rocket-chat-12034456',
      channelName: '12034456',
      participants: [
        currentUser,
        {
          id: 'rocket-chat-bot-12034456',
          name: 'Rocket.Chat #12034456',
          avatar: '🚀',
          email: 'rocket@chat.com',
          bio: 'Rocket.Chat Integration - Room #12034456',
          following: 0,
          followers: 0
        }
      ],
      messages: [],
      lastMessage: {
        id: 'last-12034456',
        senderId: 'rocket-chat-bot-12034456',
        receiverId: currentUser.id,
        content: 'Connected to Rocket.Chat #12034456',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      }
    },
    {
      id: 'rocket-chat-121212178',
      channelName: '121',
      participants: [
        currentUser,
        {
          id: 'rocket-chat-bot-121212178',
          name: 'Rocket.Chat #121212178',
          avatar: '🚀',
          email: 'rocket@chat.com',
          bio: 'Rocket.Chat Integration - Room #121212178',
          following: 0,
          followers: 0
        }
      ],
      messages: [],
      lastMessage: {
        id: 'last-121212178',
        senderId: 'rocket-chat-bot-121212178',
        receiverId: currentUser.id,
        content: 'Connected to Rocket.Chat #121212178',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
      }
    }
  ];
  
  const [selectedConversation, setSelectedConversation] = useState(rocketChatConversations[1]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<ChatMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [threadReply, setThreadReply] = useState('');
  const { toast } = useToast();
  
  // Image handling state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji conversion map for reactions
  const emojiMap: Record<string, string> = {
    ':+1:': '👍',
    ':-1:': '👎',
    ':heart:': '❤️',
    ':fire:': '🔥',
    ':laughing:': '😂',
    ':smile:': '😊',
    ':open_mouth:': '😮',
    ':cry:': '😢',
    ':angry:': '😠',
    ':thumbsup:': '👍',
    ':thumbsdown:': '👎',
    ':clap:': '👏',
    ':tada:': '🎉',
    ':rocket:': '🚀',
    ':eyes:': '👀',
    ':thinking_face:': '🤔',
    ':100:': '💯'
  };

  const convertEmojiName = (emojiName: string): string => {
    return emojiMap[emojiName] || emojiName;
  };
  
  // Removed automatic scrolling - users control scroll manually

  // Load messages from Rocket.Chat
  const loadMessages = useCallback(async () => {
    console.log('selectedConversation:', selectedConversation);
    console.log('selectedConversation.channelName:', selectedConversation?.channelName);
    
    if (!selectedConversation?.channelName) {
      console.log('No channel name available, skipping message load');
      return;
    }
    
    console.log('Loading messages for channel:', selectedConversation.channelName);
    
    try {
      const response = await chatService.getMessages(selectedConversation.channelName);
      console.log('API response:', response);
      console.log('Messages received:', response.messages?.length || 0);
      
      // Sort messages by timestamp (oldest first, newest at bottom)
      const sortedMessages = (response.messages || []).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log('Setting chat messages:', sortedMessages);
      
      // Debug: Check if reactions and thread_count are present
      sortedMessages.forEach((msg, index) => {
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
          console.log(`Message ${index} has reactions:`, msg.reactions);
        }
        if (msg.thread_count && msg.thread_count > 0) {
          console.log(`Message ${index} has ${msg.thread_count} thread replies`);
        }
      });
      
      setChatMessages(sortedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: `Failed to load messages from Rocket.Chat #${selectedConversation.channelName}`,
        variant: "destructive",
      });
    }
  }, [selectedConversation, toast]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation?.channelName) return;

    // Send message to the selected Rocket.Chat channel
    setLoading(true);
    try {
      await chatService.sendMessage(selectedConversation.channelName, newMessage);
      setNewMessage('');
      
      // Reload messages to show the new message
      await loadMessages();
      
      toast({
        title: "Message sent to Rocket.Chat!",
        description: `Your message has been sent to room #${selectedConversation.channelName}`,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: `Failed to send message to Rocket.Chat #${selectedConversation.channelName}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [newMessage, selectedConversation?.channelName, loadMessages, toast]);

  // Load thread messages for a parent message
  const loadThreadMessages = useCallback(async (parentMessageId: string) => {
    try {
      console.log('Loading thread messages for:', parentMessageId);
      const response = await chatService.getThreadMessages(parentMessageId);
      console.log('Thread messages response:', response);
      
      const sortedMessages = (response.messages || []).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setThreadMessages(sortedMessages);
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      toast({
        title: "Error",
        description: "Failed to load thread messages",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Send message in thread
  const sendThreadMessage = async () => {
    if (!threadReply.trim() || !openThread || !selectedConversation?.channelName) return;

    try {
      await chatService.sendThreadMessage(
        selectedConversation.channelName, 
        openThread.id, 
        threadReply
      );
      
      setThreadReply('');
      
      // Reload thread messages and main messages (to update thread count)
      await loadThreadMessages(openThread.id);
      
      // Small delay to allow Rocket.Chat to update, then reload main messages
      setTimeout(async () => {
        await loadMessages();
      }, 1000);
      
      toast({
        title: "Reply sent!",
        description: "Your thread reply has been sent",
      });
    } catch (error) {
      console.error('Failed to send thread message:', error);
      toast({
        title: "Error",
        description: "Failed to send thread reply",
        variant: "destructive",
      });
    }
  };

  // Image handling functions
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !selectedConversation?.channelName) return;

    setLoading(true);
    try {
      // Send image to chat service
      await chatService.sendImage(selectedConversation.channelName, selectedImage);
      
      // Clear image selection
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload messages to show the new image
      await loadMessages();
      
      toast({
        title: "Image sent!",
        description: "Your image has been shared in the chat",
      });
    } catch (error) {
      console.error('Failed to send image:', error);
      toast({
        title: "Error",
        description: "Failed to send image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      console.error('Failed to download image:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  // Load messages when component mounts or conversation changes
  useEffect(() => {
    loadMessages();
    // Optionally set up polling to refresh messages
    const interval = setInterval(loadMessages, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Reload messages when conversation changes
  useEffect(() => {
    loadMessages();
  }, [selectedConversation?.id, loadMessages]);

  // Click outside to close emoji pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openEmojiPicker !== null) {
        // Check if click is outside the emoji picker
        const target = event.target as Element;
        const isInsideEmojiPicker = target.closest('.emoji-picker-dropdown');
        const isInsideEmojiButton = target.closest('.emoji-hover-button');
        
        if (!isInsideEmojiPicker && !isInsideEmojiButton) {
          setOpenEmojiPicker(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openEmojiPicker]);

  // Use only Rocket.Chat conversations (remove dummy conversations)
  const allConversations = rocketChatConversations;
  
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
          <div className={`grid h-full ${openThread ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
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
            <div className={`${openThread ? 'md:col-span-2' : 'md:col-span-2'} flex flex-col min-h-0`}>
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
                  {selectedConversation.id.startsWith('rocket-chat') ? (
                    // Show real Rocket.Chat messages
                    chatMessages.length > 0 ? (
                      chatMessages.map((message) => (
                        <div key={message.id} className="flex flex-col space-y-1 w-full group relative">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{message.user?.name || message.user?.username || 'Unknown'}</span>
                            <span className="opacity-60">{new Date(message.timestamp).toLocaleTimeString()}</span>
                          </div>
                          
                          {/* Message bubble with hover reaction button */}
                          <div className="relative overflow-visible">
                            <div className="bg-secondary/30 rounded-lg p-3 max-w-[85%] w-fit border relative">
                              <p className="text-sm break-words">{message.text}</p>
                              
                              {/* View thread button - only shown if message has replies */}
                              {message.thread_count > 0 && (
                                <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-200 hover:border-blue-300 transition-all"
                                    onClick={() => {
                                      setOpenThread(message);
                                      loadThreadMessages(message.id);
                                    }}
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1.5" />
                                    View thread
                                    <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                      {message.thread_count} {message.thread_count === 1 ? 'reply' : 'replies'}
                                    </span>
                                  </Button>
                                </div>
                              )}
                              
                              {/* Hover action buttons - appear on hover */}
                              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                {/* Reply in thread button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-base bg-background border shadow-md hover:bg-accent hover:scale-110 rounded-full"
                                  onClick={() => {
                                    setOpenThread(message);
                                    // Load thread messages if any exist
                                    if (message.thread_count && message.thread_count > 0) {
                                      loadThreadMessages(message.id);
                                    }
                                  }}
                                  title="Reply in thread"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                
                                {/* Emoji reaction button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="emoji-hover-button h-8 w-8 p-0 text-base bg-background border shadow-md hover:bg-accent hover:scale-110 rounded-full"
                                  onClick={() => {
                                    setOpenEmojiPicker(openEmojiPicker === message.id ? null : message.id);
                                  }}
                                  title="Add reaction"
                                >
                                  😊
                                </Button>
                              </div>
                              
                              {/* Emoji picker - appears on button click */}
                              {openEmojiPicker === message.id && (
                              <div className="emoji-picker-dropdown absolute -top-16 bg-background border rounded-xl shadow-xl p-4 z-20 min-w-[280px]" 
                                style={{ 
                                  right: '-20px',
                                  left: 'auto'
                                }}>
                                {/* Header */}
                                <div className="text-xs font-medium text-muted-foreground mb-3 text-center">
                                  Choose a reaction
                                </div>
                                
                                {/* Emoji grid */}
                                <div className="grid grid-cols-4 gap-2">
                                  {['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '💯', '✨', '🚀'].map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="sm"
                                      className="h-12 w-12 p-0 text-xl hover:bg-accent hover:scale-110 transition-all duration-150 rounded-lg"
                                      onClick={async () => {
                                        try {
                                          await chatService.addReaction(message.id, emoji);
                                          
                                          // Hide emoji picker using state
                                          setOpenEmojiPicker(null);
                                          
                                          // Small delay to allow Rocket.Chat to update, then reload messages
                                          setTimeout(async () => {
                                            await loadMessages();
                                          }, 1000);
                                          
                                          // Show success feedback
                                          toast({
                                            title: "Reaction added!",
                                            description: `Added ${emoji} reaction`,
                                            duration: 2000,
                                          });
                                        } catch (error) {
                                          console.error('Failed to add reaction:', error);
                                          console.error('Error details:', {
                                            message: error instanceof Error ? error.message : 'Unknown error',
                                            stack: error instanceof Error ? error.stack : undefined,
                                            type: typeof error,
                                            error
                                          });
                                          
                                          toast({
                                            title: "Error",
                                            description: `Failed to add reaction: ${error instanceof Error ? error.message : String(error)}`,
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                                
                                {/* Footer */}
                                <div className="text-xs text-muted-foreground text-center mt-3 pt-2 border-t">
                                  Click to react
                                </div>
                              </div>
                              )}
                            </div>
                            
                            {/* Show existing reactions below the message */}
                            {message.reactions && Object.keys(message.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {Object.entries(message.reactions).map(([emoji, users]) => {
                                  const displayEmoji = convertEmojiName(emoji);
                                  return (
                                    <Button
                                      key={emoji}
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-3 text-sm bg-accent/30 hover:bg-accent/70 border-accent/50 rounded-full transition-all duration-150 hover:scale-105"
                                      onClick={async () => {
                                        try {
                                          // Send the original emoji name (e.g., ":fire:") to backend for removal
                                          await chatService.removeReaction(message.id, emoji);
                                          
                                          // Small delay to allow Rocket.Chat to update, then reload messages
                                          setTimeout(async () => {
                                            await loadMessages();
                                          }, 1000);
                                          
                                          toast({
                                            title: "Reaction removed",
                                            description: `Removed ${displayEmoji} reaction`,
                                            duration: 2000,
                                          });
                                        } catch (error) {
                                          console.error('Failed to remove reaction:', error);
                                          toast({
                                            title: "Error", 
                                            description: `Failed to remove reaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <span className="text-base mr-1">{displayEmoji}</span>
                                      {Array.isArray(users) && users.length > 0 && (
                                        <span className="text-xs font-medium">{users.length}</span>
                                      )}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
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
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t flex-shrink-0">
                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-3 p-3 bg-muted rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Image Preview</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelImageUpload}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center space-x-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded border"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {selectedImage?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)}MB
                        </p>
                      </div>
                      <Button
                        onClick={handleImageUpload}
                        disabled={loading}
                        className="px-4"
                      >
                        Send Image
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  {/* Image upload button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-accent/50"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

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

            {/* Thread Panel - appears when thread is open */}
            {openThread && (
              <div className="md:col-span-1 border-l flex flex-col min-h-0 bg-muted/20">
                {/* Thread Header */}
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">Thread</h3>
                      <p className="text-xs text-muted-foreground">
                        Reply to {openThread.user?.name || openThread.user?.username}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpenThread(null);
                        setThreadMessages([]);
                        setThreadReply('');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  
                  {/* Original message */}
                  <div className="mt-3 p-3 bg-background rounded-lg border">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{openThread.user?.name || openThread.user?.username}</span>
                      <span className="opacity-60">{new Date(openThread.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm">{openThread.text}</p>
                  </div>
                </CardHeader>

                {/* Thread Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  <div className="space-y-3">
                    {threadMessages.length > 0 ? (
                      threadMessages.map((message) => (
                        <div key={message.id} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{message.user?.name || message.user?.username}</span>
                            <span className="opacity-60">{new Date(message.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="bg-background rounded-lg p-2 border">
                            <p className="text-sm">{message.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground text-sm py-4">
                        No replies yet. Start the conversation!
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Thread Reply Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Reply to thread..."
                        value={threadReply}
                        onChange={(e) => setThreadReply(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendThreadMessage()}
                        className="text-sm"
                      />
                    </div>
                    <Button 
                      onClick={sendThreadMessage}
                      disabled={!threadReply.trim()}
                      size="sm"
                      className="transition-spring hover:scale-105"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default Messages;