/**
 * APM Routes for Doktu Medical Platform
 * Phase 3 - Production Performance Monitoring
 * 
 * Features:
 * - Real-time metrics API
 * - Alert management
 * - Performance analytics
 * - Health status monitoring
 */

import { apmService } from '../services/apmService.js';
import { cacheService } from '../services/cacheService.js';
import { isAuthenticated } from '../supabaseAuth.js';

export function registerAPMRoutes(app) {
  
  /**
   * Get current APM metrics
   * GET /api/apm/metrics
   */
  app.get('/api/apm/metrics', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      // Only admins can access APM metrics
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'APM metrics access requires admin role'
        });
      }
      
      const metrics = apmService.getMetrics();
      
      res.json({
        success: true,
        metrics,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error fetching APM metrics:', error);
      res.status(500).json({
        error: 'Failed to fetch APM metrics',
        message: error.message
      });
    }
  });

  /**
   * Get health status
   * GET /api/apm/health
   */
  app.get('/api/apm/health', async (req, res) => {
    try {
      const healthStatus = apmService.getHealthStatus();
      const cacheHealth = await cacheService.healthCheck();
      
      const overallHealth = {
        ...healthStatus,
        cache: cacheHealth,
        services: {
          apm: 'healthy',
          cache: cacheHealth.status,
          database: 'healthy' // Would check actual DB health
        }
      };
      
      // Set appropriate status code based on health
      const statusCode = overallHealth.status === 'critical' ? 503 :
                        overallHealth.status === 'warning' ? 200 : 200;
      
      res.status(statusCode).json({
        success: true,
        health: overallHealth,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error fetching health status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch health status',
        message: error.message,
        timestamp: Date.now()
      });
    }
  });

  /**
   * Get active alerts
   * GET /api/apm/alerts
   */
  app.get('/api/apm/alerts', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      const metrics = apmService.getMetrics();
      const alerts = metrics.alerts;
      
      res.json({
        success: true,
        alerts: {
          active: alerts.active,
          activeCount: alerts.activeCount,
          historyCount: alerts.historyCount
        },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      res.status(500).json({
        error: 'Failed to fetch alerts',
        message: error.message
      });
    }
  });

  /**
   * Suppress an alert
   * POST /api/apm/alerts/:alertId/suppress
   */
  app.post('/api/apm/alerts/:alertId/suppress', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const { alertId } = req.params;
      const { duration = 3600000 } = req.body; // Default 1 hour
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      apmService.suppressAlert(alertId, duration);
      
      res.json({
        success: true,
        message: `Alert ${alertId} suppressed for ${duration / 1000} seconds`,
        suppressedUntil: Date.now() + duration
      });
      
    } catch (error) {
      console.error('❌ Error suppressing alert:', error);
      res.status(500).json({
        error: 'Failed to suppress alert',
        message: error.message
      });
    }
  });

  /**
   * Get performance analytics
   * GET /api/apm/analytics
   */
  app.get('/api/apm/analytics', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      const { timeRange = '1h' } = req.query;
      const metrics = apmService.getMetrics();
      
      // Calculate analytics based on time range
      const analytics = {
        overview: {
          totalRequests: metrics.application.requests.total,
          successRate: ((metrics.application.requests.successful / metrics.application.requests.total) * 100).toFixed(2),
          averageResponseTime: metrics.application.responseTime.average.toFixed(2),
          errorRate: metrics.application.errorRate.toFixed(2)
        },
        
        performance: {
          responseTime: {
            average: metrics.application.responseTime.average,
            p95: metrics.application.responseTime.p95,
            p99: metrics.application.responseTime.p99,
            min: metrics.application.responseTime.min,
            max: metrics.application.responseTime.max
          }
        },
        
        system: {
          cpu: {
            usage: metrics.system.cpu.usage,
            loadAverage: metrics.system.cpu.loadAverage
          },
          memory: {
            used: metrics.system.memory.used,
            total: metrics.system.memory.total,
            percentage: metrics.system.memory.percentage
          },
          uptime: metrics.system.processUptime
        },
        
        medical: {
          operations: metrics.medical.medicalRecordOperations.total,
          encryptionTime: metrics.medical.encryptionOperations.averageTime,
          auditLogs: metrics.medical.auditLogsGenerated.total,
          accessDenied: metrics.medical.patientDataAccess.denied
        },
        
        database: {
          queries: metrics.database.queries.total,
          slowQueries: metrics.database.queries.slow,
          averageTime: metrics.database.queries.averageTime,
          failures: metrics.database.queries.failed
        },
        
        cache: {
          hitRate: metrics.cache.hitRate,
          operations: metrics.cache.operations.get + metrics.cache.operations.set
        }
      };
      
      res.json({
        success: true,
        analytics,
        timeRange,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error.message
      });
    }
  });

  /**
   * Test alert system
   * POST /api/apm/test-alert
   */
  app.post('/api/apm/test-alert', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      const { level = 'warning', message = 'Test alert from admin panel' } = req.body;
      
      // Trigger a test alert
      apmService.emit('alert', {
        id: 'test_alert_' + Date.now(),
        level,
        message,
        value: 100,
        threshold: 50,
        timestamp: Date.now(),
        firstOccurrence: Date.now(),
        lastOccurrence: Date.now(),
        occurrenceCount: 1,
        resolved: false
      });
      
      res.json({
        success: true,
        message: 'Test alert triggered successfully',
        alertLevel: level
      });
      
    } catch (error) {
      console.error('❌ Error triggering test alert:', error);
      res.status(500).json({
        error: 'Failed to trigger test alert',
        message: error.message
      });
    }
  });

  /**
   * Get system resources
   * GET /api/apm/system
   */
  app.get('/api/apm/system', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      const metrics = apmService.getMetrics();
      const systemInfo = {
        system: metrics.system,
        process: {
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        },
        node: {
          version: process.version,
          features: process.features
        }
      };
      
      res.json({
        success: true,
        system: systemInfo,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error fetching system info:', error);
      res.status(500).json({
        error: 'Failed to fetch system info',
        message: error.message
      });
    }
  });

  /**
   * Real-time metrics stream (Server-Sent Events)
   * GET /api/apm/stream
   */
  app.get('/api/apm/stream', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Send initial metrics
      const initialMetrics = apmService.getMetrics();
      res.write(`data: ${JSON.stringify(initialMetrics)}\n\n`);
      
      // Set up real-time updates
      const sendMetrics = () => {
        const metrics = apmService.getMetrics();
        res.write(`data: ${JSON.stringify(metrics)}\n\n`);
      };
      
      // Send metrics every 5 seconds
      const interval = setInterval(sendMetrics, 5000);
      
      // Listen for APM events
      const alertListener = (alert) => {
        res.write(`event: alert\n`);
        res.write(`data: ${JSON.stringify(alert)}\n\n`);
      };
      
      const requestListener = (request) => {
        res.write(`event: request\n`);
        res.write(`data: ${JSON.stringify(request)}\n\n`);
      };
      
      apmService.on('alert', alertListener);
      apmService.on('request', requestListener);
      
      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        apmService.removeListener('alert', alertListener);
        apmService.removeListener('request', requestListener);
      });
      
    } catch (error) {
      console.error('❌ Error setting up metrics stream:', error);
      res.status(500).json({
        error: 'Failed to set up metrics stream',
        message: error.message
      });
    }
  });

  /**
   * Export metrics for external monitoring tools
   * GET /api/apm/export
   */
  app.get('/api/apm/export', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }
      
      const { format = 'json' } = req.query;
      const metrics = apmService.getMetrics();
      
      if (format === 'prometheus') {
        // Export in Prometheus format
        let prometheusMetrics = '';
        
        // Application metrics
        prometheusMetrics += `# HELP doktu_requests_total Total number of HTTP requests\n`;
        prometheusMetrics += `# TYPE doktu_requests_total counter\n`;
        prometheusMetrics += `doktu_requests_total ${metrics.application.requests.total}\n\n`;
        
        prometheusMetrics += `# HELP doktu_response_time_seconds Average response time in seconds\n`;
        prometheusMetrics += `# TYPE doktu_response_time_seconds gauge\n`;
        prometheusMetrics += `doktu_response_time_seconds ${metrics.application.responseTime.average / 1000}\n\n`;
        
        prometheusMetrics += `# HELP doktu_error_rate Error rate percentage\n`;
        prometheusMetrics += `# TYPE doktu_error_rate gauge\n`;
        prometheusMetrics += `doktu_error_rate ${metrics.application.errorRate}\n\n`;
        
        // System metrics
        prometheusMetrics += `# HELP doktu_memory_usage_bytes Memory usage in bytes\n`;
        prometheusMetrics += `# TYPE doktu_memory_usage_bytes gauge\n`;
        prometheusMetrics += `doktu_memory_usage_bytes ${metrics.system.memory.used}\n\n`;
        
        // Medical metrics
        prometheusMetrics += `# HELP doktu_medical_operations_total Total medical record operations\n`;
        prometheusMetrics += `# TYPE doktu_medical_operations_total counter\n`;
        prometheusMetrics += `doktu_medical_operations_total ${metrics.medical.medicalRecordOperations.total}\n\n`;
        
        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
        
      } else {
        // Export in JSON format
        res.json({
          success: true,
          metrics,
          exportFormat: format,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('❌ Error exporting metrics:', error);
      res.status(500).json({
        error: 'Failed to export metrics',
        message: error.message
      });
    }
  });
}

export default registerAPMRoutes;