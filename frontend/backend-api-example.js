/**
 * Backend API Endpoint for Bank Verification
 * This should be deployed as a separate backend service (Node.js/Express)
 * to handle API calls securely without exposing secret keys in the frontend.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'], // Add your frontend URLs
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Keys (should be stored in environment variables)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_actual_paystack_secret_key';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-your_actual_flutterwave_secret';

/**
 * Bank Account Verification Endpoint
 * POST /api/verify-account
 */
app.post('/api/verify-account', async (req, res) => {
  try {
    const { account_number, bank_code, provider = 'paystack' } = req.body;

    // Validate input
    if (!account_number || !bank_code) {
      return res.status(400).json({
        success: false,
        error: 'Account number and bank code are required'
      });
    }

    // Validate Nigerian account number format
    if (!/^\\d{10}$/.test(account_number)) {
      return res.status(400).json({
        success: false,
        error: 'Account number must be exactly 10 digits'
      });
    }

    let result;

    if (provider === 'paystack') {
      result = await verifyWithPaystack(account_number, bank_code);
    } else if (provider === 'flutterwave') {
      result = await verifyWithFlutterwave(account_number, bank_code);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Use "paystack" or "flutterwave"'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Bank verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bank verification'
    });
  }
});

/**
 * Paystack Account Resolution
 */
async function verifyWithPaystack(accountNumber, bankCode) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.data.status === true && response.data.data) {
      return {
        success: true,
        data: {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number || accountNumber,
          verified: true,
          provider: 'paystack'
        }
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Account verification failed'
      };
    }
  } catch (error) {
    console.error('Paystack API error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 422) {
      return {
        success: false,
        error: 'Invalid account number or bank code'
      };
    } else if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Account not found'
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout. Please try again.'
      };
    }
    
    throw error; // Re-throw for general error handling
  }
}

/**
 * Flutterwave Account Resolution (Backup)
 */
async function verifyWithFlutterwave(accountNumber, bankCode) {
  try {
    const response = await axios.post(
      'https://api.flutterwave.com/v3/accounts/resolve',
      {
        account_number: accountNumber,
        account_bank: bankCode
      },
      {
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.data.status === 'success' && response.data.data) {
      return {
        success: true,
        data: {
          accountName: response.data.data.account_name,
          accountNumber: response.data.data.account_number || accountNumber,
          verified: true,
          provider: 'flutterwave'
        }
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Account verification failed'
      };
    }
  } catch (error) {
    console.error('Flutterwave API error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      return {
        success: false,
        error: 'Invalid account details'
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout. Please try again.'
      };
    }
    
    throw error; // Re-throw for general error handling
  }
}

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Bank verification API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Supported Banks Endpoint
 */
app.get('/api/banks', (req, res) => {
  const banks = [
    { code: '044', name: 'Access Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
    { code: '033', name: 'United Bank for Africa (UBA)' },
    { code: '057', name: 'Zenith Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '068', name: 'Sterling Bank' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '035', name: 'Wema Bank' },
    { code: '076', name: 'Polaris Bank' },
    // Add more banks as needed
  ];
  
  res.json({ banks });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Bank Verification API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;

/**
 * Instructions for deployment:
 * 
 * 1. Install dependencies:
 *    npm install express cors axios dotenv
 * 
 * 2. Create a .env file with your API keys:
 *    PAYSTACK_SECRET_KEY=sk_live_your_actual_paystack_secret
 *    FLUTTERWAVE_SECRET_KEY=FLWSECK_LIVE-your_actual_flutterwave_secret
 * 
 * 3. Run the server:
 *    node backend-api-example.js
 * 
 * 4. Deploy to your preferred hosting service (Railway, Vercel, Heroku, etc.)
 * 
 * 5. Update your frontend's REACT_APP_BACKEND_URL to point to your deployed API
 */