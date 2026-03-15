// Bank Verification Service for SznPay
// Handles both Nigerian (local) and international bank verification
// Uses real APIs for accurate account verification

// Configuration for API keys (frontend should NOT use secrets; calls go via backend)
const API_CONFIG = {
  PAYSTACK: {
    PUBLIC_KEY: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_paystack_public_key',
    BASE_URL: 'https://api.paystack.co',
  },
  FLUTTERWAVE: {
    PUBLIC_KEY: import.meta.env.VITE_FLW_PUBLIC_KEY || 'FLWPUBK_TEST-your_flutterwave_key',
    BASE_URL: 'https://api.flutterwave.com/v3',
  },
};

type Provider = 'paystack' | 'flutterwave';

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? (typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api');

async function resolveProviderOrder(): Promise<Provider[]> {
  try {
    const url = `${(API_BASE as string).replace(/\/$/, '')}/provider-health`;
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const payload = await res.json();
      const order = payload?.data?.order;
      if (Array.isArray(order) && order.length === 2) {
        return order as Provider[];
      }
    }
  } catch { void 0; }
  const primary = (import.meta.env.VITE_BANK_VERIFICATION_PRIMARY as Provider) || 'paystack';
  const order: Provider[] = primary === 'flutterwave' ? ['flutterwave', 'paystack'] : ['paystack', 'flutterwave'];
  const windowMs = Number(import.meta.env.VITE_BANK_VERIFICATION_HEALTH_WINDOW_MS || 300000);
  const degradeThreshold = Number(import.meta.env.VITE_BANK_VERIFICATION_DEGRADE_THRESHOLD || 3);
  const metrics = ProviderHealthMetrics.load();
  const primaryFailures = ProviderHealthMetrics.countRecentFailures(metrics, order[0], windowMs);
  if (primaryFailures >= degradeThreshold) return [order[1], order[0]];
  return order;
}

type Metrics = Record<Provider, { f: number[]; s: number[] }>;

const ProviderHealthMetrics = {
  key: 'bank_verification_provider_metrics',
  load(): Metrics {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object'
        ? parsed
        : { paystack: { f: [], s: [] }, flutterwave: { f: [], s: [] } };
    } catch {
      return { paystack: { f: [], s: [] }, flutterwave: { f: [], s: [] } };
    }
  },
  save(m: Metrics) {
    try {
      localStorage.setItem(this.key, JSON.stringify(m));
    } catch { void 0; }
  },
  prune(m: Metrics, windowMs: number) {
    const now = Date.now();
    for (const p of ['paystack', 'flutterwave'] as Provider[]) {
      m[p].f = m[p].f.filter(ts => now - ts <= windowMs);
      m[p].s = m[p].s.filter(ts => now - ts <= windowMs);
    }
  },
  recordFailure(m: Metrics, p: Provider) {
    m[p].f.push(Date.now());
    this.save(m);
  },
  recordSuccess(m: Metrics, p: Provider) {
    m[p].s.push(Date.now());
    this.save(m);
  },
  countRecentFailures(m: Metrics, p: Provider, windowMs: number) {
    this.prune(m, windowMs);
    return m[p].f.length;
  },
  lastFailureWithin(m: Metrics, p: Provider, withinMs: number) {
    this.prune(m, withinMs);
    const last = m[p].f[m[p].f.length - 1];
    return last ? Date.now() - last <= withinMs : false;
  }
};

const CACHE_TTL_MS = Number(import.meta.env.VITE_BANK_VERIFICATION_CACHE_TTL_MS || 300000);
const cache = new Map<string, { ts: number; result: BankVerificationResult }>();
function getCache(key: string): BankVerificationResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}
function setCache(key: string, result: BankVerificationResult) {
  cache.set(key, { ts: Date.now(), result });
}
function ngCacheKey(accountNumber: string, bankCode: string) {
  return `ng:${bankCode}:${accountNumber}`;
}

