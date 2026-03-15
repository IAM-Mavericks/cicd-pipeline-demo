import { useState, useEffect, useCallback } from 'react';
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  authenticateWithBiometric,
  registerBiometricCredential,
  hasBiometricCredentials,
  getBiometricInfo,
  removeBiometricCredentials,
  type BiometricAuthResult,
  type BiometricRegistrationOptions
} from '@/lib/biometric-auth';

export interface BiometricAuthState {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  authenticatorType: string;
  hasCredentials: boolean;
  isLoading: boolean;
  error: string | null;
  isRegistering: boolean;
  isAuthenticating: boolean;
}

export interface UseBiometricAuthReturn extends BiometricAuthState {
  // Actions
  registerBiometric: (options: BiometricRegistrationOptions) => Promise<BiometricAuthResult>;
  authenticateWithBiometric: (userId?: string) => Promise<BiometricAuthResult>;
  removeBiometric: (userId: string) => void;
  checkBiometricSupport: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  getUserBiometricInfo: (userId?: string) => {
    hasCredentials: boolean;
    canUseBiometric: boolean;
  };
}

export const useBiometricAuth = (): UseBiometricAuthReturn => {
  const [state, setState] = useState<BiometricAuthState>({
    isSupported: false,
    isPlatformAvailable: false,
    authenticatorType: 'none',
    hasCredentials: false,
    isLoading: false,
    error: null,
    isRegistering: false,
    isAuthenticating: false
  });

  // Check biometric support on mount
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const biometricInfo = await getBiometricInfo();
      setState(prev => ({
        ...prev,
        isSupported: biometricInfo.isSupported,
        isPlatformAvailable: biometricInfo.isPlatformAvailable,
        authenticatorType: biometricInfo.authenticatorType,
        hasCredentials: biometricInfo.hasCredentials,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check biometric support'
      }));
    }
  }, []);

  const registerBiometric = useCallback(async (
    options: BiometricRegistrationOptions
  ): Promise<BiometricAuthResult> => {
    setState(prev => ({ ...prev, isRegistering: true, error: null }));

    try {
      const result = await registerBiometricCredential(options);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          hasCredentials: true,
          isRegistering: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          isRegistering: false,
          error: result.error || 'Registration failed'
        }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState(prev => ({
        ...prev,
        isRegistering: false,
        error: errorMessage
      }));
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  const authenticate = useCallback(async (
    userId?: string
  ): Promise<BiometricAuthResult> => {
    setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

    try {
      const result = await authenticateWithBiometric(userId);
      
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: result.success ? null : result.error || 'Authentication failed'
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        error: errorMessage
      }));
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  const removeBiometric = useCallback((userId: string) => {
    try {
      removeBiometricCredentials(userId);
      setState(prev => ({
        ...prev,
        hasCredentials: hasBiometricCredentials(),
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to remove biometric credentials'
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const getUserBiometricInfo = useCallback((userId?: string) => {
    const hasUserCredentials = userId ? hasBiometricCredentials(userId) : state.hasCredentials;
    const canUseBiometric = state.isSupported && state.isPlatformAvailable && hasUserCredentials;

    return {
      hasCredentials: hasUserCredentials,
      canUseBiometric
    };
  }, [state.isSupported, state.isPlatformAvailable, state.hasCredentials]);

  return {
    ...state,
    registerBiometric,
    authenticateWithBiometric: authenticate,
    removeBiometric,
    checkBiometricSupport,
    clearError,
    getUserBiometricInfo
  };
};

// Utility hook for quick biometric availability check
export const useBiometricAvailability = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [authenticatorType, setAuthenticatorType] = useState<string>('none');

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const isSupported = isBiometricSupported();
        const isPlatformAvailable = await isPlatformAuthenticatorAvailable();
        const biometricInfo = await getBiometricInfo();
        
        setIsAvailable(isSupported && isPlatformAvailable);
        setAuthenticatorType(biometricInfo.authenticatorType);
      } catch (error) {
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, []);

  return {
    isAvailable,
    isChecking,
    authenticatorType
  };
};