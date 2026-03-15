/**
 * SznPay Backend Server
 * Main entry point for the application
 */

const mongoose = require('mongoose');
const app = require('./app');
const redisService = require('./services/redisService');
const postgresService = require('./services/postgresService');
const webhookProcessorService = require('./services/webhookProcessorService');

const PORT = process.env.PORT || 3001;

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  connectDB();

  redisService.connect().catch((err) => {
    console.error('Redis connection error:', err.message || err);
  });

  postgresService.testConnection().catch((err) => {
    console.error('Postgres connection error:', err.message || err);
  });

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ========================================');
    console.log(`🚀 SznPay Server Running`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 API: http://localhost:${PORT}`);
    console.log('🚀 ========================================');
    console.log('');
  });

  try { webhookProcessorService.start() } catch (e) {}

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
}

module.exports = app;
