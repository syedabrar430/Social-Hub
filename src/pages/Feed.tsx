import React, { useState } from 'react';
import { PlusCircle, ImageIcon, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import FeedPostCard from '@/components/ui/feed-post-card';
import { mockPosts, currentUser } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

const Feed = () => {
  const [posts, setPosts] = useState(mockPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const { toast } = useToast();

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast({
        title: "Empty post",
        description: "Please write something before posting.",
        variant: "destructive",
      });
      return;
    }

    const newPost = {
      id: String(posts.length + 1),
      userId: currentUser.id,
      user: currentUser,
      content: newPostContent,
      timestamp: 'Just now',
      likes: 0,
      shares: 0,
      isLiked: false,
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
    
    toast({
      title: "Post created!",
      description: "Your post has been shared with your network.",
    });
  };

  return (
    <ResponsiveLayout>
      <div className="max-w-2xl mx-auto">
        {/* Create Post Card */}
        <Card className="mb-6 shadow-card animate-fade-in">
          <CardContent className="p-4">
            <div className="flex space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl">
                {currentUser.avatar}
              </div>
              <div className="flex-1">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[100px] border-none resize-none shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground"
                />
                
                <Separator className="my-3" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="hover:bg-accent/10">
                      <ImageIcon className="h-4 w-4 mr-2 text-accent" />
                      Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-warning/10">
                      <Smile className="h-4 w-4 mr-2 text-warning" />
                      Feeling
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="transition-spring hover:scale-105"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8 animate-fade-in">
          <Button 
            variant="outline" 
            className="hover:bg-primary/10 transition-smooth"
          >
            Load More Posts
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default Feed;