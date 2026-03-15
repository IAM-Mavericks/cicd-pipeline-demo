import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');

      const url = error.config?.url || '';

      if (
        !url.includes('/auth/login') &&
        !url.includes('/auth/register') &&
        !url.includes('/auth/verify-mfa')
      ) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export interface TransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: string; // keep as string to preserve decimal precision from inputs
  currency: string;
  reference?: string;
  description?: string;
}

export interface TransferResponse {
  success: boolean;
  message?: string;
  data?: {
    success: boolean;
    transactionId: string;
    paymentId: string;
    fromAccount: {
      id: number;
      balance: string;
      availableBalance: string;
    };
    toAccount: {
      id: number;
      balance: string;
      availableBalance: string;
    };
  };
}

export async function transferFunds(payload: TransferRequest): Promise<TransferResponse> {
  const response = await api.post<TransferResponse>('/transfer', payload);
  return response.data;
}

export interface FxTransferRequest {
  fromAccountId: number;
  toAccountId: number;
  amount: string;
  reference?: string;
  description?: string;
}

export interface FxTransferResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export async function convertBetweenAccounts(
  payload: FxTransferRequest
): Promise<FxTransferResponse> {
  const response = await api.post<FxTransferResponse>('/transfer/fx', payload);
  return response.data;
}

export interface BankTransferRequest {
  amount: string;
  currency: string;
  recipientAccountNumber: string;
  recipientBankCode: string;
  recipientName?: string;
  reference?: string;
  description?: string;
}

export type BankTransferResponse = TransferResponse;

export async function performBankTransfer(
  payload: BankTransferRequest
): Promise<BankTransferResponse> {
  const response = await api.post<BankTransferResponse>('/transfer/bank', payload);
  return response.data;
}

export interface LedgerAccount {
  id: number;
  account_number: string;
  currency: string;
  balance: string;
  available_balance: string;
}

export interface LedgerAccountTransactionRow {
  payment_id: string;
  transaction_id: string;
  from_account_id: number;
  to_account_id: number;
  amount: string;
  currency: string;
  payment_status: string;
  description: string | null;
  payment_created_at: string;
  transaction_type: string;
  transaction_status: string;
  reference: string | null;
  payment_metadata?: Record<string, unknown>;
  transaction_metadata?: Record<string, unknown>;
}

export async function getLedgerAccount(accountId: number): Promise<LedgerAccount> {
  const response = await api.get<{ success: boolean; data: LedgerAccount }>(`/ledger/accounts/${accountId}`);
  return response.data.data;
}

export async function getLedgerAccountByNumber(accountNumber: string): Promise<LedgerAccount> {
  const response = await api.get<{ success: boolean; data: LedgerAccount }>(
    `/ledger/accounts/by-number/${accountNumber}`
  );
  return response.data.data;
}

// Convenience helper: perform FX conversion using ledger account numbers
// instead of numeric IDs. This is useful for future top-up flows where
// the user provides account numbers per currency.
export async function convertBetweenAccountsByNumber(
  fromAccountNumber: string,
  toAccountNumber: string,
  amount: string,
  description?: string
): Promise<FxTransferResponse> {
  const from = await getLedgerAccountByNumber(fromAccountNumber);
  const to = await getLedgerAccountByNumber(toAccountNumber);

  return convertBetweenAccounts({
    fromAccountId: from.id,
    toAccountId: to.id,
    amount,
    description,
  });
}

export async function openUserLedgerAccount(
  currency: string,
  name?: string,
  description?: string
): Promise<LedgerAccount> {
  const response = await api.post<{ success: boolean; data: LedgerAccount }>(
    '/ledger/accounts',
    {
      currency,
      name,
      description,
    }
  );

  return response.data.data;
}

export async function getPrimaryLedgerAccount(): Promise<LedgerAccount> {
  const response = await api.get<{ success: boolean; data: LedgerAccount }>(
    '/ledger/accounts/primary'
  );
  return response.data.data;
}

export async function getUserLedgerAccounts(): Promise<LedgerAccount[]> {
  const response = await api.get<{ success: boolean; data: LedgerAccount[] }>(
    '/ledger/accounts'
  );
  return response.data.data;
}

export async function getLedgerAccountTransactions(
  accountId: number,
  limit = 5,
  offset = 0
): Promise<LedgerAccountTransactionRow[]> {
  const response = await api.get<{ success: boolean; data: LedgerAccountTransactionRow[] }>(
    `/ledger/accounts/${accountId}/transactions`,
    {
      params: { limit, offset },
    }
  );
  return response.data.data;
}

export default api;
