import React from 'react';
import { Heart, MessageCircle, UserPlus, AtSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notification } from '@/lib/mockData';

interface NotificationCardProps {
  notification: Notification;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-5 w-5 text-accent" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-secondary" />;
      case 'mention':
        return <AtSign className="h-5 w-5 text-warning" />;
      default:
        return <Heart className="h-5 w-5 text-accent" />;
    }
  };

  const getActionText = () => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you in a comment';
      default:
        return notification.content;
    }
  };

  return (
    <Card className={`mb-3 shadow-card hover:shadow-soft transition-smooth animate-fade-in ${
      !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">{notification.from.avatar}</span>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{notification.from.name}</span>
                  <span className="text-muted-foreground ml-1">{getActionText()}</span>
                </p>
                <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-2">
              {notification.postId && (
                <Button variant="outline" size="sm" className="hover:bg-primary/10">
                  View Post
                </Button>
              )}
              {notification.type === 'follow' && (
                <Button variant="outline" size="sm" className="hover:bg-secondary/10">
                  Follow Back
                </Button>
              )}
            </div>
          </div>

          {/* Read/Unread Indicator */}
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationCard;