/**
 * Biometric Authentication Utilities
 * Uses Web Authentication API (WebAuthn) for secure biometric authentication
 */

// Types for WebAuthn
export interface BiometricCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  type: string;
}

export interface BiometricAuthResult {
  success: boolean;
  credential?: BiometricCredential;
  error?: string;
}

export interface BiometricRegistrationOptions {
  userId: string;
  userName: string;
  userDisplayName: string;
}

/**
 * Check if biometric authentication is supported in the current browser
 */
export const isBiometricSupported = (): boolean => {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get
  );
};

/**
 * Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
 */
export const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isBiometricSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.warn('Error checking platform authenticator availability:', error);
    return false;
  }
};

/**
 * Generate a random challenge for WebAuthn
 */
const generateChallenge = (): ArrayBuffer => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array.buffer;
};

/**
 * Convert ArrayBuffer to Base64URL string
 */
const arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Convert Base64URL string to ArrayBuffer
 */
const base64UrlToArrayBuffer = (base64url: string): ArrayBuffer => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const paddedBase64 = padding ? base64 + '='.repeat(4 - padding) : base64;
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Register a new biometric credential
 */
export const registerBiometricCredential = async (
  options: BiometricRegistrationOptions
): Promise<BiometricAuthResult> => {
  try {
    if (!isBiometricSupported()) {
      return {
        success: false,
        error: 'Biometric authentication is not supported in this browser'
      };
    }

    const challenge = generateChallenge();
    const userId = new TextEncoder().encode(options.userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'SznPay',
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: options.userName,
        displayName: options.userDisplayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'direct'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    if (!credential) {
      return {
        success: false,
        error: 'Failed to create biometric credential'
      };
    }

    // Store credential info in localStorage (in production, this should be sent to server)
    const credentialInfo = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      userId: options.userId,
      userName: options.userName,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(`biometric_credential_${options.userId}`, JSON.stringify(credentialInfo));

    return {
      success: true,
      credential: {
        id: credential.id,
        rawId: credential.rawId,
        response: credential.response as AuthenticatorAttestationResponse,
        type: credential.type
      }
    };
  } catch (error: unknown) {
    console.error('Biometric registration error:', error);
    
    let errorMessage = 'Failed to register biometric authentication';
    if (error instanceof Error) {
      if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported on this device';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled or not allowed';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Biometric credential already exists for this account';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Authenticate using biometric credential
 */
export const authenticateWithBiometric = async (userId?: string): Promise<BiometricAuthResult> => {
  try {
    if (!isBiometricSupported()) {
      return {
        success: false,
        error: 'Biometric authentication is not supported in this browser'
      };
    }

    // Get stored credentials
    const credentialIds: string[] = [];
    
    if (userId) {
      // Try to get specific user credential
      const storedCredential = localStorage.getItem(`biometric_credential_${userId}`);
      if (storedCredential) {
        const credInfo = JSON.parse(storedCredential);
        credentialIds.push(credInfo.id);
      }
    } else {
      // Get all stored credentials
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('biometric_credential_')) {
          const credInfo = JSON.parse(localStorage.getItem(key) || '{}');
          if (credInfo.id) {
            credentialIds.push(credInfo.id);
          }
        }
      }
    }

    if (credentialIds.length === 0) {
      return {
        success: false,
        error: 'No biometric credentials found. Please set up biometric authentication first.'
      };
    }

    const challenge = generateChallenge();
    
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: credentialIds.map(id => ({
        id: base64UrlToArrayBuffer(id),
        type: 'public-key',
        transports: ['internal']
      })),
      timeout: 60000,
      userVerification: 'required'
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential;

    if (!credential) {
      return {
        success: false,
        error: 'Biometric authentication failed'
      };
    }

    return {
      success: true,
      credential: {
        id: credential.id,
        rawId: credential.rawId,
        response: credential.response as AuthenticatorAssertionResponse,
        type: credential.type
      }
    };
  } catch (error: unknown) {
    console.error('Biometric authentication error:', error);
    
    let errorMessage = 'Biometric authentication failed';
    if (error instanceof Error) {
      if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported on this device';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Invalid biometric credential state';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if user has biometric credentials set up
 */
export const hasBiometricCredentials = (userId?: string): boolean => {
  if (userId) {
    return localStorage.getItem(`biometric_credential_${userId}`) !== null;
  }
  
  // Check if any biometric credentials exist
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('biometric_credential_')) {
      return true;
    }
  }
  return false;
};

/**
 * Remove biometric credentials for a user
 */
export const removeBiometricCredentials = (userId: string): void => {
  localStorage.removeItem(`biometric_credential_${userId}`);
};

/**
 * Get biometric authenticator info
 */
export const getBiometricInfo = async () => {
  const isSupported = isBiometricSupported();
  const isPlatformAvailable = await isPlatformAuthenticatorAvailable();
  
  let authenticatorType = 'none';
  if (isPlatformAvailable) {
    // Try to detect the type of authenticator
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      authenticatorType = 'Touch ID';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      authenticatorType = 'Face ID / Touch ID';
    } else if (userAgent.includes('windows')) {
      authenticatorType = 'Windows Hello';
    } else if (userAgent.includes('android')) {
      authenticatorType = 'Fingerprint / Face Unlock';
    } else {
      authenticatorType = 'Platform Authenticator';
    }
  }

  return {
    isSupported,
    isPlatformAvailable,
    authenticatorType,
    hasCredentials: hasBiometricCredentials()
  };
};