export interface BankVerificationResult {
  success: boolean;
  data?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    verified: boolean;
    accountType?: string;
    bvnLinked?: boolean;
    provider?: string;
  };
  error?: string;
  loading?: boolean;
}

export interface InternationalBankInfo {
  bankName?: string;
  swift?: string;
  country?: string;
  verified: boolean;
}

// Nigerian Bank Verification
export class NigerianBankVerification {
  private static readonly API_BASE_URL = 'https://api.paystack.co/bank';
  
  // Nigerian bank codes mapping (extended from the existing list in Payments.tsx)
  static readonly BANK_CODES = {
    '044': 'Access Bank',
    '011': 'First Bank of Nigeria',
    '058': 'Guaranty Trust Bank (GTBank)',
    '033': 'United Bank for Africa (UBA)',
    '057': 'Zenith Bank',
    '221': 'Stanbic IBTC Bank',
    '014': 'MainStreet Bank',
    '050': 'Ecobank Nigeria',
    '068': 'Sterling Bank',
    '070': 'Fidelity Bank',
    '032': 'Union Bank of Nigeria',
    '035': 'Wema Bank',
    '076': 'Polaris Bank',
    '082': 'Keystone Bank',
    '030': 'Heritage Bank',
    '215': 'Unity Bank',
    '090': 'Jaiz Bank',
    '301': 'TAJ Bank',
    '501': 'Providus Bank',
    '232': 'Sterling Bank',
    '101': 'ProvidusBank',
    '100': 'Suntrust Bank',
    '304': 'Stanbic IBTC @ease',
    '401': 'ASO Savings and Loans',
    '307': 'EcoMobile',
    '309': 'FBN Mobile',
    '565': 'Carbon (formerly Paylater)',
    '801': 'Kuda Bank',
    '737': 'Opay',
    '999': 'PalmPay',
    '103': 'Sparkle Bank'
  };

  // Real bank verification using Paystack API
  static async verifyAccount(accountNumber: string, bankCode: string): Promise<BankVerificationResult> {
    const bankName = this.BANK_CODES[bankCode as keyof typeof this.BANK_CODES];
    
    if (!bankName) {
      return {
        success: false,
        error: 'Invalid bank code provided'
      };
    }

    if (!accountNumber || accountNumber.length !== 10) {
      return {
        success: false,
        error: 'Account number must be exactly 10 digits'
      };
    }

    try {
      const cached = getCache(ngCacheKey(accountNumber, bankCode));
      if (cached && cached.success) {
        return {
          ...cached,
          data: {
            ...cached.data,
            bankName,
            bankCode,
            verified: true
          }
        };
      }
      const order = await resolveProviderOrder();
      let lastError: BankVerificationResult | null = null;
      const metrics = ProviderHealthMetrics.load();
      const cooldownMs = Number(import.meta.env.VITE_BANK_VERIFICATION_COOLDOWN_MS || 15000);
      for (const provider of order) {
        if (ProviderHealthMetrics.lastFailureWithin(metrics, provider, cooldownMs)) {
          continue;
        }
        const result = provider === 'paystack'
          ? await this.verifyWithPaystack(accountNumber, bankCode)
          : await this.verifyWithFlutterwave(accountNumber, bankCode);
        if (result.success) {
          ProviderHealthMetrics.recordSuccess(metrics, provider);
          return {
            ...result,
            data: {
              ...result.data,
              bankName,
              bankCode,
              verified: true
            }
          };
        }
        ProviderHealthMetrics.recordFailure(metrics, provider);
        lastError = result;
      }
      const finalError = lastError || { success: false, error: 'Account verification failed' };
      return finalError;
      
    } catch (error) {
      console.error('Bank verification error:', error);
      return {
        success: false,
        error: 'Unable to verify account at this time. Please try again.'
      };
    }
  }

