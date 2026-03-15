import { useState, useCallback, useEffect, useRef } from 'react';
import { BankVerificationService, BankVerificationResult } from '@/lib/bank-verification';

interface UseBankVerificationOptions {
  autoVerify?: boolean; // Auto-verify when account number and bank code are complete
  debounceMs?: number; // Debounce delay for auto-verification
}

interface UseBankVerificationState {
  verification: BankVerificationResult | null;
  isVerifying: boolean;
  lastVerified: {
    accountNumber?: string;
    bankCode?: string;
  } | null;
  error: string | null;
}

interface UseBankVerificationReturn extends UseBankVerificationState {
  // Actions
  verifyAccount: (accountNumber: string, bankCode?: string, isInternational?: boolean, countryCode?: string) => Promise<void>;
  clearVerification: () => void;
  clearError: () => void;
  
  // Helpers
  isAccountVerified: (accountNumber: string, bankCode?: string) => boolean;
  getVerificationStatus: () => 'idle' | 'verifying' | 'verified' | 'error';
}

export const useBankVerification = (
  options: UseBankVerificationOptions = {}
): UseBankVerificationReturn => {
  const { autoVerify = false, debounceMs = 1000 } = options;
  
  const [state, setState] = useState<UseBankVerificationState>({
    verification: null,
    isVerifying: false,
    lastVerified: null,
    error: null
  });

  // Debounce timer reference
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Clear verification state
  const clearVerification = useCallback(() => {
    setState(prev => ({
      ...prev,
      verification: null,
      lastVerified: null,
      error: null,
      isVerifying: false
    }));
  }, []);

  // Clear error only
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Main verification function
  const verifyAccount = useCallback(async (
    accountNumber: string,
    bankCode?: string,
    isInternational = false,
    countryCode = 'NG'
  ) => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Basic validation
    if (!accountNumber || (!bankCode && !isInternational)) {
      setState(prev => ({
        ...prev,
        error: isInternational ? 'Account number is required' : 'Bank code and account number are required',
        verification: null
      }));
      return;
    }

    // Check if we already have verification for this account
    if (state.lastVerified?.accountNumber === accountNumber && 
        state.lastVerified?.bankCode === bankCode &&
        state.verification?.success) {
      
      return;
    }

    setState(prev => ({
      ...prev,
      isVerifying: true,
      error: null
    }));

    try {
      
      
      const result = await BankVerificationService.verifyBankAccount(
        accountNumber,
        bankCode,
        isInternational,
        countryCode
      );

      

      setState(prev => ({
        ...prev,
        verification: result,
        isVerifying: false,
        lastVerified: { accountNumber, bankCode },
        error: result.success ? null : result.error || 'Verification failed'
      }));

    } catch (error) {
      console.error('❌ Bank verification error:', error);
      setState(prev => ({
        ...prev,
        isVerifying: false,
        verification: null,
        error: error instanceof Error ? error.message : 'Verification service unavailable'
      }));
    }
  }, [state.lastVerified, state.verification]);

  // Check if account is verified
  const isAccountVerified = useCallback((accountNumber: string, bankCode?: string): boolean => {
    return !!(
      state.verification?.success &&
      state.lastVerified?.accountNumber === accountNumber &&
      (!bankCode || state.lastVerified?.bankCode === bankCode)
    );
  }, [state.verification, state.lastVerified]);

  // Get verification status
  const getVerificationStatus = useCallback((): 'idle' | 'verifying' | 'verified' | 'error' => {
    if (state.isVerifying) return 'verifying';
    if (state.error) return 'error';
    if (state.verification?.success) return 'verified';
    return 'idle';
  }, [state.isVerifying, state.error, state.verification]);

  // Auto-verification hook (for when both account number and bank code are entered)
  const triggerAutoVerification = useCallback((
    accountNumber: string, 
    bankCode: string,
    isInternational = false,
    countryCode = 'NG'
  ) => {
    if (!autoVerify) return;

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Skip if already verified for this account
    if (isAccountVerified(accountNumber, bankCode)) {
      return;
    }

    // Validate inputs before starting timer
    const isValidNigerian = !isInternational && 
                           accountNumber.length === 10 && 
                           /^\d+$/.test(accountNumber) && 
                           bankCode;
    
    const isValidInternational = isInternational && 
                               accountNumber.length >= 8;

    if (!isValidNigerian && !isValidInternational) {
      return;
    }

    // Set debounced verification
    debounceTimer.current = setTimeout(() => {
      
      verifyAccount(accountNumber, bankCode, isInternational, countryCode);
    }, debounceMs);
  }, [autoVerify, debounceMs, isAccountVerified, verifyAccount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    ...state,
    verifyAccount,
    clearVerification,
    clearError,
    isAccountVerified,
    getVerificationStatus,
    // Export auto-verification trigger for external use
    triggerAutoVerification
  };
};

// Hook for auto bank verification with input watching
export const useAutoBankVerification = (
  accountNumber: string,
  bankCode: string,
  isInternational = false,
  countryCode = 'NG',
  options: UseBankVerificationOptions = {}
) => {
  const verification = useBankVerification({ ...options, autoVerify: true });

  // Watch for changes and trigger verification
  useEffect(() => {
    if (accountNumber && (bankCode || isInternational)) {
      verification.triggerAutoVerification(accountNumber, bankCode, isInternational, countryCode);
    }
  }, [accountNumber, bankCode, isInternational, countryCode, verification]);

  return verification;
};

// Simple hook for manual verification only
export const useManualBankVerification = () => {
  return useBankVerification({ autoVerify: false });
};