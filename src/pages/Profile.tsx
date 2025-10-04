import React, { useState } from 'react';
import { Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResponsiveLayout from '@/components/layout/responsive-layout';
import UserProfile from '@/components/ui/user-profile';
import FeedPostCard from '@/components/ui/feed-post-card';
import { useAuth } from '@/contexts/AuthContext';
import { mockPosts } from '@/lib/mockData';

const Profile = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { user, isAuthenticated } = useAuth();
  
  // Debug logging
  console.log('Profile component - isAuthenticated:', isAuthenticated);
  console.log('Profile component - user:', user);
  
  // If not authenticated, show message or redirect
  if (!isAuthenticated || !user) {
    console.log('Profile: User not authenticated or user data missing');
    return (
      <ResponsiveLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your profile</h2>
          <p className="text-muted-foreground">You need to be authenticated to access this page.</p>
        </div>
      </ResponsiveLayout>
    );
  }

  // Use the actual user data from AuthContext
  const profileUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(), // Generate avatar from initials
    bio: user.bio || 'Welcome to my profile!', // Use actual bio or default
    education_school: user.education_school || '',
    education_degree: user.education_degree || '',
    location: user.location || '',
    phone: user.phone || '',
    profile_picture_url: user.profile_picture_url || '',
    following: 0, // Social features - can be implemented later
    followers: 0, // Social features - can be implemented later
  };
  
  // Filter posts by current user
  const userPosts = mockPosts.filter(post => post.userId === user.id);

  return (
    <ResponsiveLayout>
      <div className="max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <UserProfile user={profileUser} isOwnProfile={true} />
          </div>

          {/* Posts Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-card animate-fade-in">
              <CardContent className="p-0">
                <Tabs defaultValue="posts" className="w-full">
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <TabsList className="grid w-full grid-cols-3 max-w-md">
                        <TabsTrigger value="posts">Posts</TabsTrigger>
                        <TabsTrigger value="photos">Photos</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                      </TabsList>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="hover:bg-primary/10"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="hover:bg-primary/10"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <TabsContent value="posts" className="p-4">
                    {viewMode === 'list' ? (
                      <div className="space-y-6">
                        {userPosts.length > 0 ? (
                          userPosts.map((post) => (
                            <FeedPostCard key={post.id} post={post} />
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                              <Grid className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                            <p className="text-muted-foreground">Share your first post to get started!</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userPosts.length > 0 ? (
                          userPosts.map((post) => (
                            <Card key={post.id} className="hover:shadow-soft transition-smooth animate-scale-in">
                              <CardContent className="p-4">
                                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                                  <span className="text-4xl">📝</span>
                                </div>
                                <p className="text-sm text-foreground line-clamp-2 mb-2">
                                  {post.content}
                                </p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{post.timestamp}</span>
                                  <span>{post.likes} likes</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                              <Grid className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                            <p className="text-muted-foreground">Share your first post to get started!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="photos" className="p-4">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📸</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No photos yet</h3>
                      <p className="text-muted-foreground">Photos you share will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="videos" className="p-4">
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                      <p className="text-muted-foreground">Videos you share will appear here</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default Profile;