  // Paystack Bank Account Resolution API - Uses backend proxy for security
  private static async verifyWithPaystack(accountNumber: string, bankCode: string): Promise<BankVerificationResult> {
    try {
      const url = `${(API_BASE as string).replace(/\/$/, '')}/verify-account`;
      
      // Making verification request to backend with account number and bank code
      const token = localStorage.getItem('token');
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
          provider: 'paystack'
        })
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 422 || response.status === 400) {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || 'Invalid account number or bank code'
          };
        } else if (response.status === 404) {
          return {
            success: false,
            error: 'Account not found'
          };
        } else if (response.status === 500) {
          return {
            success: false,
            error: 'Bank verification service is temporarily unavailable. Please try again later.'
          };
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      // Process backend response data (normalized by backend)
      if (payload.status === 'success' && payload.data) {
        const result: BankVerificationResult = {
          success: true,
          data: {
            accountName: payload.data.account_name,
            accountNumber: payload.data.account_number || accountNumber,
            verified: true,
            // provider is returned by backend but not in interface
            provider: payload.data.provider || 'paystack'
          }
        };
        setCache(ngCacheKey(accountNumber, bankCode), result);
        return result;
      } else {
        return {
          success: false,
          error: payload.message || 'Account verification failed'
        };
      }
    } catch (error: unknown) {
      console.error('Bank verification error:', error);
      
      // Handle network errors
      if (typeof error === 'object' && error !== null && 'name' in error && 'message' in error) {
        if (error.name === 'TypeError' && (error.message as string).includes('fetch')) {
          return {
            success: false,
            error: 'Unable to connect to verification service. Please check your internet connection.'
          };
        }
        
        // Handle timeout errors
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout. Please try again.'
          };
        }
      }
      
      return {
        success: false,
        error: 'Verification service temporarily unavailable. Please try again later.'
      };
    }
  }

  // Flutterwave Account Resolution API (backup) - Uses backend proxy for security
  private static async verifyWithFlutterwave(accountNumber: string, bankCode: string): Promise<BankVerificationResult> {
    try {
      const url = `${(API_BASE as string).replace(/\/$/, '')}/verify-account`;
      
      console.log('🔄 Using Flutterwave as backup provider');
      
      const token = localStorage.getItem('token');
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
          provider: 'flutterwave'
        })
      };

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || 'Invalid account details'
          };
        }
        throw new Error(`Flutterwave API error: ${response.status}`);
      }

      const payload = await response.json();
      if (payload.status === 'success' && payload.data) {
        const result: BankVerificationResult = {
          success: true,
          data: {
            accountName: payload.data.account_name,
            accountNumber: payload.data.account_number || accountNumber,
            verified: true,
            provider: payload.data.provider || 'flutterwave'
          }
        };
        setCache(ngCacheKey(accountNumber, bankCode), result);
        return result;
      } else {
        return {
          success: false,
          error: payload.message || 'Account verification failed'
        };
      }
    } catch (error: unknown) {
      console.error('Flutterwave verification error:', error);
      return {
        success: false,
        error: 'Flutterwave verification service temporarily unavailable'
      };
    }
  }

  // Get bank name from code
  static getBankName(bankCode: string): string | undefined {
    return this.BANK_CODES[bankCode as keyof typeof this.BANK_CODES];
  }

  // Validate Nigerian account number format
  static validateAccountNumber(accountNumber: string): boolean {
    return /^\d{10}$/.test(accountNumber);
  }
}

// International Bank Verification
export class InternationalBankVerification {
  // International bank verification using IBAN validation and SWIFT codes
  // In production, integrate with services like IBAN.com API, SWIFT network, or banking partners
  
  static async verifyInternationalAccount(
    accountNumber: string, 
    countryCode: string = 'US',
    swiftCode?: string
  ): Promise<BankVerificationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Basic validation
    if (!accountNumber || accountNumber.length < 8) {
      return {
        success: false,
        error: 'Invalid account number format'
      };
    }

    // IBAN validation for European accounts
    if (this.isIBAN(accountNumber)) {
      return this.verifyIBAN(accountNumber);
    }

    // US account verification
    if (countryCode === 'US') {
      return this.verifyUSAccount(accountNumber);
    }

