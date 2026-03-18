const mockBillCategories = [
  { id: 1, name: 'EKEDC Prepaid', biller_code: 'BIL119', type: 'prepaid', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
  { id: 2, name: 'IKEDC Prepaid', biller_code: 'BIL120', type: 'prepaid', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
  { id: 3, name: 'DSTV', biller_code: 'BIL121', type: 'cable_tv', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
  { id: 4, name: 'GOtv', biller_code: 'BIL122', type: 'cable_tv', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: false },
  { id: 5, name: 'MTN Airtime', biller_code: 'BIL123', type: 'airtime', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: true },
  { id: 6, name: 'Airtel Airtime', biller_code: 'BIL124', type: 'airtime', country: 'NG', currency: 'NGN', min_amount: 0, max_amount: 0, is_airtime: true },
];

const mockGet = jest.fn((url) => {
  if (url.includes('/bill/categories')) {
    return Promise.resolve({ data: { status: true, data: mockBillCategories } });
  }
  return Promise.resolve({ data: { status: true, data: [] } });
});

const mockPost = jest.fn(() => Promise.resolve({ data: { status: true } }));

const axios = {
  get: mockGet,
  post: mockPost,
  create: jest.fn(() => ({
    get: mockGet,
    post: mockPost,
    defaults: { headers: { common: {} } },
    interceptors: {
      request:  { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
  defaults: { headers: { common: {} } },
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

module.exports = axios;
