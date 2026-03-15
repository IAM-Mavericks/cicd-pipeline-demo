import { useState } from 'react';
import { verifyBVN, verifyGovernmentID, VerificationStatus, GovIdType } from '@/lib/verification-service';

export function useVerification() {
  const [bvnStatus, setBvnStatus] = useState<VerificationStatus>('unverified');
  const [govIdStatus, setGovIdStatus] = useState<VerificationStatus>('unverified');
  const [isVerifyingBvn, setIsVerifyingBvn] = useState(false);
  const [isVerifyingGovId, setIsVerifyingGovId] = useState(false);
  const [accountTier, setAccountTier] = useState<'basic' | 'advanced'>('basic');

  // Verify BVN
  const verifyBvn = async (bvnNumber: string): Promise<boolean> => {
    if (!bvnNumber || bvnNumber.length !== 11) {
      return false;
    }

    setIsVerifyingBvn(true);
    setBvnStatus('pending');
    
    try {
      const result = await verifyBVN(bvnNumber);
      setBvnStatus(result ? 'verified' : 'failed');
      updateAccountTier(result ? 'verified' : 'failed', govIdStatus);
      return result;
    } catch (error) {
      setBvnStatus('failed');
      return false;
    } finally {
      setIsVerifyingBvn(false);
    }
  };

  // Verify Government ID
  const verifyGovId = async (
    idType: GovIdType, 
    idNumber: string, 
    file?: File
  ): Promise<boolean> => {
    if (!idType || !idNumber) {
      return false;
    }

    setIsVerifyingGovId(true);
    setGovIdStatus('pending');
    
    try {
      const result = await verifyGovernmentID(idType, idNumber, file);
      setGovIdStatus(result ? 'verified' : 'failed');
      updateAccountTier(bvnStatus, result ? 'verified' : 'failed');
      return result;
    } catch (error) {
      setGovIdStatus('failed');
      return false;
    } finally {
      setIsVerifyingGovId(false);
    }
  };

  // Update account tier based on verification status
  const updateAccountTier = (
    bvnVerified: VerificationStatus, 
    govIdVerified: VerificationStatus
  ) => {
    if (bvnVerified === 'verified' && govIdVerified === 'verified') {
      setAccountTier('advanced');
    } else {
      setAccountTier('basic');
    }
  };

  return {
    bvnStatus,
    govIdStatus,
    isVerifyingBvn,
    isVerifyingGovId,
    accountTier,
    verifyBvn,
    verifyGovId
  };
}