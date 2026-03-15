import React, { useState } from 'react';
import { ProfileUpdate, ProfileData } from '@/components/ProfileUpdate';
import { verifyBVN, verifyGovernmentID, GovIdType } from '@/lib/verification-service';
import { toast } from '@/components/ui/use-toast';

export default function ProfilePage() {
  const [userData, setUserData] = useState<Partial<ProfileData>>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+234 800 123 4567',
    accountTier: 'basic',
    bvnVerified: 'unverified',
    govIdVerified: 'unverified',
    profilePicture: undefined,
  });

  // Handle profile update
  const handleProfileUpdate = (data: ProfileData) => {
    setUserData(data);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been successfully updated.",
    });
  };

  // Handle BVN verification
  const handleBVNVerify = async (bvnNumber: string) => {
    try {
      const result = await verifyBVN(bvnNumber);
      if (result) {
        toast({
          title: "BVN Verified",
          description: "Your BVN has been successfully verified.",
          variant: "default",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: "We couldn't verify your BVN. Please check and try again.",
          variant: "destructive",
        });
      }
      return result;
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "An error occurred during verification. Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle Government ID verification
  const handleGovIdVerify = async (type: GovIdType, idNumber: string, file?: File) => {
    try {
      const result = await verifyGovernmentID(type, idNumber, file);
      if (result) {
        toast({
          title: "ID Verified",
          description: "Your government ID has been successfully verified.",
          variant: "default",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: "We couldn't verify your ID. Please check and try again.",
          variant: "destructive",
        });
      }
      return result;
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "An error occurred during verification. Please try again later.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle navigation back to dashboard
  const handleNavigateBack = () => {
    // Use window.history to go back instead of React Router
    window.history.back();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ProfileUpdate 
        initialData={userData}
        onUpdate={handleProfileUpdate}
        onVerifyBVN={handleBVNVerify}
        onVerifyGovId={handleGovIdVerify}
        onNavigateBack={handleNavigateBack}
      />
    </div>
  );
}