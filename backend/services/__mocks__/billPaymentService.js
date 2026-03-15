/**
 * Mock Bill Payment Service
 * Provides mock implementations for testing purposes
 */

const billPaymentService = {
  getBillers: jest.fn().mockResolvedValue({ success: true, data: {} }),
  verifyCustomer: jest.fn().mockResolvedValue({ success: true, data: {} }),
  purchaseElectricity: jest.fn().mockResolvedValue({ success: true, data: {}, message: 'Mock purchase successful' }),
  purchaseCableTV: jest.fn().mockResolvedValue({ success: true, data: {}, message: 'Mock purchase successful' }),
  purchaseAirtime: jest.fn().mockResolvedValue({ success: true, data: {}, message: 'Mock purchase successful' }),
  purchaseData: jest.fn().mockResolvedValue({ success: true, data: {}, message: 'Mock purchase successful' }),
  getDataPlans: jest.fn().mockResolvedValue({ success: true, data: [] }),
  getPaymentHistory: jest.fn().mockResolvedValue({ success: true, data: [] }),
};

module.exports = billPaymentService;
