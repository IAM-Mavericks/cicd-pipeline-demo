import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GovIdType, VerificationStatus } from '@/lib/verification-service';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Export the ProfileData type
export type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  accountTier: 'basic' | 'advanced';
  bvnVerified: VerificationStatus;
  govIdVerified: VerificationStatus;
  profilePicture?: string;
};

// Props for the component
interface ProfileUpdateProps {
  initialData?: Partial<ProfileData>;
  onUpdate?: (data: ProfileData) => void;
  onVerifyBVN?: (bvnNumber: string) => Promise<boolean>;
  onVerifyGovId?: (type: GovIdType, idNumber: string, file?: File) => Promise<boolean>;
  onNavigateBack?: () => void;
}

// Export the ProfileUpdate component
export function ProfileUpdate({ 
  initialData, 
  onUpdate, 
  onVerifyBVN, 
  onVerifyGovId,
  onNavigateBack 
}: ProfileUpdateProps) {
  // State for form fields
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(initialData?.profilePicture);
  
  // Handle profile update
  const handleProfileUpdate = () => {
    if (onUpdate) {
      onUpdate({
        firstName,
        lastName,
        email,
        phoneNumber,
        accountTier: initialData?.accountTier || 'basic',
        bvnVerified: initialData?.bvnVerified || 'unverified',
        govIdVerified: initialData?.govIdVerified || 'unverified',
        profilePicture
      });
    }
  };
  
  // Handle profile picture upload
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  return (
    <div className="space-y-6">
      {/* Back navigation */}
      {onNavigateBack && (
        <Button 
          variant="ghost" 
          className="mb-4 flex items-center" 
          onClick={onNavigateBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Update</CardTitle>
          <CardDescription>Update your personal details and profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24 mb-2">
                  {profilePicture ? (
                    <AvatarImage src={profilePicture} alt="Profile" />
                  ) : (
                    <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0">
                  <label 
                    htmlFor="profile-picture" 
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      id="profile-picture"
                      className="hidden"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                    />
                  </label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Click the camera icon to upload a profile picture
              </p>
            </div>
            
            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input 
                  id="phoneNumber" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                />
              </div>
            </div>
            
            {/* Verification Status */}
            <div>
              <h3 className="text-lg font-medium mb-4">Verification Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Account Tier:</span>
                  <Badge>{initialData?.accountTier || 'basic'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>BVN:</span>
                  <Badge variant={initialData?.bvnVerified === 'verified' ? 'default' : 'destructive'}>
                    {initialData?.bvnVerified || 'unverified'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Government ID:</span>
                  <Badge variant={initialData?.govIdVerified === 'verified' ? 'default' : 'destructive'}>
                    {initialData?.govIdVerified || 'unverified'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button className="w-full" onClick={handleProfileUpdate}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}