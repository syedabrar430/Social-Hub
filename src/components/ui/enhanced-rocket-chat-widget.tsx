import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  ExternalLink, 
  X, 
  Maximize2, 
  Send, 
  Smile, 
  Hash, 
  Users, 
  MessageSquare,
  Reply,
  ThumbsUp,
  Heart,
  Laugh,
  Angry,
  Sad,
  ChevronDown,
  ChevronRight,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RocketChatWidgetProps {
  className?: string;
}

interface Room {
  id: string;
  name: string;
  display_name: string;
  unread: number;
  type: string;
  open: boolean;
}

interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  timestamp: string;
  reactions: Record<string, string[]>;
  thread_id?: string;
  is_thread: boolean;
  replies_count?: number;
}

interface RoomsData {
  channels: Room[];
  groups: Room[];
  direct_messages: Room[];
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const EnhancedRocketChatWidget: React.FC<RocketChatWidgetProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rocketChatUrl, setRocketChatUrl] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomsData>({ channels: [], groups: [], direct_messages: [] });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    channels: true,
    groups: false,
    dms: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const baseRocketChatUrl = 'http://10.68.0.49:30082';

  // Generate Rocket.Chat SSO URL for current user
  const generateRocketChatUrl = useCallback(async () => {
    if (!user || !isAuthenticated) {
      return null;
    }

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/sso-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.rocketChatUrl || baseRocketChatUrl;
      } else {
        console.error('Failed to generate Rocket.Chat SSO URL');
        return baseRocketChatUrl;
      }
    } catch (error) {
      console.error('Error generating Rocket.Chat URL:', error);
      return baseRocketChatUrl;
    }
  }, [user, isAuthenticated]);

  // Load user rooms
  const loadRooms = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/user-rooms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }, [isAuthenticated]);

  // Load messages for a room
  const loadMessages = useCallback(async (roomId: string, roomType: string) => {
    if (!isAuthenticated) return;

    try {
      let endpoint = '';
      if (roomType === 'c') {
        endpoint = `http://localhost:8000/api/rocket-chat/channel-messages/${roomId}`;
      } else if (roomType === 'd') {
        // For DMs, we need to get the username from the room
        const room = rooms.channels.concat(rooms.groups, rooms.direct_messages).find(r => r.id === roomId);
        if (room) {
          endpoint = `http://localhost:8000/api/rocket-chat/dm-messages?username=${room.name}&limit=50`;
        }
      }

      if (endpoint) {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(Array.isArray(data) ? data : data.messages || []);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [isAuthenticated, rooms]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedRoom || !isAuthenticated) return;

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/send-post-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          content: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        loadMessages(selectedRoom.id, selectedRoom.type);
        toast({
          title: "Message sent",
          description: "Your message has been sent successfully",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [newMessage, selectedRoom, isAuthenticated, loadMessages, toast]);

  // Send thread message
  const sendThreadMessage = useCallback(async () => {
    if (!newThreadMessage.trim() || !selectedThread || !selectedRoom || !isAuthenticated) return;

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/send-thread-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          threadId: selectedThread,
          content: newThreadMessage,
        }),
      });

      if (response.ok) {
        setNewThreadMessage('');
        loadThreadMessages(selectedThread);
        toast({
          title: "Reply sent",
          description: "Your reply has been sent successfully",
        });
      }
    } catch (error) {
      console.error('Error sending thread message:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  }, [newThreadMessage, selectedThread, selectedRoom, isAuthenticated, toast]);

  // Load thread messages
  const loadThreadMessages = useCallback(async (threadId: string) => {
    if (!selectedRoom || !isAuthenticated) return;

    try {
      const response = await fetch(`http://localhost:8000/api/rocket-chat/thread-messages?room_id=${selectedRoom.id}&thread_id=${threadId}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setThreadMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
    }
  }, [selectedRoom, isAuthenticated]);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/add-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          messageId,
          emoji,
        }),
      });

      if (response.ok) {
        // Refresh messages to show updated reactions
        if (selectedRoom) {
          loadMessages(selectedRoom.id, selectedRoom.type);
        }
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [isAuthenticated, selectedRoom, loadMessages]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('http://localhost:8000/api/rocket-chat/remove-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          messageId,
          emoji,
        }),
      });

      if (response.ok) {
        // Refresh messages to show updated reactions
        if (selectedRoom) {
          loadMessages(selectedRoom.id, selectedRoom.type);
        }
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [isAuthenticated, selectedRoom, loadMessages]);

  const handleOpenRocketChat = async () => {
    const url = await generateRocketChatUrl();
    if (url) {
      window.open(url, 'rocketchat', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      setIsOpen(false);
    }
  };

  const handleToggleWidget = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access Rocket.Chat",
        variant: "destructive",
      });
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setSelectedThread(null);
    setThreadMessages([]);
    loadMessages(room.id, room.type);
  };

  const handleThreadClick = (threadId: string) => {
    setSelectedThread(threadId);
    loadThreadMessages(threadId);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredRooms = (roomList: Room[]) => {
    if (!searchQuery) return roomList;
    return roomList.filter(room => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Update URL when user changes
  useEffect(() => {
    const updateUrl = async () => {
      if (user && isAuthenticated) {
        const url = await generateRocketChatUrl();
        setRocketChatUrl(url);
        loadRooms();
      } else {
        setRocketChatUrl(null);
        setRooms({ channels: [], groups: [], direct_messages: [] });
      }
    };
    
    updateUrl();
  }, [user, isAuthenticated, generateRocketChatUrl, loadRooms]);

  return (
    <div className={`fixed top-20 right-4 z-50 ${className}`}>
      {/* Widget Button */}
      <Button
        onClick={handleToggleWidget}
        variant="default"
        size="sm"
        className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-orange-600 hover:bg-orange-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </Button>

      {/* Enhanced Widget Popup */}
      {isOpen && (
        <Card className="absolute top-14 right-0 w-96 h-[600px] shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-lg">Rocket.Chat</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenRocketChat}
                  className="h-8 w-8 p-0"
                  title="Open in new window"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex flex-col h-[520px]">
            {isAuthenticated && user ? (
              <div className="flex flex-col h-full">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search channels..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-1 gap-4">
                  {/* Sidebar */}
                  <div className="w-1/3 border-r pr-2">
                    <ScrollArea className="h-full">
                      <div className="space-y-2">
                        {/* Channels */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('channels')}
                            className="w-full justify-start p-2 h-auto"
                          >
                            {expandedSections.channels ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            <Hash className="h-4 w-4 mr-2" />
                            Channels ({filteredRooms(rooms.channels).length})
                          </Button>
                          {expandedSections.channels && (
                            <div className="ml-6 space-y-1">
                              {filteredRooms(rooms.channels).map((room) => (
                                <Button
                                  key={room.id}
                                  variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => handleRoomSelect(room)}
                                  className="w-full justify-start text-xs"
                                >
                                  <Hash className="h-3 w-3 mr-2" />
                                  {room.name}
                                  {room.unread > 0 && (
                                    <Badge variant="destructive" className="ml-auto text-xs">
                                      {room.unread}
                                    </Badge>
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Direct Messages */}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('dms')}
                            className="w-full justify-start p-2 h-auto"
                          >
                            {expandedSections.dms ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            <Users className="h-4 w-4 mr-2" />
                            Direct Messages ({filteredRooms(rooms.direct_messages).length})
                          </Button>
                          {expandedSections.dms && (
                            <div className="ml-6 space-y-1">
                              {filteredRooms(rooms.direct_messages).map((room) => (
                                <Button
                                  key={room.id}
                                  variant={selectedRoom?.id === room.id ? "secondary" : "ghost"}
                                  size="sm"
                                  onClick={() => handleRoomSelect(room)}
                                  className="w-full justify-start text-xs"
                                >
                                  <Users className="h-3 w-3 mr-2" />
                                  {room.display_name}
                                  {room.unread > 0 && (
                                    <Badge variant="destructive" className="ml-auto text-xs">
                                      {room.unread}
                                    </Badge>
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col">
                    {selectedRoom ? (
                      <>
                        {/* Room Header */}
                        <div className="border-b pb-2 mb-2">
                          <h4 className="font-medium text-sm">
                            {selectedRoom.type === 'c' ? (
                              <><Hash className="h-4 w-4 inline mr-1" />{selectedRoom.name}</>
                            ) : (
                              <><Users className="h-4 w-4 inline mr-1" />{selectedRoom.display_name}</>
                            )}
                          </h4>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 mb-4">
                          <div className="space-y-2">
                            {messages.map((message) => (
                              <div key={message.id} className="text-xs">
                                <div className="flex items-start space-x-2">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-blue-600">{message.user.name}</span>
                                      <span className="text-muted-foreground">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="mt-1">{message.content}</p>
                                    
                                    {/* Reactions */}
                                    {Object.keys(message.reactions).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {Object.entries(message.reactions).map(([emoji, users]) => (
                                          <Button
                                            key={emoji}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => addReaction(message.id, emoji)}
                                          >
                                            {emoji} {users.length}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Thread Button */}
                                    {message.replies_count && message.replies_count > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs mt-1"
                                        onClick={() => handleThreadClick(message.id)}
                                      >
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {message.replies_count} replies
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        {/* Quick Reactions */}
                        <div className="flex gap-1 mb-2">
                          {REACTIONS.map((emoji) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                if (messages.length > 0) {
                                  const lastMessage = messages[messages.length - 1];
                                  addReaction(lastMessage.id, emoji);
                                }
                              }}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>

                        {/* Message Input */}
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={sendMessage} size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Select a channel or direct message to start chatting
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Please log in to your Social Hub account to access Rocket.Chat
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/login'}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedRocketChatWidget;

