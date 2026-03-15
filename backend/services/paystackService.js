/**
 * Paystack Payment Gateway Integration
 * Handles Nigerian payment processing, transfers, and bill payments
 */

const axios = require('axios');

class PaystackService {
  constructor() {
    this.baseURL = 'https://api.paystack.co';
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    
    if (!this.secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Payment features will not work.');
    }
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Initialize a transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} - Transaction initialization response
   */
  async initializeTransaction({ email, amount, reference, metadata = {} }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // Convert to kobo
          reference,
          metadata,
          callback_url: process.env.PAYSTACK_CALLBACK_URL
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Transaction initialization failed'
      };
    }
  }

  /**
   * Verify a transaction
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} - Verification response
   */
  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Transaction verification failed'
      };
    }
  }

  /**
   * Create a transfer recipient
   * @param {Object} params - Recipient details
   * @returns {Promise<Object>} - Recipient creation response
   */
  async createTransferRecipient({ type = 'nuban', name, accountNumber, bankCode, currency = 'NGN' }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transferrecipient`,
        {
          type,
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack recipient creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Recipient creation failed'
      };
    }
  }

  /**
   * Initiate a transfer
   * @param {Object} params - Transfer parameters
   * @returns {Promise<Object>} - Transfer response
   */
  async initiateTransfer({ source = 'balance', amount, recipient, reason, reference }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/transfer`,
        {
          source,
          amount: Math.round(amount * 100), // Convert to kobo
          recipient,
          reason,
          reference
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack transfer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Transfer failed'
      };
    }
  }

  /**
   * Get list of Nigerian banks
   * @returns {Promise<Object>} - Banks list
   */
  async getBanks() {
    try {
      const response = await axios.get(
        `${this.baseURL}/bank?currency=NGN`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack banks fetch error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch banks'
      };
    }
  }

  /**
   * Resolve account number to get account name
   * @param {string} accountNumber - Account number
   * @param {string} bankCode - Bank code
   * @returns {Promise<Object>} - Account details
   */
  async resolveAccountNumber(accountNumber, bankCode) {
    try {
      const response = await axios.get(
        `${this.baseURL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack account resolution error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Account resolution failed'
      };
    }
  }

  /**
   * Verify BVN (Bank Verification Number)
   * @param {string} bvn - Bank Verification Number
   * @returns {Promise<Object>} - BVN verification response
   */
  async verifyBVN(bvn) {
    try {
      const response = await axios.get(
        `${this.baseURL}/bank/resolve_bvn/${bvn}`,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Paystack BVN verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'BVN verification failed'
      };
    }
  }

  /**
   * Get transaction history
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Transaction history
   */
  async getTransactions({ perPage = 50, page = 1, from, to, status }) {
    try {
      let url = `${this.baseURL}/transaction?perPage=${perPage}&page=${page}`;
      
      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;
      if (status) url += `&status=${status}`;

      const response = await axios.get(url, { headers: this.getHeaders() });

      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta
      };
    } catch (error) {
      console.error('Paystack transactions fetch error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch transactions'
      };
    }
  }
}

module.exports = new PaystackService();
