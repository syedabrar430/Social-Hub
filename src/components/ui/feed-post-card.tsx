import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Post } from '@/lib/mockData';

interface FeedPostCardProps {
  post: Post;
}

const FeedPostCard: React.FC<FeedPostCardProps> = ({ post }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  return (
    <Card className="w-full mb-6 shadow-card hover:shadow-soft transition-smooth animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xl">
              {post.user.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{post.user.name}</h3>
              <p className="text-sm text-muted-foreground">{post.timestamp}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-accent/50">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>
        
        {post.image && (
          <div className="mb-4 rounded-lg overflow-hidden bg-muted">
            <div className="aspect-video flex items-center justify-center text-muted-foreground">
              📸 Image placeholder
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-spring hover:scale-105 ${
                isLiked 
                  ? 'text-accent hover:text-accent' 
                  : 'hover:text-accent hover:bg-accent/10'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </Button>

            <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:text-primary hover:bg-primary/10 transition-smooth"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments.length}</span>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 hover:text-secondary hover:bg-secondary/10 transition-smooth"
            >
              <Share2 className="h-4 w-4" />
              <span>{post.shares}</span>
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <CollapsibleContent className="mt-4 animate-slide-up">
            <Separator className="mb-4" />
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                    {comment.user.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{comment.user.name}</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                    <div className="flex items-center mt-1 ml-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:text-accent h-auto p-1"
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        {comment.likes}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Comment Input */}
              <div className="flex space-x-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm text-primary-foreground">
                  👩‍💼
                </div>
                <div className="flex-1">
                  <div className="bg-input rounded-lg p-3">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="w-full bg-transparent text-sm outline-none placeholder-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default FeedPostCard;