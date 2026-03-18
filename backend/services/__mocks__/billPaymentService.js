/**
 * Mock Bill Payment Service
 * Provides mock implementations for testing purposes
 */
const billPaymentService = {
  getBillers: jest.fn().mockResolvedValue({
    success: true,
    data: {
      electricity: [
        { id: 1, name: 'EKEDC Prepaid', biller_code: 'BIL119', type: 'prepaid', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
        { id: 2, name: 'IKEDC Prepaid', biller_code: 'BIL120', type: 'prepaid', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
      ],
      cable_tv: [
        { id: 3, name: 'DSTV', biller_code: 'BIL121', type: 'cable_tv', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false, packages: ['Compact', 'Premium'] },
        { id: 4, name: 'GOtv', biller_code: 'BIL122', type: 'cable_tv', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false, packages: ['Basic', 'Max'] },
      ],
      airtime: [
        { id: 5, name: 'MTN Airtime', biller_code: 'BIL123', type: 'airtime', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: true },
        { id: 6, name: 'Airtel Airtime', biller_code: 'BIL124', type: 'airtime', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: true },
      ],
      data: [],
      water: [],
    }
  }),
  verifyCustomer: jest.fn().mockImplementation(({ type, customerIdentifier }) => {
    if (type === 'electricity') {
      return Promise.resolve({
        success: true,
        data: {
          customerName: 'John Doe',
          meterNumber: customerIdentifier,
          address: '123 Test Street, Lagos',
          accountType: 'prepaid',
        }
      });
    }
    if (type === 'cable_tv') {
      return Promise.resolve({
        success: true,
        data: {
          customerName: 'John Doe',
          smartcardNumber: customerIdentifier,
          currentPackage: 'Compact',
        }
      });
    }
    return Promise.resolve({ success: true, data: { customerName: 'John Doe' } });
  }),
  purchaseElectricity: jest.fn().mockResolvedValue({
    success: true,
    data: {
      token: '1234-5678-9012-3456',
      units: '50.5',
      meterNumber: '12345678901',
      amount: 5000,
      reference: 'TXN123456',
      disco: 'ikeja-electric',
    },
    message: 'Electricity purchase successful'
  }),
  purchaseCableTV: jest.fn().mockResolvedValue({
    success: true,
    data: {
      status: 'successful',
      reference: 'TXN123457',
      package: 'Compact',
      validUntil: '2024-12-31',
      smartcardNumber: '1234567890',
      expiryDate: '2024-12-31',
    },
    message: 'Cable TV subscription successful'
  }),
  purchaseAirtime: jest.fn().mockResolvedValue({
    success: true,
    data: {
      reference: 'TXN123458',
      phoneNumber: '08012345678',
      amount: 1000,
      network: 'MTN',
      status: 'successful',
    },
    message: 'Airtime purchase successful'
  }),
  purchaseData: jest.fn().mockResolvedValue({
    success: true,
    data: {
      reference: 'TXN123459',
      phoneNumber: '08012345678',
      plan: '1GB',
      validity: '30 days',
      network: 'MTN',
      status: 'successful',
    },
    message: 'Data bundle purchase successful'
  }),
  getDataPlans: jest.fn().mockImplementation((network) => {
    const plans = {
      MTN: [
        { id: 1, name: '500MB Data', size: '500MB', price: 500, validity: '7 days', network: 'MTN' },
        { id: 2, name: '1GB Data', size: '1GB', price: 1000, validity: '30 days', network: 'MTN' },
      ],
      AIRTEL: [
        { id: 3, name: '500MB Data', size: '500MB', price: 500, validity: '7 days', network: 'AIRTEL' },
        { id: 4, name: '1GB Data', size: '1GB', price: 1000, validity: '30 days', network: 'AIRTEL' },
      ],
    };
    if (network && !plans[network]) {
      return Promise.resolve({ success: true, data: [] });
    }
    return Promise.resolve({
      success: true,
      data: plans[network] || plans.MTN
    });
  }),
  getPaymentHistory: jest.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, type: 'electricity', amount: 5000, status: 'success', date: '2024-01-01' },
      { id: 2, type: 'airtime', amount: 1000, status: 'success', date: '2024-01-02' },
    ]
  }),
};

module.exports = billPaymentService;
