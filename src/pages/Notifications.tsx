import React, { useState } from 'react';
import { CheckCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import NotificationCard from '@/components/ui/notification-card';
import { mockNotifications } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;
  const allNotifications = notifications;
  const unreadNotifications = notifications.filter(n => !n.read);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({
      title: "All notifications marked as read",
      description: "You're all caught up!",
    });
  };

  const filterByType = (type: string) => {
    if (type === 'all') return allNotifications;
    return allNotifications.filter(n => n.type === type);
  };

  return (
    <ResponsiveLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6 shadow-card animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Notifications</CardTitle>
                <p className="text-muted-foreground mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="hover:bg-accent/10">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={markAllAsRead}
                    className="hover:bg-primary/10"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all" className="relative">
              All
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="likes">Likes</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="follows">Follows</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-3">
              {allNotifications.length > 0 ? (
                allNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <EmptyState message="No notifications yet" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="unread">
            <div className="space-y-3">
              {unreadNotifications.length > 0 ? (
                unreadNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <EmptyState message="All notifications have been read" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="likes">
            <div className="space-y-3">
              {filterByType('like').length > 0 ? (
                filterByType('like').map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <EmptyState message="No like notifications" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <div className="space-y-3">
              {filterByType('comment').length > 0 ? (
                filterByType('comment').map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <EmptyState message="No comment notifications" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="follows">
            <div className="space-y-3">
              {filterByType('follow').length > 0 ? (
                filterByType('follow').map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              ) : (
                <EmptyState message="No follow notifications" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <Card className="text-center py-12 shadow-card">
    <CardContent>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <CheckCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
      <p className="text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);

export default Notifications;