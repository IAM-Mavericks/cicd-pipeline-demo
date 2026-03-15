/**
 * Authentication Routes
 * Handles user registration, login, MFA, and password management
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mfaService = require('../services/mfaService');
const deviceFingerprintService = require('../services/deviceFingerprintService');
const complianceService = require('../services/complianceService');
const ledgerService = require('../services/ledgerService');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or phone number already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      status: 'active',
      emailVerified: false,
      phoneVerified: false
    });

    // Generate account number
    const accountNumber = user.generateAccountNumber('NGN');
    user.accounts.push({
      accountNumber,
      accountName: user.getFullName(),
      currency: 'NGN',
      balance: '0.00',
      type: 'savings',
      status: 'active'
    });

    // Generate referral code
    user.referralCode = `MVP${Date.now().toString(36).toUpperCase()}`;

    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send verification email/SMS (in production)
    // await sendVerificationEmail(user.email);
    // await sendVerificationSMS(user.phoneNumber);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          accountNumber: user.accounts[0].accountNumber,
          kycTier: user.kyc.tier
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/login
 * User login with device fingerprinting
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user (include password field)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact support.`
      });
    }

    // Check if account is locked
    if (user.security.lockedUntil && user.security.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.security.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        error: `Account locked. Try again in ${minutesLeft} minutes.`
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.security.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.security.failedLoginAttempts >= 5) {
        user.security.lockedUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
        await user.save();

        return res.status(403).json({
          success: false,
          error: 'Account locked due to multiple failed login attempts. Try again in 30 minutes.'
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        error: `Invalid email or password. ${5 - user.security.failedLoginAttempts} attempts remaining.`
      });
    }

    // Reset failed attempts on successful login
    user.security.failedLoginAttempts = 0;
    user.security.lockedUntil = null;

    // Device fingerprinting
    const fingerprint = deviceFingerprintService.generateFingerprint(req);
    const location = deviceFingerprintService.getLocationFromIP(
      req.ip || req.connection.remoteAddress
    );

    // Register/update device
    const deviceResult = await deviceFingerprintService.registerDevice(
      user._id.toString(),
      fingerprint,
      deviceInfo || {},
      location
    );

    // Check if MFA is required
    const mfaAssessment = process.env.ENABLE_MFA === 'false'
      ? { mfaRequired: false, mfaMethod: 'none' }
      : await mfaService.assessMFARequirement({
          userId: user._id.toString(),
          action: 'login',
          deviceFingerprint: fingerprint,
          ipAddress: req.ip,
          location,
          userHistory: {
            trustedDevices: user.security.trustedDevices.map(d => d.fingerprint)
          }
        });

    // Add to login history
    user.security.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      location,
      deviceFingerprint: fingerprint,
      success: true
    });

    user.lastLoginAt = new Date();
    await user.save();

    // Ensure a corresponding ledger account exists for the user's primary Mongo account
    try {
      const primaryAccount = Array.isArray(user.accounts) && user.accounts.length > 0
        ? user.accounts[0]
        : null;

      if (primaryAccount && primaryAccount.accountNumber) {
        const existingLedgerAccount = await ledgerService.getAccountByNumber(primaryAccount.accountNumber);

        if (!existingLedgerAccount) {
          await ledgerService.createAccount({
            userId: user._id.toString(),
            accountNumber: primaryAccount.accountNumber,
            currency: primaryAccount.currency || 'NGN',
            type: 'ASSET',
            name: primaryAccount.accountName || `${user.firstName} ${user.lastName}`,
            description: 'Primary wallet account'
          });
        }
      }
    } catch (ledgerError) {
      console.error('Failed to ensure ledger account for user:', ledgerError);
      // Do not block login if ledger provisioning fails
    }

    // If MFA required, send OTP and return pending status
    if (mfaAssessment.mfaRequired) {
      const otpResult = await mfaService.generateOTP(user._id.toString(), mfaAssessment.mfaMethod);
      
      // Send OTP via SMS/Email
      if (mfaAssessment.mfaMethod === 'sms') {
        await mfaService.sendSMS(user.phoneNumber, otpResult.otp);
      } else if (mfaAssessment.mfaMethod === 'email') {
        await mfaService.sendEmail(user.email, otpResult.otp);
      }

      return res.status(200).json({
        success: true,
        mfaRequired: true,
        mfaMethod: mfaAssessment.mfaMethod,
        message: `Verification code sent to your ${mfaAssessment.mfaMethod}`,
        sessionId: user._id.toString() // Temporary session ID for MFA verification
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        kycTier: user.kyc.tier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          accounts: user.accounts,
          kycTier: user.kyc.tier,
          preferences: user.preferences
        },
        tokens: {
          accessToken,
          refreshToken
        },
        deviceInfo: {
          isNewDevice: deviceResult.isNewDevice,
          trusted: deviceFingerprintService.isDeviceTrusted(user._id.toString(), fingerprint)
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/verify-mfa
 * Verify MFA code and complete login
 */
router.post('/verify-mfa', async (req, res) => {
  try {
    const { sessionId, code, method } = req.body;

    if (!sessionId || !code || !method) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, code, and method are required'
      });
    }

    // Verify OTP or TOTP
    let verificationResult;
    
    if (method === 'totp') {
      const user = await User.findById(sessionId).select('+security.mfa.totpSecret');
      if (!user || !user.security.mfa.totpSecret) {
        return res.status(400).json({
          success: false,
          error: 'TOTP not set up for this account'
        });
      }
      verificationResult = mfaService.verifyTOTP(user.security.mfa.totpSecret, code);
    } else {
      verificationResult = await mfaService.verifyOTP(sessionId, code, method);
    }

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        error: verificationResult.error
      });
    }

    // Get user
    const user = await User.findById(sessionId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        kycTier: user.kyc.tier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'MFA verification successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          accounts: user.accounts,
          kycTier: user.kyc.tier,
          preferences: user.preferences
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed'
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        kycTier: user.kyc.tier 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        accessToken
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  try {
    // In production, invalidate tokens in Redis
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

module.exports = router;
