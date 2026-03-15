/**
 * Monitoring Service
 * Comprehensive health checks and system metrics
 */

const os = require('os');
const mongoose = require('mongoose');

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.maxResponseTimeTracking = 1000; // Keep last 1000 response times
    this.webhookCounts = { paystack: 0, flutterwave: 0 };
  }

  /**
   * Track request metrics
   */
  trackRequest(responseTime) {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    // Keep only last N response times
    if (this.responseTimes.length > this.maxResponseTimeTracking) {
      this.responseTimes.shift();
    }
  }

  /**
   * Track error
   */
  trackError() {
    this.errorCount++;
  }

  trackWebhook(provider) {
    const p = provider === 'flutterwave' ? 'flutterwave' : 'paystack';
    this.webhookCounts[p] = (this.webhookCounts[p] || 0) + 1;
  }

  /**
   * Get uptime in seconds
   */
  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get average response time
   */
  getAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  /**
   * Get 95th percentile response time
   */
  get95thPercentileResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    let index = Math.floor(sorted.length * 0.95) - 1;
    if (index < 0) index = 0;
    if (index >= sorted.length) index = sorted.length - 1;
    return sorted[index] || 0;
  }

  /**
   * Check MongoDB health
   */
  async checkMongoDB() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (state === 1) {
        // Test actual query
        await mongoose.connection.db.admin().ping();
        
        return {
          status: 'healthy',
          state: states[state],
          host: mongoose.connection.host,
          database: mongoose.connection.name,
          connected: true
        };
      } else {
        return {
          status: 'unhealthy',
          state: states[state],
          connected: false,
          error: 'Database not connected'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis() {
    try {
      const redisService = require('./redisService');
      
      if (!redisService.isReady()) {
        return {
          status: 'unavailable',
          connected: false,
          message: 'Redis not configured or not connected'
        };
      }

      // Test Redis connection
      await redisService.set('health_check', 'ok', 10);
      const result = await redisService.get('health_check');
      
      if (result === 'ok') {
        return {
          status: 'healthy',
          connected: true,
          message: 'Redis responding normally'
        };
      } else {
        return {
          status: 'degraded',
          connected: true,
          message: 'Redis connected but not responding correctly'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check Email service health
   */
  async checkEmailService() {
    try {
      const emailService = require('./emailService');
      
      return {
        status: emailService.isConfigured ? 'healthy' : 'unavailable',
        configured: emailService.isConfigured,
        message: emailService.isConfigured 
          ? 'Email service configured' 
          : 'Email service not configured - running in development mode'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check SMS service health
   */
  async checkSMSService() {
    try {
      const smsService = require('./smsService');
      const status = smsService.getStatus();
      
      return {
        status: status.configured ? 'healthy' : 'unavailable',
        ...status,
        message: status.configured 
          ? `SMS service configured (${status.primaryProvider})` 
          : 'SMS service not configured - running in development mode'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
        application: this.getUptime()
      },
      memory: {
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        used: this.formatBytes(usedMem),
        usagePercent: memUsagePercent,
        process: {
          heapTotal: this.formatBytes(process.memoryUsage().heapTotal),
          heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
          external: this.formatBytes(process.memoryUsage().external),
          rss: this.formatBytes(process.memoryUsage().rss)
        }
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        }
      }
    };
  }

  /**
   * Get application metrics
   */
  getApplicationMetrics() {
    return {
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        successRate: this.requestCount > 0 
          ? (((this.requestCount - this.errorCount) / this.requestCount) * 100).toFixed(2) + '%'
          : '100%'
      },
      performance: {
        averageResponseTime: this.getAverageResponseTime() + 'ms',
        p95ResponseTime: this.get95thPercentileResponseTime() + 'ms',
        sampledRequests: this.responseTimes.length
      },
      uptime: {
        seconds: this.getUptime(),
        formatted: this.formatUptime(this.getUptime())
      }
    };
  }

  /**
   * Comprehensive health check
   */
  async getHealthCheck() {
    const [mongodb, redis, email, sms] = await Promise.all([
      this.checkMongoDB(),
      this.checkRedis(),
      this.checkEmailService(),
      this.checkSMSService()
    ]);

    const systemMetrics = this.getSystemMetrics();
    const appMetrics = this.getApplicationMetrics();

    // Determine overall health
    const criticalServices = [mongodb];
    const isHealthy = criticalServices.every(service => service.status === 'healthy');
    const hasDegradedServices = [mongodb, redis, email, sms].some(
      service => service.status === 'degraded' || service.status === 'unavailable'
    );

    let overallStatus = 'healthy';
    if (!isHealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegradedServices) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb,
        redis,
        email,
        sms
      },
      system: systemMetrics,
      application: appMetrics
    };
  }

  /**
   * Quick health check (lightweight)
   */
  async getQuickHealthCheck() {
    const mongodb = await this.checkMongoDB();
    
    return {
      status: mongodb.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      database: mongodb.status
    };
  }

  /**
   * Get metrics for monitoring dashboards
   */
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      requests_total: this.requestCount,
      requests_errors_total: this.errorCount,
      response_time_avg_ms: this.getAverageResponseTime(),
      response_time_p95_ms: this.get95thPercentileResponseTime(),
      uptime_seconds: this.getUptime(),
      memory_usage_bytes: process.memoryUsage().heapUsed,
      memory_usage_percent: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2),
      webhooks_ingested: this.webhookCounts
    };
  }

  async getPrometheusMetrics() {
    const providerHealth = require('./providerHealthService');
    const status = await providerHealth.status();
    const lines = [];
    lines.push('# TYPE sznpay_requests_total counter');
    lines.push(`sznpay_requests_total ${this.requestCount}`);
    lines.push('# TYPE sznpay_requests_errors_total counter');
    lines.push(`sznpay_requests_errors_total ${this.errorCount}`);
    lines.push('# TYPE sznpay_response_time_avg_ms gauge');
    lines.push(`sznpay_response_time_avg_ms ${this.getAverageResponseTime()}`);
    lines.push('# TYPE sznpay_response_time_p95_ms gauge');
    lines.push(`sznpay_response_time_p95_ms ${this.get95thPercentileResponseTime()}`);
    lines.push('# TYPE sznpay_uptime_seconds counter');
    lines.push(`sznpay_uptime_seconds ${this.getUptime()}`);
    lines.push('# TYPE sznpay_webhooks_ingested_total counter');
    lines.push(`sznpay_webhooks_ingested_total{provider="paystack"} ${this.webhookCounts.paystack || 0}`);
    lines.push(`sznpay_webhooks_ingested_total{provider="flutterwave"} ${this.webhookCounts.flutterwave || 0}`);
    lines.push('# TYPE sznpay_provider_successes_total counter');
    lines.push(`sznpay_provider_successes_total{provider="paystack"} ${status.counts.paystack.successes}`);
    lines.push(`sznpay_provider_successes_total{provider="flutterwave"} ${status.counts.flutterwave.successes}`);
    lines.push('# TYPE sznpay_provider_failures_total counter');
    lines.push(`sznpay_provider_failures_total{provider="paystack"} ${status.counts.paystack.failures}`);
    lines.push(`sznpay_provider_failures_total{provider="flutterwave"} ${status.counts.flutterwave.failures}`);
    return lines.join('\n') + '\n';
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Check if system resources are within acceptable limits
   */
  checkResourceLimits() {
    const warnings = [];
    const systemMetrics = this.getSystemMetrics();

    // Check memory usage
    const memUsage = parseFloat(systemMetrics.memory.usagePercent);
    if (memUsage > 90) {
      warnings.push({
        type: 'memory',
        severity: 'critical',
        message: `Memory usage is critically high: ${memUsage}%`
      });
    } else if (memUsage > 80) {
      warnings.push({
        type: 'memory',
        severity: 'warning',
        message: `Memory usage is high: ${memUsage}%`
      });
    }

    // Check CPU load
    const cpuLoad = parseFloat(systemMetrics.cpu.loadAverage['1min']);
    const cpuCount = systemMetrics.cpu.count;
    if (cpuLoad > cpuCount * 0.9) {
      warnings.push({
        type: 'cpu',
        severity: 'warning',
        message: `CPU load is high: ${cpuLoad} (${cpuCount} cores)`
      });
    }

    // Check error rate
    if (this.requestCount >= 100) {
      const errorRate = (this.errorCount / this.requestCount) * 100;
      if (errorRate > 10) {
        warnings.push({
          type: 'errors',
          severity: 'critical',
          message: `Error rate is high: ${errorRate.toFixed(2)}%`
        });
      } else if (errorRate > 5) {
        warnings.push({
          type: 'errors',
          severity: 'warning',
          message: `Error rate is elevated: ${errorRate.toFixed(2)}%`
        });
      }
    }

    return {
      healthy: warnings.filter(w => w.severity === 'critical').length === 0,
      warnings
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  resetMetrics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;
