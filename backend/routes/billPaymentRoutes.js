/**
 * Bill Payment Routes
 * API endpoints for Nigerian bill payments
 */

const express = require('express');
const router = express.Router();
const billPaymentService = require('../services/billPaymentService');

/**
 * GET /api/bills/billers
 * Get list of available billers
 */
router.get('/billers', async (req, res) => {
  try {
    const result = await billPaymentService.getBillers();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get billers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billers'
    });
  }
});

/**
 * POST /api/bills/verify-customer
 * Verify customer details (meter number, smartcard, etc.)
 */
router.post('/verify-customer', async (req, res) => {
  try {
    const { billerId, customerIdentifier, type } = req.body;

    if (!billerId || !customerIdentifier || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await billPaymentService.verifyCustomer({
      billerId,
      customerIdentifier,
      type
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Verify customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Customer verification failed'
    });
  }
});

/**
 * POST /api/bills/electricity
 * Purchase electricity (prepaid meter)
 */
router.post('/electricity', async (req, res) => {
  try {
    const { meterNumber, amount, disco, email, phoneNumber } = req.body;

    if (!meterNumber || !amount || !disco) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (amount < 500) {
      return res.status(400).json({
        success: false,
        error: 'Minimum purchase amount is ₦500'
      });
    }

    const result = await billPaymentService.purchaseElectricity({
      meterNumber,
      amount,
      disco,
      email,
      phoneNumber
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Electricity purchase error:', error);
    res.status(500).json({
      success: false,
      error: 'Electricity purchase failed'
    });
  }
});

/**
 * POST /api/bills/cable-tv
 * Purchase cable TV subscription
 */
router.post('/cable-tv', async (req, res) => {
  try {
    const { provider, smartcardNumber, package, amount, email, phoneNumber } = req.body;

    if (!provider || !smartcardNumber || !package || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await billPaymentService.purchaseCableTV({
      provider,
      smartcardNumber,
      packageName: package,
      amount,
      email,
      phoneNumber
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Cable TV purchase error:', error);
    res.status(500).json({
      success: false,
      error: 'Cable TV subscription failed'
    });
  }
});

/**
 * POST /api/bills/airtime
 * Purchase airtime
 */
router.post('/airtime', async (req, res) => {
  try {
    const { network, phoneNumber, amount } = req.body;

    if (!network || !phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (amount < 50 || amount > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be between ₦50 and ₦50,000'
      });
    }

    const result = await billPaymentService.purchaseAirtime({
      network,
      phoneNumber,
      amount
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Airtime purchase error:', error);
    res.status(500).json({
      success: false,
      error: 'Airtime purchase failed'
    });
  }
});

/**
 * POST /api/bills/data
 * Purchase mobile data
 */
router.post('/data', async (req, res) => {
  try {
    const { network, phoneNumber, plan, amount } = req.body;

    if (!network || !phoneNumber || !plan || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const result = await billPaymentService.purchaseData({
      network,
      phoneNumber,
      plan,
      amount
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Data purchase error:', error);
    res.status(500).json({
      success: false,
      error: 'Data purchase failed'
    });
  }
});

/**
 * GET /api/bills/data-plans/:network
 * Get data plans for a network
 */
router.get('/data-plans/:network', async (req, res) => {
  try {
    const { network } = req.params;

    const result = await billPaymentService.getDataPlans(network);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get data plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data plans'
    });
  }
});

/**
 * GET /api/bills/history/:userId
 * Get bill payment history
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await billPaymentService.getPaymentHistory(userId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;
