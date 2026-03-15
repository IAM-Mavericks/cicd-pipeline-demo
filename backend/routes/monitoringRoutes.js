/**
 * Monitoring and Health Check Routes
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');

/**
 * Quick health check endpoint
 * GET /api/monitor/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getQuickHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Comprehensive health check endpoint
 * GET /api/monitor/health/full
 */
router.get('/health/full', async (req, res) => {
  try {
    const health = await monitoringService.getHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Get application metrics
 * GET /api/monitor/metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

router.get('/metrics/prometheus', async (req, res) => {
  try {
    const text = await monitoringService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(text);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

router.get('/metrics/prometheus', async (req, res) => {
  try {
    const text = await monitoringService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get system metrics
 * GET /api/monitor/system
 */
router.get('/system', (req, res) => {
  try {
    const systemMetrics = monitoringService.getSystemMetrics();
    res.json(systemMetrics);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Get application metrics
 * GET /api/monitor/application
 */
router.get('/application', (req, res) => {
  try {
    const appMetrics = monitoringService.getApplicationMetrics();
    res.json(appMetrics);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Check resource limits and warnings
 * GET /api/monitor/warnings
 */
router.get('/warnings', (req, res) => {
  try {
    const resourceCheck = monitoringService.checkResourceLimits();
    res.json(resourceCheck);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * Liveness probe (for Kubernetes/container orchestration)
 * GET /api/monitor/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe (for Kubernetes/container orchestration)
 * GET /api/monitor/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const health = await monitoringService.getQuickHealthCheck();
    if (health.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: health,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
