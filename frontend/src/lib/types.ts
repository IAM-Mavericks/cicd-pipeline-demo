export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  balance: number;
  currency: 'NGN' | 'USD' | 'EUR' | 'GBP';
  accountType: 'savings' | 'current';
}

export interface Transaction {
  id: string;
  fromAccountId: string;
  toAccountId?: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  category: 'transfer' | 'payment' | 'withdrawal' | 'deposit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  recipient?: {
    name: string;
    accountNumber: string;
    bank: string;
  };
}

export interface VirtualCard {
  id: string;
  userId: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardType: 'verve' | 'visa' | 'mastercard';
  status: 'active' | 'blocked' | 'expired';
  balance: number;
  currency: string;
  nickname: string;
  createdAt: Date;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  recipient: {
    accountNumber: string;
    bankCode: string;
    name: string;
  };
  description: string;
  isInternational: boolean;
}