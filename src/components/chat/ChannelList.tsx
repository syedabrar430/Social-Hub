import React, { useState, useEffect } from 'react';
import { Search, Hash, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { chatService, type ChatConversation } from '@/services/chat';
import { useToast } from '@/hooks/use-toast';

interface ChannelListProps {
  selectedChannel: ChatConversation | null;
  onChannelSelect: (channel: ChatConversation) => void;
  isAuthenticated: boolean;
}

const ChannelList: React.FC<ChannelListProps> = ({
  selectedChannel,
  onChannelSelect,
  isAuthenticated,
}) => {
  const [channels, setChannels] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Load channels with messages > 0
  useEffect(() => {
    console.log('🚀 ChannelList useEffect triggered, isAuthenticated:', isAuthenticated);
    
    const loadChannelsWithMessages = async () => {
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, skipping channel loading');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📡 Loading channels with messages...');
        
        const channelsWithMessages = await chatService.getChannelsWithMessages();
        console.log('✅ Channels with messages loaded:', channelsWithMessages.length, 'channels:', channelsWithMessages);
        
        setChannels(channelsWithMessages);
        
        // Auto-select first channel if none selected
        if (channelsWithMessages.length > 0 && !selectedChannel) {
          onChannelSelect(channelsWithMessages[0]);
        }
      } catch (error) {
        console.error('❌ Failed to load channels with messages:', error);
        toast({
          title: "Error",
          description: "Failed to load channels. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    console.log('🔄 Calling loadChannelsWithMessages()');
    loadChannelsWithMessages();

    loadChannelsWithMessages();
  }, [isAuthenticated, selectedChannel, onChannelSelect, toast]);

  // Filter channels based on search query
  const filteredChannels = channels.filter(channel =>
    channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h2 className="text-lg font-semibold">Channels</h2>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading channels...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <h2 className="text-lg font-semibold mb-3">Channels</h2>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredChannels.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No channels match your search' : 'No channels with messages found'}
              </p>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const isSelected = selectedChannel?.id === channel.id;
              const messageCount = channel.unread_count || 0;
              const lastMessageText = channel.last_message?.text || 'Click to view messages';
              const isPrivate = channel.type === 'private_group' || channel.is_private;
              
              return (
                <div
                  key={channel.id}
                  onClick={() => onChannelSelect(channel)}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-smooth border-l-4 ${
                    isSelected 
                      ? 'bg-primary/10 border-l-primary' 
                      : 'border-l-transparent hover:border-l-accent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                      {isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">
                          {channel.display_name || channel.name}
                        </h3>
                        {messageCount > 0 && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                            {messageCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {lastMessageText}
                      </p>
                      {channel.last_message?.timestamp && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(channel.last_message.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChannelList;