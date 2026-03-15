/**
 * Monitoring Service Unit Tests
 */

describe('MonitoringService', () => {
  let monitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    monitoringService = require('../../services/monitoringService');
    // Reset metrics for each test
    monitoringService.resetMetrics();
  });

  describe('trackRequest', () => {
    it('should track request with response time', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(200);
      monitoringService.trackRequest(150);

      const metrics = monitoringService.getApplicationMetrics();
      expect(metrics.requests.total).toBe(3);
    });

    it('should calculate average response time', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(200);
      monitoringService.trackRequest(300);

      const avg = monitoringService.getAverageResponseTime();
      expect(avg).toBe(200);
    });

    it('should handle single request', () => {
      monitoringService.trackRequest(150);

      const avg = monitoringService.getAverageResponseTime();
      expect(avg).toBe(150);
    });
  });

  describe('trackError', () => {
    it('should increment error count', () => {
      monitoringService.trackError();
      monitoringService.trackError();

      const metrics = monitoringService.getApplicationMetrics();
      expect(metrics.requests.errors).toBe(2);
    });
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', () => {
      const uptime = monitoringService.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });
  });

  describe('get95thPercentileResponseTime', () => {
    it('should calculate 95th percentile', () => {
      // Add 100 requests with response times 1-100ms
      for (let i = 1; i <= 100; i++) {
        monitoringService.trackRequest(i);
      }

      const p95 = monitoringService.get95thPercentileResponseTime();
      expect(p95).toBe(95);
    });

    it('should return 0 for no requests', () => {
      const p95 = monitoringService.get95thPercentileResponseTime();
      expect(p95).toBe(0);
    });
  });

  describe('getApplicationMetrics', () => {
    it('should return application metrics', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(200);
      monitoringService.trackError();

      const metrics = monitoringService.getApplicationMetrics();

      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics.requests.total).toBe(2);
      expect(metrics.requests.errors).toBe(1);
    });

    it('should calculate success rate correctly', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(100);
      monitoringService.trackError();

      const metrics = monitoringService.getApplicationMetrics();
      expect(metrics.requests.successRate).toBe('75.00%');
    });

    it('should handle 100% success rate', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(100);

      const metrics = monitoringService.getApplicationMetrics();
      expect(metrics.requests.successRate).toBe('100.00%');
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics', () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics).toHaveProperty('hostname');
      expect(metrics).toHaveProperty('platform');
      expect(metrics).toHaveProperty('architecture');
      expect(metrics).toHaveProperty('nodeVersion');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
    });

    it('should include memory information', () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('usagePercent');
      expect(metrics.memory).toHaveProperty('process');
    });

    it('should include CPU information', () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.cpu).toHaveProperty('count');
      expect(metrics.cpu).toHaveProperty('model');
      expect(metrics.cpu).toHaveProperty('speed');
      expect(metrics.cpu).toHaveProperty('loadAverage');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to human readable', () => {
      expect(monitoringService.formatBytes(0)).toBe('0 Bytes');
      expect(monitoringService.formatBytes(1024)).toBe('1 KB');
      expect(monitoringService.formatBytes(1048576)).toBe('1 MB');
      expect(monitoringService.formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      const result = monitoringService.formatBytes(1536);
      expect(result).toBe('1.5 KB');
    });
  });

  describe('formatUptime', () => {
    it('should format uptime correctly', () => {
      expect(monitoringService.formatUptime(0)).toBe('0s');
      expect(monitoringService.formatUptime(60)).toBe('1m');
      expect(monitoringService.formatUptime(3600)).toBe('1h');
      expect(monitoringService.formatUptime(86400)).toBe('1d');
    });

    it('should handle complex uptime', () => {
      const uptime = 90061; // 1 day, 1 hour, 1 minute, 1 second
      const result = monitoringService.formatUptime(uptime);
      expect(result).toBe('1d 1h 1m 1s');
    });
  });

  describe('checkResourceLimits', () => {
    it('should check resource limits', () => {
      const result = monitoringService.checkResourceLimits();

      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should warn on high error rate', () => {
      // Create high error rate
      for (let i = 0; i < 100; i++) {
        monitoringService.trackRequest(100);
      }
      for (let i = 0; i < 15; i++) {
        monitoringService.trackError();
      }

      const result = monitoringService.checkResourceLimits();
      const errorWarning = result.warnings.find(w => w.type === 'errors');

      expect(errorWarning).toBeDefined();
      expect(errorWarning.severity).toBe('critical');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in standard format', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackError();

      const metrics = monitoringService.getMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('requests_total');
      expect(metrics).toHaveProperty('requests_errors_total');
      expect(metrics).toHaveProperty('response_time_avg_ms');
      expect(metrics).toHaveProperty('response_time_p95_ms');
      expect(metrics).toHaveProperty('uptime_seconds');
      expect(metrics).toHaveProperty('memory_usage_bytes');
      expect(metrics).toHaveProperty('memory_usage_percent');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      monitoringService.trackRequest(100);
      monitoringService.trackRequest(200);
      monitoringService.trackError();

      monitoringService.resetMetrics();

      const metrics = monitoringService.getApplicationMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.errors).toBe(0);
    });
  });

  describe('getQuickHealthCheck', () => {
    it('should return quick health status', async () => {
      const health = await monitoringService.getQuickHealthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('database');
    });
  });
});
