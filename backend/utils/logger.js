const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/app.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),

  // Separate file for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),

  // Security events log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/security.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format((info) => {
        if (info.securityEvent) {
          return info;
        }
        return false;
      })()
    )
  }),

  // AI/ML events log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/ai.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format((info) => {
        if (info.aiEvent) {
          return info;
        }
        return false;
      })()
    )
  }),

  // Transaction events log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/transactions.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format((info) => {
        if (info.transactionEvent) {
          return info;
        }
        return false;
      })()
    )
  }),

  // Performance monitoring log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/performance.log'),
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format((info) => {
        if (info.performanceEvent) {
          return info;
        }
        return false;
      })()
    )
  })
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export logger methods for easy access
module.exports = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  http: (message, meta = {}) => logger.http(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  // Specialized logging methods
  logSecurityEvent: (event) => {
    logger.info('Security Event', {
      securityEvent: true,
      ...event,
      timestamp: new Date().toISOString()
    });
  },

  logAIEvent: (event) => {
    logger.info('AI Event', {
      aiEvent: true,
      ...event,
      timestamp: new Date().toISOString()
    });
  },

  logTransactionEvent: (event) => {
    logger.info('Transaction Event', {
      transactionEvent: true,
      ...event,
      timestamp: new Date().toISOString()
    });
  },

  logPerformanceEvent: (event) => {
    logger.info('Performance Event', {
      performanceEvent: true,
      ...event,
      timestamp: new Date().toISOString()
    });
  },

  // Request logging middleware
  requestLogger: (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId
      });
    });

    next();
  },

  // Error logging
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    });
  }
};