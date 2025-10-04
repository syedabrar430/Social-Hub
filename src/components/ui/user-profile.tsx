import React, { useState, useEffect, useRef } from 'react';
import { Edit2, MapPin, Calendar, Link as LinkIcon, GraduationCap, Phone, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProfilePictureViewer } from '@/components/ui/profile-picture-viewer';
import { useAuth } from '@/contexts/AuthContext';

// Use a compatible User type that works with both AuthContext and mockData
type UserProfile = {
  id: string;
  name: string;
  email: string;
  bio?: string;
  education_school?: string;
  education_degree?: string;
  location?: string;
  phone?: string;
  profile_picture_url?: string;
  avatar?: string; // For backward compatibility with mockData
  following?: number;
  followers?: number;
};

interface UserProfileProps {
  user: UserProfile;
  isOwnProfile?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, isOwnProfile = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState(user);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfilePictureViewer, setShowProfilePictureViewer] = useState(false);
  const { updateProfile } = useAuth();

  // Sync editedUser with user prop changes
  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const handleSave = async () => {
    if (!isOwnProfile) return;
    
    const profileData = {
      full_name: editedUser.name,
      bio: editedUser.bio,
      education_school: editedUser.education_school,
      education_degree: editedUser.education_degree,
      location: editedUser.location,
      phone: editedUser.phone,
    };
    
    console.log('Saving profile with data:', profileData);
    
    // Check if data has actually changed
    const hasChanges = (
      profileData.full_name !== user.name ||
      profileData.bio !== user.bio ||
      profileData.education_school !== user.education_school ||
      profileData.education_degree !== user.education_degree ||
      profileData.location !== user.location ||
      profileData.phone !== user.phone
    );
    
    if (!hasChanges) {
      console.log('No changes detected, skipping save');
      setIsEditing(false);
      setEditingField(null);
      return;
    }
    
    setIsLoading(true);
    try {
      // Update profile with all fields
      await updateProfile(profileData);
      
      console.log('Profile update successful');
      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
    setEditingField(null);
  };

  const startEditingField = (fieldName: string) => {
    setEditingField(fieldName);
    setIsEditing(true);
  };

  const startEditingAll = () => {
    setEditingField(null);
    setIsEditing(true);
  };

  return (
    <Card className="w-full shadow-card animate-fade-in">
      <CardHeader className="text-center pb-4">
        {/* Cover Image */}
        <div className="gradient-hero h-32 -mx-6 -mt-6 mb-6 rounded-t-lg relative">
          <div className="absolute inset-0 bg-black/10 rounded-t-lg"></div>
        </div>

        {/* Profile Picture */}
        <div className="relative -mt-20 mb-4">
          <div 
            className="w-24 h-24 mx-auto rounded-full bg-card shadow-glow flex items-center justify-center text-4xl border-4 border-card overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowProfilePictureViewer(true)}
            title="Click to view profile picture"
          >
            {user.profile_picture_url ? (
              <img 
                src={user.profile_picture_url} 
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-foreground">{user.avatar}</span>
            )}
          </div>
          
          {isOwnProfile && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Click to view and edit
            </p>
          )}
        </div>

        {/* User Info */}
        <div className="space-y-2">
          {isEditing ? (
            <div className="space-y-3">
              {/* Name field - only show if editing all or name specifically */}
              {(editingField === null || editingField === 'name') && (
                <Input
                  value={editedUser.name}
                  onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                  className="text-center text-xl font-bold"
                  placeholder="Enter your name"
                />
              )}
              
              {/* Show name in display mode if not editing it specifically */}
              {isEditing && editingField !== null && editingField !== 'name' && (
                <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              )}
              
              {/* Email is always read-only */}
              {(editingField === null || editingField === 'email') && (
                <Input
                  value={user.email}
                  disabled
                  className="text-center text-muted-foreground bg-muted"
                  placeholder="Email (not editable)"
                />
              )}
              
              {/* Show email in display mode if not editing all fields */}
              {isEditing && editingField !== null && editingField !== 'email' && (
                <p className="text-muted-foreground">{user.email}</p>
              )}

              {/* Bio field */}
              {(editingField === null || editingField === 'bio') && (
                <Textarea
                  value={editedUser.bio || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                  className="text-center resize-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              )}
              
              {/* Additional Profile Fields - only show if editing all or specific field */}
              <div className="grid grid-cols-1 gap-3 mt-4">
                {(editingField === null || editingField === 'education') && (
                  <>
                    <Input
                      value={editedUser.education_school || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, education_school: e.target.value })}
                      className="text-center"
                      placeholder="School/University"
                    />
                    <Input
                      value={editedUser.education_degree || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, education_degree: e.target.value })}
                      className="text-center"
                      placeholder="Degree/Field of Study"
                    />
                  </>
                )}
                
                {(editingField === null || editingField === 'location') && (
                  <Input
                    value={editedUser.location || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, location: e.target.value })}
                    className="text-center"
                    placeholder="Lives in"
                  />
                )}
                
                {(editingField === null || editingField === 'phone') && (
                  <Input
                    value={editedUser.phone || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                    className="text-center"
                    placeholder="Phone number"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              
              {/* Bio */}
              {user.bio ? (
                <div className="flex items-center justify-center space-x-2">
                  <p className="text-foreground leading-relaxed">{user.bio}</p>
                  {isOwnProfile && (
                    <button
                      onClick={() => startEditingField('bio')}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : isOwnProfile ? (
                <button
                  onClick={() => startEditingField('bio')}
                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer underline"
                >
                  Add bio
                </button>
              ) : null}
              
              {/* Additional Profile Info in Display Mode */}
              <div className="mt-4 space-y-2 text-sm">
                {/* Education */}
                {user.education_school ? (
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>
                      {user.education_degree ? `${user.education_degree} at ${user.education_school}` : user.education_school}
                    </span>
                    {isOwnProfile && (
                      <button
                        onClick={() => startEditingField('education')}
                        className="text-muted-foreground hover:text-primary transition-colors ml-2"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => startEditingField('education')}
                    className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span className="underline">Add education</span>
                  </button>
                ) : null}
                
                {/* Location */}
                {user.location ? (
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Lives in {user.location}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => startEditingField('location')}
                        className="text-muted-foreground hover:text-primary transition-colors ml-2"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => startEditingField('location')}
                    className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="underline">Add location</span>
                  </button>
                ) : null}
                
                {/* Phone */}
                {user.phone ? (
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => startEditingField('phone')}
                        className="text-muted-foreground hover:text-primary transition-colors ml-2"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => startEditingField('phone')}
                    className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="underline">Add phone number</span>
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Edit/Save Buttons */}
        {isOwnProfile && (
          <div className="flex justify-center space-x-2 mt-4">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startEditingAll}
                className="hover:bg-primary/10"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        )}

        {/* Follow Button for other profiles */}
        {!isOwnProfile && (
          <div className="flex justify-center mt-4">
            <Button variant="default" size="sm" className="transition-spring hover:scale-105">
              Follow
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Separator className="mb-4" />
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{user.followers}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{user.following}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </div>
        </div>

        <Separator className="my-4" />
      </CardContent>
      
      {/* Profile Picture Viewer Modal */}
      <ProfilePictureViewer
        isOpen={showProfilePictureViewer}
        onClose={() => setShowProfilePictureViewer(false)}
        imageUrl={user.profile_picture_url}
        userName={user.name}
        isOwnProfile={isOwnProfile}
      />
    </Card>
  );
};

export default UserProfile;