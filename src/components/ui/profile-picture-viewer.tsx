import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePictureViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  userName: string;
  isOwnProfile?: boolean;
}

export const ProfilePictureViewer: React.FC<ProfilePictureViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  userName,
  isOwnProfile = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadProfilePicture } = useAuth();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUpdateClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      await uploadProfilePicture(file);
      console.log('Profile picture uploaded successfully');
      onClose(); // Close the modal after successful upload
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>{userName}'s Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image Display */}
          <div className="flex justify-center">
            <div className="relative w-80 h-80 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={`${userName}'s profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl text-muted-foreground">
                  👤
                </div>
              )}
            </div>
          </div>

          {/* Update Button - Only show for own profile */}
          {isOwnProfile && (
            <div className="flex justify-center space-x-2 pt-2">
              <Button 
                onClick={handleUpdateClick} 
                disabled={isUploading}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{isUploading ? 'Uploading...' : 'Update Profile Picture'}</span>
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
          
          {!isOwnProfile && (
            <p className="text-center text-muted-foreground text-sm">
              {userName}'s profile picture
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