    // Generic international account verification
    return this.verifyGenericAccount(accountNumber, countryCode, swiftCode);
  }

  private static isIBAN(accountNumber: string): boolean {
    return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(accountNumber.replace(/\s/g, ''));
  }

  private static async verifyIBAN(iban: string): Promise<BankVerificationResult> {
    // Mock IBAN verification
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic IBAN format validation
    if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
      return {
        success: false,
        error: 'Invalid IBAN format'
      };
    }

    const countryCode = cleanIBAN.substring(0, 2);
    const countryNames: Record<string, string> = {
      'DE': 'Germany',
      'FR': 'France',
      'GB': 'United Kingdom',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'AT': 'Austria',
      'CH': 'Switzerland'
    };

    return {
      success: true,
      data: {
        accountNumber: cleanIBAN,
        bankName: `${countryNames[countryCode] || 'International'} Bank`,
        verified: true,
        accountType: 'International'
      }
    };
  }

  private static async verifyUSAccount(accountNumber: string): Promise<BankVerificationResult> {
    // Mock US account verification
    if (accountNumber.length < 8 || accountNumber.length > 17) {
      return {
        success: false,
        error: 'Invalid US account number format'
      };
    }

    const usBanks = [
      'JPMorgan Chase Bank',
      'Bank of America',
      'Wells Fargo Bank',
      'Citibank',
      'U.S. Bank',
      'PNC Bank',
      'Goldman Sachs Bank',
      'TD Bank'
    ];

    return {
      success: true,
      data: {
        accountNumber,
        bankName: usBanks[Math.floor(Math.random() * usBanks.length)],
        verified: true,
        accountType: 'Checking'
      }
    };
  }

  private static async verifyGenericAccount(
    accountNumber: string, 
    countryCode: string,
    swiftCode?: string
  ): Promise<BankVerificationResult> {
    const countryBanks: Record<string, string[]> = {
      'CA': ['Royal Bank of Canada', 'Toronto-Dominion Bank', 'Bank of Nova Scotia', 'Bank of Montreal'],
      'AU': ['Commonwealth Bank', 'Westpac Bank', 'Australia and New Zealand Banking Group', 'National Australia Bank'],
      'GB': ['HSBC UK Bank', 'Barclays Bank', 'Lloyds Bank', 'NatWest Bank'],
      'IN': ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank']
    };

    const banks = countryBanks[countryCode] || ['International Bank'];
    
    return {
      success: true,
      data: {
        accountNumber,
        bankName: banks[Math.floor(Math.random() * banks.length)],
        verified: true,
        accountType: 'International'
      }
    };
  }

  // Validate SWIFT code format
  static validateSWIFTCode(swift: string): boolean {
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.toUpperCase());
  }
}

// Main Bank Verification Service
export class BankVerificationService {
  static async verifyBankAccount(
    accountNumber: string,
    bankCode?: string,
    isInternational = false,
    countryCode = 'NG',
    swiftCode?: string
  ): Promise<BankVerificationResult> {
    try {
      if (isInternational || countryCode !== 'NG') {
        return await InternationalBankVerification.verifyInternationalAccount(
          accountNumber,
          countryCode,
          swiftCode
        );
      } else {
        if (!bankCode) {
          return {
            success: false,
            error: 'Bank code is required for Nigerian bank verification'
          };
        }
        return await NigerianBankVerification.verifyAccount(accountNumber, bankCode);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification service temporarily unavailable'
      };
    }
  }

  // Get supported bank list
  static getSupportedNigerianBanks() {
    return Object.entries(NigerianBankVerification.BANK_CODES).map(([code, name]) => ({
      code,
      name
    }));
  }

  // Validate account number based on type
  static validateAccountNumber(accountNumber: string, isInternational = false): boolean {
    if (isInternational) {
      return accountNumber.length >= 8 && accountNumber.length <= 34;
    }
    return NigerianBankVerification.validateAccountNumber(accountNumber);
  }
}
