/**
 * Offline Service
 * Handles offline-first functionality for conversational banking
 * Caches transactions locally and syncs when connectivity returns
 */

const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class OfflineService {
  constructor() {
    this.offlineQueuePath = path.join(__dirname, '../data/offline-queue.json');
    this.offlineDataPath = path.join(__dirname, '../data/offline-data.json');
    this.syncStatus = 'online'; // 'online', 'offline', 'syncing'
    this.maxQueueSize = 100; // Maximum offline transactions to queue
    this.syncInterval = 30000; // 30 seconds sync check
    this.lastSyncTime = Date.now();

    // Initialize offline storage
    this.initializeOfflineStorage();

    // Start connectivity monitoring
    this.startConnectivityMonitoring();
  }

  /**
   * Initialize offline storage files
   */
  async initializeOfflineStorage() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.offlineQueuePath);
      await fs.mkdir(dataDir, { recursive: true });

      // Initialize queue file if it doesn't exist
      try {
        await fs.access(this.offlineQueuePath);
      } catch {
        await fs.writeFile(this.offlineQueuePath, JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          queue: []
        }, null, 2));
      }

      // Initialize offline data file
      try {
        await fs.access(this.offlineDataPath);
      } catch {
        await fs.writeFile(this.offlineDataPath, JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          cachedBalances: {},
          cachedHistory: {},
          cachedInsights: {},
          userPreferences: {}
        }, null, 2));
      }

      logger.info('Offline storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize offline storage:', error);
    }
  }

  /**
   * Monitor network connectivity
   */
  startConnectivityMonitoring() {
    // Check connectivity every 30 seconds
    setInterval(async () => {
      const isOnline = await this.checkConnectivity();
      const previousStatus = this.syncStatus;

      if (isOnline && previousStatus !== 'online') {
        this.syncStatus = 'syncing';
        logger.info('Connectivity restored, starting sync...');
        await this.syncOfflineQueue();
        this.syncStatus = 'online';
      } else if (!isOnline && previousStatus === 'online') {
        this.syncStatus = 'offline';
        logger.info('Lost connectivity, switching to offline mode');
      }
    }, this.syncInterval);
  }

  /**
   * Check network connectivity by attempting a simple HTTP request
   */
  async checkConnectivity() {
    try {
      const https = require('https');
      return new Promise((resolve) => {
        const req = https.request({
          hostname: 'www.google.com',
          port: 443,
          path: '/favicon.ico',
          method: 'HEAD',
          timeout: 5000
        }, (res) => {
          resolve(true);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
    } catch (error) {
      logger.error('Connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    return {
      status: this.syncStatus,
      lastSyncTime: this.lastSyncTime,
      queueSize: 0 // Will be populated when queue is loaded
    };
  }

  /**
   * Queue transaction for offline processing
   */
  async queueOfflineTransaction(userId, intent, entities, originalMessage, sessionId) {
    try {
      const queueData = await this.loadOfflineQueue();
      const transactionId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const offlineTransaction = {
        id: transactionId,
        userId,
        intent,
        entities,
        originalMessage,
        sessionId,
        timestamp: new Date().toISOString(),
        status: 'queued',
        retryCount: 0,
        maxRetries: 3
      };

      // Check queue size limit
      if (queueData.queue.length >= this.maxQueueSize) {
        // Remove oldest completed transactions
        queueData.queue = queueData.queue.filter(tx => tx.status !== 'completed');
        if (queueData.queue.length >= this.maxQueueSize) {
          throw new Error('Offline queue is full. Please sync when online.');
        }
      }

      queueData.queue.push(offlineTransaction);
      queueData.lastUpdated = new Date().toISOString();

      await this.saveOfflineQueue(queueData);

      logger.info(`Queued offline transaction ${transactionId} for user ${userId}`);

      return {
        success: true,
        transactionId,
        message: 'Transaction queued for offline processing. It will be processed when you\'re back online.',
        queuePosition: queueData.queue.length
      };

    } catch (error) {
      logger.error('Failed to queue offline transaction:', error);
      throw error;
    }
  }

  /**
   * Process offline transaction when online
   */
  async processOfflineTransaction(transaction) {
    try {
      // Import required services dynamically to avoid circular dependencies
      const validationService = require('../services/validationService');
      const transactionEngine = require('../services/transactionEngine');
      const billPaymentService = require('../services/billPaymentService');

      transaction.status = 'processing';
      transaction.retryCount++;

      let result;

      // Process based on intent
      switch (transaction.intent) {
        case 'TRANSFER':
          const transferValidation = await validationService.validateTransfer({
            userId: transaction.userId,
            amount: transaction.entities.amount,
            recipientAccount: transaction.entities.recipientAccount,
            recipientName: transaction.entities.recipientName,
            description: transaction.entities.description
          });

          if (transferValidation.isValid) {
            result = await transactionEngine.processTransfer({
              userId: transaction.userId,
              amount: transaction.entities.amount,
              currency: transaction.entities.currency || 'NGN',
              recipientAccount: transaction.entities.recipientAccount,
              recipientName: transaction.entities.recipientName,
              sourceAccount: transaction.entities.sourceAccount,
              description: transaction.entities.description,
              metadata: {
                offline: true,
                originalMessage: transaction.originalMessage,
                processedAt: new Date().toISOString()
              }
            });
          } else {
            throw new Error(transferValidation.error);
          }
          break;

        case 'BILL_PAYMENT':
          const billValidation = await validationService.validateBillPayment({
            userId: transaction.userId,
            billType: transaction.entities.billType,
            amount: transaction.entities.amount,
            provider: transaction.entities.provider,
            accountNumber: transaction.entities.accountNumber
          });

          if (billValidation.isValid) {
            result = await billPaymentService.processBillPayment({
              userId: transaction.userId,
              billType: transaction.entities.billType,
              provider: transaction.entities.provider,
              amount: transaction.entities.amount,
              accountNumber: transaction.entities.accountNumber,
              metadata: {
                offline: true,
                originalMessage: transaction.originalMessage,
                processedAt: new Date().toISOString()
              }
            });
          } else {
            throw new Error(billValidation.error);
          }
          break;

        case 'AIRTIME_PURCHASE':
          const airtimeValidation = await validationService.validateAirtimePurchase({
            userId: transaction.userId,
            amount: transaction.entities.amount,
            phoneNumber: transaction.entities.phoneNumber,
            network: transaction.entities.network
          });

          if (airtimeValidation.isValid) {
            result = await billPaymentService.purchaseAirtime({
              userId: transaction.userId,
              amount: transaction.entities.amount,
              phoneNumber: transaction.entities.phoneNumber,
              network: transaction.entities.network,
              metadata: {
                offline: true,
                originalMessage: transaction.originalMessage,
                processedAt: new Date().toISOString()
              }
            });
          } else {
            throw new Error(airtimeValidation.error);
          }
          break;

        default:
          throw new Error(`Unsupported offline intent: ${transaction.intent}`);
      }

      transaction.status = 'completed';
      transaction.result = result;
      transaction.completedAt = new Date().toISOString();

      logger.info(`Successfully processed offline transaction ${transaction.id}`);

      return result;

    } catch (error) {
      logger.error(`Failed to process offline transaction ${transaction.id}:`, error);

      transaction.status = 'failed';
      transaction.error = error.message;
      transaction.failedAt = new Date().toISOString();

      // Check if we should retry
      if (transaction.retryCount < transaction.maxRetries) {
        transaction.status = 'retry';
        logger.info(`Will retry offline transaction ${transaction.id} (attempt ${transaction.retryCount + 1})`);
      }

      throw error;
    }
  }

  /**
   * Sync offline queue when connectivity is restored
   */
  async syncOfflineQueue() {
    try {
      const queueData = await this.loadOfflineQueue();
      const pendingTransactions = queueData.queue.filter(tx =>
        tx.status === 'queued' || tx.status === 'retry'
      );

      if (pendingTransactions.length === 0) {
        logger.info('No pending offline transactions to sync');
        return { synced: 0, failed: 0 };
      }

      logger.info(`Syncing ${pendingTransactions.length} offline transactions`);

      let synced = 0;
      let failed = 0;

      for (const transaction of pendingTransactions) {
        try {
          await this.processOfflineTransaction(transaction);
          synced++;
        } catch (error) {
          failed++;
          logger.error(`Failed to sync transaction ${transaction.id}:`, error);
        }
      }

      // Save updated queue
      queueData.lastUpdated = new Date().toISOString();
      await this.saveOfflineQueue(queueData);

      this.lastSyncTime = Date.now();

      logger.info(`Offline sync completed: ${synced} synced, ${failed} failed`);

      return { synced, failed };

    } catch (error) {
      logger.error('Offline sync failed:', error);
      throw error;
    }
  }

  /**
   * Cache balance data for offline access
   */
  async cacheBalanceData(userId, balanceData) {
    try {
      const offlineData = await this.loadOfflineData();
      offlineData.cachedBalances[userId] = {
        data: balanceData,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      offlineData.lastUpdated = new Date().toISOString();

      await this.saveOfflineData(offlineData);
      logger.info(`Cached balance data for user ${userId}`);
    } catch (error) {
      logger.error('Failed to cache balance data:', error);
    }
  }

  /**
   * Get cached balance data
   */
  async getCachedBalanceData(userId) {
    try {
      const offlineData = await this.loadOfflineData();
      const cached = offlineData.cachedBalances[userId];

      if (!cached) return null;

      // Check if cache is expired
      if (new Date() > new Date(cached.expiresAt)) {
        delete offlineData.cachedBalances[userId];
        await this.saveOfflineData(offlineData);
        return null;
      }

      return cached.data;
    } catch (error) {
      logger.error('Failed to get cached balance data:', error);
      return null;
    }
  }

  /**
   * Cache transaction history for offline access
   */
  async cacheTransactionHistory(userId, historyData) {
    try {
      const offlineData = await this.loadOfflineData();
      offlineData.cachedHistory[userId] = {
        data: historyData,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
      };
      offlineData.lastUpdated = new Date().toISOString();

      await this.saveOfflineData(offlineData);
      logger.info(`Cached transaction history for user ${userId}`);
    } catch (error) {
      logger.error('Failed to cache transaction history:', error);
    }
  }

  /**
   * Get cached transaction history
   */
  async getCachedTransactionHistory(userId) {
    try {
      const offlineData = await this.loadOfflineData();
      const cached = offlineData.cachedHistory[userId];

      if (!cached) return null;

      // Check if cache is expired
      if (new Date() > new Date(cached.expiresAt)) {
        delete offlineData.cachedHistory[userId];
        await this.saveOfflineData(offlineData);
        return null;
      }

      return cached.data;
    } catch (error) {
      logger.error('Failed to get cached transaction history:', error);
      return null;
    }
  }

  /**
   * Load offline queue from file
   */
  async loadOfflineQueue() {
    try {
      const data = await fs.readFile(this.offlineQueuePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load offline queue:', error);
      return { version: '1.0', lastUpdated: new Date().toISOString(), queue: [] };
    }
  }

  /**
   * Save offline queue to file
   */
  async saveOfflineQueue(queueData) {
    try {
      await fs.writeFile(this.offlineQueuePath, JSON.stringify(queueData, null, 2));
    } catch (error) {
      logger.error('Failed to save offline queue:', error);
      throw error;
    }
  }

  /**
   * Load offline data from file
   */
  async loadOfflineData() {
    try {
      const data = await fs.readFile(this.offlineDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to load offline data:', error);
      return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        cachedBalances: {},
        cachedHistory: {},
        cachedInsights: {},
        userPreferences: {}
      };
    }
  }

  /**
   * Save offline data to file
   */
  async saveOfflineData(offlineData) {
    try {
      await fs.writeFile(this.offlineDataPath, JSON.stringify(offlineData, null, 2));
    } catch (error) {
      logger.error('Failed to save offline data:', error);
      throw error;
    }
  }

  /**
   * Clear old cached data
   */
  async cleanupExpiredCache() {
    try {
      const offlineData = await this.loadOfflineData();
      const now = new Date();

      // Clean expired balances
      Object.keys(offlineData.cachedBalances).forEach(userId => {
        const cached = offlineData.cachedBalances[userId];
        if (new Date(cached.expiresAt) < now) {
          delete offlineData.cachedBalances[userId];
        }
      });

      // Clean expired history
      Object.keys(offlineData.cachedHistory).forEach(userId => {
        const cached = offlineData.cachedHistory[userId];
        if (new Date(cached.expiresAt) < now) {
          delete offlineData.cachedHistory[userId];
        }
      });

      // Clean expired insights
      Object.keys(offlineData.cachedInsights).forEach(userId => {
        const cached = offlineData.cachedInsights[userId];
        if (new Date(cached.expiresAt) < now) {
          delete offlineData.cachedInsights[userId];
        }
      });

      offlineData.lastUpdated = new Date().toISOString();
      await this.saveOfflineData(offlineData);

      logger.info('Expired cache cleanup completed');
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Get offline capabilities status
   */
  getOfflineCapabilities() {
    return {
      offlineTransactions: true,
      cachedBalances: true,
      cachedHistory: true,
      cachedInsights: true,
      maxQueueSize: this.maxQueueSize,
      supportedIntents: ['TRANSFER', 'BILL_PAYMENT', 'AIRTIME_PURCHASE'],
      dataRetentionHours: 24
    };
  }
}

module.exports = new OfflineService();
