/**
 * Advanced Rate Limiting Middleware
 * Implements multiple rate limiting strategies with Redis support
 */

const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * Protects all API endpoints from abuse
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  },
  validate: { trustProxy: false }
});

/**
 * Strict Auth Rate Limiter
 * Extra protection for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Your IP has been temporarily blocked.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000),
      blockedUntil: req.rateLimit.resetTime
    });
  },
  validate: { trustProxy: false }
});

/**
 * Transaction Rate Limiter
 * Prevents rapid-fire transaction attempts
 */
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit to 10 transactions per minute
  message: {
    success: false,
    error: 'Too many transactions attempted. Please wait before trying again.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP for authenticated requests
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Transaction rate limit exceeded. Please wait before attempting another transaction.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Transaction rate limit exceeded. Please wait before attempting another transaction.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  },
  validate: false
});

/**
 * OTP Request Limiter
 * Prevents OTP spam
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Maximum 3 OTP requests per 10 minutes
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many OTP requests. Please wait before requesting another code.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * Strict Password Reset Limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Maximum 3 password reset attempts per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts. Please contact support if you need assistance.',
      retryAfter: Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });
  }
});

/**
 * Redis-based Rate Limiter (for production)
 * Uncomment when Redis is available
 */
const createRedisRateLimiter = (redisClient) => {
  const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');

  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => new Promise((resolve, reject) => { redisClient.client.send_command(args[0], args.slice(1), (err, reply) => { if (err) reject(err); else resolve(reply); }); }),
    }),
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    }
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  transactionLimiter,
  otpLimiter,
  passwordResetLimiter,
  createRedisRateLimiter
};
