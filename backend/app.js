/**
 * SznPay Backend App
 * Express app configuration, separated for testability
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const monitoringService = require('./services/monitoringService');
const { authenticateToken } = require('./utils/jwt');
const redisService = require('./services/redisService');
const rateLimiterMiddleware = require('./middleware/rateLimiter');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf } }));
app.use(express.urlencoded({ extended: true }));

const helmetConfig = {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};
app.use(helmet(helmetConfig));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // Block requests without Origin only in production; allow in development
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS - no origin in production'));
    }
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Serve ZKP verification assets (verification keys, WASM files)
app.use('/zkp', express.static('public/zkp'));

// Use Redis rate limiter if configured, otherwise fallback to memory
let authLimiter = rateLimiterMiddleware.authLimiter;

if ((process.env.REDIS_HOST || process.env.NODE_ENV === 'production') && process.env.NODE_ENV !== 'test' && redisService.isReady()) {
  console.log('⚡ Using Redis Rate Limiter');
  authLimiter = rateLimiterMiddleware.createRedisRateLimiter(redisService);
}

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoringService.trackRequest(duration);
    if (res.statusCode >= 500) {
      monitoringService.trackError();
    }
  });
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth')) {
    if (req.path.startsWith('/api/monitor')) return next();
    if (req.path.startsWith('/api/solvency/status')) return next(); // Public transparency
    return authenticateToken(req, res, next);
  }
  next();
});

// ============================================
// ROUTES
// ============================================

const authRoutes = require('./routes/authRoutes');
const conversationalRoutes = require('./routes/conversationalRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const adminRoutes = require('./routes/adminRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const transferRoutes = require('./routes/transferRoutes');
const bankVerificationRoutes = require('./routes/bankVerificationRoutes');
const providerHealthRoutes = require('./routes/providerHealthRoutes');
const ledgerReadRoutes = require('./routes/ledgerReadRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const kycRoutes = require('./routes/kycRoutes');
const solvencyRoutes = require('./routes/solvencyRoutes');
const LedgerReadController = require('./controllers/ledgerReadController');

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/conversational', conversationalRoutes);
app.use('/api/monitor', monitoringRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api', transferRoutes);
app.use('/api', bankVerificationRoutes);
app.use('/api', providerHealthRoutes);
app.use('/api/ledger', ledgerReadRoutes);
app.use('/api', kycRoutes);
app.use('/api', webhookRoutes);
app.use('/api/solvency', solvencyRoutes);

app.get('/api/ledger/accounts', LedgerReadController.getAccountsForCurrentUser);

app.get('/api/bills/billers', (req, res) => {
  res.json({ success: true, data: { electricity: [], cable_tv: [], airtime: [] } });
});

app.get('/', (req, res) => {
  res.json({
    message: 'SznPay API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      bills: '/api/bills',
      conversational: '/api/conversational',
      monitor: '/api/monitor'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Something went wrong!' : err.message || 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
