// Verification service for BVN and Government ID

// Types for verification
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type GovIdType = 'NIN' | 'PASSPORT' | 'DRIVERS_LICENSE';

// Mock API response interface
interface VerificationResponse {
  success: boolean;
  message: string;
  data?: {
    verified: boolean;
    name?: string;
    dob?: string;
    [key: string]: unknown;
  };
}

/**
 * Verify Bank Verification Number (BVN)
 * @param bvnNumber The 11-digit BVN to verify
 * @returns Promise resolving to verification result
 */
export async function verifyBVN(bvnNumber: string): Promise<boolean> {
  // In a real app, this would call an actual API
  // For demo purposes, we'll simulate an API call with a timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple validation: BVN must be 11 digits
      const isValid = /^\d{11}$/.test(bvnNumber);
      
      // For demo: certain numbers are always "verified"
      const autoVerify = ['12345678901', '11111111111'].includes(bvnNumber);
      
      resolve(isValid && (autoVerify || Math.random() > 0.3)); // 70% success rate for valid BVNs
    }, 1500); // Simulate network delay
  });
}

/**
 * Verify Government ID (NIN, Passport, Driver's License)
 * @param type The type of government ID
 * @param idNumber The ID number to verify
 * @param file Optional file upload of the ID document
 * @returns Promise resolving to verification result
 */
export async function verifyGovernmentID(
  type: GovIdType, 
  idNumber: string, 
  file?: File
): Promise<boolean> {
  // In a real app, this would upload the file and call an actual API
  // For demo purposes, we'll simulate an API call with a timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      let isValid = false;
      
      // Basic validation based on ID type
      if (type === 'NIN' && /^\d{10}$/.test(idNumber)) {
        isValid = true;
      } else if (type === 'PASSPORT' && /^A\d{8}$/.test(idNumber)) {
        isValid = true;
      } else if (type === 'DRIVERS_LICENSE' && /^DL\d{8}$/.test(idNumber)) {
        isValid = true;
      }
      
      // Check if file was provided (required in real implementation)
      const hasFile = !!file;
      
      resolve(isValid && hasFile);
    }, 2000); // Simulate network delay
  });
}

/**
 * Get account tier based on verification status
 * @param bvnVerified BVN verification status
 * @param govIdVerified Government ID verification status
 * @returns Account tier ('basic' or 'advanced')
 */
export function getAccountTier(
  bvnVerified: VerificationStatus, 
  govIdVerified: VerificationStatus
): 'basic' | 'advanced' {
  if (bvnVerified === 'verified' && govIdVerified === 'verified') {
    return 'advanced';
  }
  return 'basic';
}

/**
 * Get transaction limits based on account tier
 * @param tier Account tier ('basic' or 'advanced')
 * @returns Object containing various transaction limits
 */
export function getTransactionLimits(tier: 'basic' | 'advanced') {
  if (tier === 'advanced') {
    return {
      daily: 10000000, // ₦10,000,000
      monthly: 100000000, // ₦100,000,000
      single: 5000000, // ₦5,000,000
      virtualCard: 10000, // $10,000
      internationalEnabled: true
    };
  }
  
  // Basic tier limits
  return {
    daily: 100000, // ₦100,000
    monthly: 1000000, // ₦1,000,000
    single: 50000, // ₦50,000
    virtualCard: 1000, // $1,000
    internationalEnabled: false
  };
}