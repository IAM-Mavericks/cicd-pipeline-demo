const jwt = require('jsonwebtoken');
const logger = require('./logger');

const DEV_ACCESS_FALLBACK = 'mavenpay-jwt-secret-key-change-in-production';
const DEV_REFRESH_FALLBACK = 'mavenpay-refresh-secret-key-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

const resolveSecret = (envValue, fallbackValue, varName) => {
  if (envValue) {
    if (envValue.length < 32) {
      throw new Error(`${varName} must be at least 32 characters long`);
    }
    return envValue;
  }

  if (isProduction) {
    throw new Error(`${varName} environment variable must be set in production`);
  }

  logger.warn(
    `[SECURITY] ${varName} not set. Using insecure development fallback. Do NOT use this configuration in production.`
  );

  return fallbackValue;
};

const JWT_SECRET = resolveSecret(process.env.JWT_SECRET, DEV_ACCESS_FALLBACK, 'JWT_SECRET');
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const JWT_REFRESH_SECRET = resolveSecret(process.env.JWT_REFRESH_SECRET, DEV_REFRESH_FALLBACK, 'JWT_REFRESH_SECRET');
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

process.env.JWT_SECRET = JWT_SECRET;
process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;

/**
 * Generate access token
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  } catch (error) {
    logger.logError(error, { context: 'JWT token generation' });
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRE });
  } catch (error) {
    logger.logError(error, { context: 'JWT refresh token generation' });
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify access token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      logger.logError(error, { context: 'JWT token verification' });
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      logger.logError(error, { context: 'JWT refresh token verification' });
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Generate both access and refresh tokens
 */
const generateTokens = (payload) => {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRE
  };
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    const newAccessToken = generateToken(payload);

    return {
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRE
    };
  } catch (error) {
    logger.logError(error, { context: 'Token refresh' });
    throw error;
  }
};

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        errorCode: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);

    // Add user info to request
    req.user = decoded;

    // Log successful authentication
    logger.logSecurityEvent({
      eventType: 'authentication_success',
      userId: decoded.userId,
      severity: 'low',
      description: 'JWT token authenticated successfully',
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      }
    });

    next();
  } catch (error) {
    logger.logSecurityEvent({
      eventType: 'authentication_failure',
      severity: 'medium',
      description: 'JWT token authentication failed',
      metadata: {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      }
    });

    return res.status(401).json({
      success: false,
      error: error.message,
      errorCode: 'INVALID_TOKEN'
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuthenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user context
    next();
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role || 'user';
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.logSecurityEvent({
        eventType: 'authorization_failure',
        userId: req.user.userId,
        severity: 'medium',
        description: 'User attempted to access resource without required role',
        metadata: {
          requiredRoles: allowedRoles,
          userRole,
          endpoint: req.originalUrl
        }
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Get token expiration time
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateTokens,
  refreshAccessToken,
  extractToken,
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  getTokenExpiration,
  isTokenExpired,
  JWT_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE
};