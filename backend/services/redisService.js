/**
 * Redis Service
 * Handles caching, session management, and rate limiting storage
 */

const redis = require('redis');
const { promisify } = require('util');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      // Redis connection options
      const options = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      };

      this.client = redis.createClient(options);

      // Promisify Redis commands
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.ttlAsync = promisify(this.client.ttl).bind(this.client);
      this.keysAsync = promisify(this.client.keys).bind(this.client);
      this.incrAsync = promisify(this.client.incr).bind(this.client);
      this.decrAsync = promisify(this.client.decr).bind(this.client);
      this.hsetAsync = promisify(this.client.hset).bind(this.client);
      this.hgetAsync = promisify(this.client.hget).bind(this.client);
      this.hgetallAsync = promisify(this.client.hgetall).bind(this.client);
      this.hdelAsync = promisify(this.client.hdel).bind(this.client);

      // Handle connection events
      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔴 Redis connection closed');
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected && this.client;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (!this.isReady()) return null;
      const value = await this.getAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional expiry (in seconds)
   */
  async set(key, value, expirySeconds = null) {
    try {
      if (!this.isReady()) return false;
      const serialized = JSON.stringify(value);
      
      if (expirySeconds) {
        await this.setAsync(key, serialized, 'EX', expirySeconds);
      } else {
        await this.setAsync(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async setNX(key, value, expirySeconds = null) {
    try {
      if (!this.isReady()) return false;
      const serialized = JSON.stringify(value);
      if (expirySeconds) {
        const res = await this.setAsync(key, serialized, 'EX', expirySeconds, 'NX');
        return res === 'OK';
      } else {
        const res = await this.setAsync(key, serialized, 'NX');
        return res === 'OK';
      }
    } catch (error) {
      console.error('Redis SETNX error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    try {
      if (!this.isReady()) return false;
      await this.delAsync(key);
      return true;
    } catch (error) {
      console.error('Redis DELETE error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isReady()) return false;
      const result = await this.existsAsync(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Set expiry on key (in seconds)
   */
  async expire(key, seconds) {
    try {
      if (!this.isReady()) return false;
      await this.expireAsync(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Get time to live for key
   */
  async ttl(key) {
    try {
      if (!this.isReady()) return -1;
      return await this.ttlAsync(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  }

  /**
   * Increment value
   */
  async increment(key) {
    try {
      if (!this.isReady()) return null;
      return await this.incrAsync(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  }

  /**
   * Decrement value
   */
  async decrement(key) {
    try {
      if (!this.isReady()) return null;
      return await this.decrAsync(key);
    } catch (error) {
      console.error('Redis DECR error:', error);
      return null;
    }
  }

  /**
   * Store user session
   */
  async setSession(userId, sessionData, expirySeconds = 3600) {
    const key = `session:${userId}`;
    return await this.set(key, sessionData, expirySeconds);
  }

  /**
   * Get user session
   */
  async getSession(userId) {
    const key = `session:${userId}`;
    return await this.get(key);
  }

  /**
   * Delete user session
   */
  async deleteSession(userId) {
    const key = `session:${userId}`;
    return await this.delete(key);
  }

  /**
   * Store OTP
   */
  async setOTP(userId, otp, expirySeconds = 600) {
    const key = `otp:${userId}`;
    return await this.set(key, { otp, createdAt: Date.now() }, expirySeconds);
  }

  /**
   * Get and verify OTP
   */
  async getOTP(userId) {
    const key = `otp:${userId}`;
    return await this.get(key);
  }

  /**
   * Delete OTP after use
   */
  async deleteOTP(userId) {
    const key = `otp:${userId}`;
    return await this.delete(key);
  }

  /**
   * Cache API response
   */
  async cacheAPIResponse(endpoint, params, data, expirySeconds = 300) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.set(key, data, expirySeconds);
  }

  /**
   * Get cached API response
   */
  async getCachedAPIResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.get(key);
  }

  /**
   * Track failed login attempts
   */
  async trackLoginAttempt(identifier) {
    const key = `login_attempts:${identifier}`;
    const attempts = await this.increment(key);
    
    if (attempts === 1) {
      // Set expiry on first attempt (15 minutes)
      await this.expire(key, 900);
    }
    
    return attempts;
  }

  /**
   * Get failed login attempts
   */
  async getLoginAttempts(identifier) {
    const key = `login_attempts:${identifier}`;
    const value = await this.getAsync(key);
    return value ? parseInt(value) : 0;
  }

  /**
   * Clear login attempts
   */
  async clearLoginAttempts(identifier) {
    const key = `login_attempts:${identifier}`;
    return await this.delete(key);
  }

  /**
   * Store transaction in queue for processing
   */
  async queueTransaction(transactionId, transactionData) {
    const key = `transaction_queue:${transactionId}`;
    return await this.set(key, transactionData, 3600); // 1 hour expiry
  }

  /**
   * Get queued transaction
   */
  async getQueuedTransaction(transactionId) {
    const key = `transaction_queue:${transactionId}`;
    return await this.get(key);
  }

  /**
   * Remove transaction from queue
   */
  async dequeueTransaction(transactionId) {
    const key = `transaction_queue:${transactionId}`;
    return await this.delete(key);
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId, profileData, expirySeconds = 1800) {
    const key = `user_profile:${userId}`;
    return await this.set(key, profileData, expirySeconds);
  }

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId) {
    const key = `user_profile:${userId}`;
    return await this.get(key);
  }

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(userId) {
    const key = `user_profile:${userId}`;
    return await this.delete(key);
  }

  /**
   * Store rate limit data
   */
  async trackRateLimit(identifier, limit, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const current = await this.increment(key);
    
    if (current === 1) {
      await this.expire(key, windowSeconds);
    }
    
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      exceeded: current > limit
    };
  }

  /**
   * Get all keys matching pattern
   */
  async getKeys(pattern) {
    try {
      if (!this.isReady()) return [];
      return await this.keysAsync(pattern);
    } catch (error) {
      console.error('Redis KEYS error:', error);
      return [];
    }
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll() {
    try {
      if (!this.isReady()) return false;
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    try {
      if (!this.isReady()) {
        return {
          connected: false,
          message: 'Redis not connected'
        };
      }

      const info = await promisify(this.client.info).bind(this.client)();
      return {
        connected: true,
        info: info
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;
