/**
 * Application Performance Monitoring (APM) Service
 * Phase 3 - Production Excellence
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Automated alerting system
 * - Medical platform specific monitoring
 * - Performance threshold management
 * - Integration with external APM tools
 */

import EventEmitter from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import process from 'process';
import { cacheService } from './cacheService.js';

class APMService extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      // System metrics
      system: {
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        memory: { used: 0, free: 0, total: 0, percentage: 0 },
        uptime: 0,
        processUptime: 0
      },
      
      // Application metrics
      application: {
        requests: { total: 0, successful: 0, failed: 0, rate: 0 },
        responseTime: { average: 0, p95: 0, p99: 0, min: 0, max: 0 },
        activeConnections: 0,
        errorRate: 0
      },
      
      // Medical platform specific metrics
      medical: {
        medicalRecordOperations: { total: 0, rate: 0 },
        encryptionOperations: { total: 0, averageTime: 0 },
        auditLogsGenerated: { total: 0, rate: 0 },
        gdprRequests: { total: 0, pending: 0 },
        patientDataAccess: { total: 0, denied: 0 }
      },
      
      // Database metrics
      database: {
        connections: { active: 0, idle: 0, total: 0 },
        queries: { total: 0, slow: 0, failed: 0, averageTime: 0 },
        transactions: { committed: 0, rolledBack: 0 }
      },
      
      // Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        operations: { get: 0, set: 0, delete: 0 }
      }
    };
    
    // Performance thresholds
    this.thresholds = {
      // Response time thresholds (ms)
      responseTime: {
        warning: 500,
        critical: 1000
      },
      
      // Error rate thresholds (%)
      errorRate: {
        warning: 1,
        critical: 5
      },
      
      // System resource thresholds (%)
      cpu: {
        warning: 70,
        critical: 90
      },
      
      memory: {
        warning: 80,
        critical: 95
      },
      
      // Medical specific thresholds
      medical: {
        encryptionTime: {
          warning: 200,
          critical: 500
        },
        auditFailureRate: {
          warning: 0.1,
          critical: 1
        }
      },
      
      // Database thresholds
      database: {
        queryTime: {
          warning: 100,
          critical: 500
        },
        connectionUsage: {
          warning: 80,
          critical: 95
        }
      }
    };
    
    // Alert state tracking
    this.alerts = {
      active: new Map(),
      history: [],
      suppression: new Map() // For alert suppression
    };
    
    // Data collectors
    this.requestTimes = [];
    this.encryptionTimes = [];
    this.queryTimes = [];
    
    // Monitoring intervals
    this.systemMetricsInterval = null;
    this.alertCheckInterval = null;
    this.metricsCleanupInterval = null;
    
    this.initialize();
  }

  /**
   * Initialize APM service
   */
  initialize() {
    console.log('🔍 Initializing APM Service...');
    
    // Start system metrics collection
    this.startSystemMetricsCollection();
    
    // Start alert checking
    this.startAlertChecking();
    
    // Start metrics cleanup
    this.startMetricsCleanup();
    
    // Set up graceful shutdown
    this.setupGracefulShutdown();
    
    console.log('✅ APM Service initialized');
  }

  /**
   * Start collecting system metrics
   */
  startSystemMetricsCollection() {
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    try {
      // CPU metrics
      const loadAverage = os.loadavg();
      this.metrics.system.cpu.loadAverage = loadAverage;
      
      // Memory metrics
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      
      this.metrics.system.memory = {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: memoryPercentage
      };
      
      // Uptime metrics
      this.metrics.system.uptime = os.uptime();
      this.metrics.system.processUptime = process.uptime();
      
      // Process memory usage
      const processMemory = process.memoryUsage();
      this.metrics.application.processMemory = processMemory;
      
      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage();
      this.metrics.system.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms
      
    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(method, path, statusCode, responseTime) {
    this.metrics.application.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.application.requests.successful++;
    } else {
      this.metrics.application.requests.failed++;
    }
    
    // Track response times
    this.requestTimes.push({
      time: responseTime,
      timestamp: Date.now(),
      path,
      method,
      statusCode
    });
    
    // Calculate response time metrics
    this.updateResponseTimeMetrics();
    
    // Calculate error rate
    this.updateErrorRate();
    
    // Emit performance event
    this.emit('request', {
      method,
      path,
      statusCode,
      responseTime,
      timestamp: Date.now()
    });
  }

  /**
   * Record medical operation metrics
   */
  recordMedicalOperation(operation, operationTime, success = true) {
    this.metrics.medical.medicalRecordOperations.total++;
    
    if (operation === 'encryption' || operation === 'decryption') {
      this.metrics.medical.encryptionOperations.total++;
      this.encryptionTimes.push({
        time: operationTime,
        timestamp: Date.now(),
        operation
      });
      
      // Update average encryption time
      const recentTimes = this.encryptionTimes.slice(-100); // Last 100 operations
      const avgTime = recentTimes.reduce((sum, t) => sum + t.time, 0) / recentTimes.length;
      this.metrics.medical.encryptionOperations.averageTime = avgTime;
    }
    
    if (operation === 'audit_log') {
      this.metrics.medical.auditLogsGenerated.total++;
    }
    
    if (operation === 'patient_data_access') {
      this.metrics.medical.patientDataAccess.total++;
      if (!success) {
        this.metrics.medical.patientDataAccess.denied++;
      }
    }
    
    // Emit medical operation event
    this.emit('medicalOperation', {
      operation,
      operationTime,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(operation, queryTime, success = true) {
    this.metrics.database.queries.total++;
    
    if (!success) {
      this.metrics.database.queries.failed++;
    }
    
    if (queryTime > this.thresholds.database.queryTime.warning) {
      this.metrics.database.queries.slow++;
    }
    
    this.queryTimes.push({
      time: queryTime,
      timestamp: Date.now(),
      operation
    });
    
    // Update average query time
    const recentTimes = this.queryTimes.slice(-100);
    const avgTime = recentTimes.reduce((sum, t) => sum + t.time, 0) / recentTimes.length;
    this.metrics.database.queries.averageTime = avgTime;
    
    // Emit database operation event
    this.emit('databaseOperation', {
      operation,
      queryTime,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics() {
    if (this.requestTimes.length === 0) return;
    
    const recentTimes = this.requestTimes.slice(-1000); // Last 1000 requests
    const times = recentTimes.map(r => r.time).sort((a, b) => a - b);
    
    if (times.length > 0) {
      this.metrics.application.responseTime = {
        average: times.reduce((sum, time) => sum + time, 0) / times.length,
        min: times[0],
        max: times[times.length - 1],
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      };
    }
  }

  /**
   * Update error rate
   */
  updateErrorRate() {
    if (this.metrics.application.requests.total === 0) return;
    
    this.metrics.application.errorRate = 
      (this.metrics.application.requests.failed / this.metrics.application.requests.total) * 100;
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(arr, percentile) {
    const index = Math.ceil((percentile / 100) * arr.length) - 1;
    return arr[index] || 0;
  }

  /**
   * Start alert checking
   */
  startAlertChecking() {
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check for alert conditions
   */
  checkAlerts() {
    const currentTime = Date.now();
    
    // Check response time alerts
    this.checkResponseTimeAlerts(currentTime);
    
    // Check error rate alerts
    this.checkErrorRateAlerts(currentTime);
    
    // Check system resource alerts
    this.checkSystemResourceAlerts(currentTime);
    
    // Check medical operation alerts
    this.checkMedicalOperationAlerts(currentTime);
    
    // Check database alerts
    this.checkDatabaseAlerts(currentTime);
  }

  /**
   * Check response time alerts
   */
  checkResponseTimeAlerts(currentTime) {
    const avgResponseTime = this.metrics.application.responseTime.average;
    const p95ResponseTime = this.metrics.application.responseTime.p95;
    
    if (avgResponseTime > this.thresholds.responseTime.critical) {
      this.triggerAlert('response_time_critical', {
        level: 'critical',
        message: `Average response time is ${avgResponseTime.toFixed(2)}ms (critical threshold: ${this.thresholds.responseTime.critical}ms)`,
        value: avgResponseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: currentTime
      });
    } else if (avgResponseTime > this.thresholds.responseTime.warning) {
      this.triggerAlert('response_time_warning', {
        level: 'warning',
        message: `Average response time is ${avgResponseTime.toFixed(2)}ms (warning threshold: ${this.thresholds.responseTime.warning}ms)`,
        value: avgResponseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('response_time_critical');
      this.resolveAlert('response_time_warning');
    }
  }

  /**
   * Check error rate alerts
   */
  checkErrorRateAlerts(currentTime) {
    const errorRate = this.metrics.application.errorRate;
    
    if (errorRate > this.thresholds.errorRate.critical) {
      this.triggerAlert('error_rate_critical', {
        level: 'critical',
        message: `Error rate is ${errorRate.toFixed(2)}% (critical threshold: ${this.thresholds.errorRate.critical}%)`,
        value: errorRate,
        threshold: this.thresholds.errorRate.critical,
        timestamp: currentTime
      });
    } else if (errorRate > this.thresholds.errorRate.warning) {
      this.triggerAlert('error_rate_warning', {
        level: 'warning',
        message: `Error rate is ${errorRate.toFixed(2)}% (warning threshold: ${this.thresholds.errorRate.warning}%)`,
        value: errorRate,
        threshold: this.thresholds.errorRate.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('error_rate_critical');
      this.resolveAlert('error_rate_warning');
    }
  }

  /**
   * Check system resource alerts
   */
  checkSystemResourceAlerts(currentTime) {
    const memoryUsage = this.metrics.system.memory.percentage;
    const cpuLoad = this.metrics.system.cpu.loadAverage[0];
    
    // Memory alerts
    if (memoryUsage > this.thresholds.memory.critical) {
      this.triggerAlert('memory_critical', {
        level: 'critical',
        message: `Memory usage is ${memoryUsage.toFixed(2)}% (critical threshold: ${this.thresholds.memory.critical}%)`,
        value: memoryUsage,
        threshold: this.thresholds.memory.critical,
        timestamp: currentTime
      });
    } else if (memoryUsage > this.thresholds.memory.warning) {
      this.triggerAlert('memory_warning', {
        level: 'warning',
        message: `Memory usage is ${memoryUsage.toFixed(2)}% (warning threshold: ${this.thresholds.memory.warning}%)`,
        value: memoryUsage,
        threshold: this.thresholds.memory.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('memory_critical');
      this.resolveAlert('memory_warning');
    }
    
    // CPU load alerts (normalized for single core)
    const normalizedCpuLoad = (cpuLoad / os.cpus().length) * 100;
    
    if (normalizedCpuLoad > this.thresholds.cpu.critical) {
      this.triggerAlert('cpu_critical', {
        level: 'critical',
        message: `CPU load is ${normalizedCpuLoad.toFixed(2)}% (critical threshold: ${this.thresholds.cpu.critical}%)`,
        value: normalizedCpuLoad,
        threshold: this.thresholds.cpu.critical,
        timestamp: currentTime
      });
    } else if (normalizedCpuLoad > this.thresholds.cpu.warning) {
      this.triggerAlert('cpu_warning', {
        level: 'warning',
        message: `CPU load is ${normalizedCpuLoad.toFixed(2)}% (warning threshold: ${this.thresholds.cpu.warning}%)`,
        value: normalizedCpuLoad,
        threshold: this.thresholds.cpu.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('cpu_critical');
      this.resolveAlert('cpu_warning');
    }
  }

  /**
   * Check medical operation alerts
   */
  checkMedicalOperationAlerts(currentTime) {
    const avgEncryptionTime = this.metrics.medical.encryptionOperations.averageTime;
    
    if (avgEncryptionTime > this.thresholds.medical.encryptionTime.critical) {
      this.triggerAlert('encryption_time_critical', {
        level: 'critical',
        message: `Medical data encryption time is ${avgEncryptionTime.toFixed(2)}ms (critical threshold: ${this.thresholds.medical.encryptionTime.critical}ms)`,
        value: avgEncryptionTime,
        threshold: this.thresholds.medical.encryptionTime.critical,
        timestamp: currentTime
      });
    } else if (avgEncryptionTime > this.thresholds.medical.encryptionTime.warning) {
      this.triggerAlert('encryption_time_warning', {
        level: 'warning',
        message: `Medical data encryption time is ${avgEncryptionTime.toFixed(2)}ms (warning threshold: ${this.thresholds.medical.encryptionTime.warning}ms)`,
        value: avgEncryptionTime,
        threshold: this.thresholds.medical.encryptionTime.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('encryption_time_critical');
      this.resolveAlert('encryption_time_warning');
    }
  }

  /**
   * Check database alerts
   */
  checkDatabaseAlerts(currentTime) {
    const avgQueryTime = this.metrics.database.queries.averageTime;
    
    if (avgQueryTime > this.thresholds.database.queryTime.critical) {
      this.triggerAlert('database_query_critical', {
        level: 'critical',
        message: `Database query time is ${avgQueryTime.toFixed(2)}ms (critical threshold: ${this.thresholds.database.queryTime.critical}ms)`,
        value: avgQueryTime,
        threshold: this.thresholds.database.queryTime.critical,
        timestamp: currentTime
      });
    } else if (avgQueryTime > this.thresholds.database.queryTime.warning) {
      this.triggerAlert('database_query_warning', {
        level: 'warning',
        message: `Database query time is ${avgQueryTime.toFixed(2)}ms (warning threshold: ${this.thresholds.database.queryTime.warning}ms)`,
        value: avgQueryTime,
        threshold: this.thresholds.database.queryTime.warning,
        timestamp: currentTime
      });
    } else {
      this.resolveAlert('database_query_critical');
      this.resolveAlert('database_query_warning');
    }
  }

  /**
   * Trigger an alert
   */
  triggerAlert(alertId, alertData) {
    const currentTime = Date.now();
    
    // Check if alert is suppressed
    if (this.alerts.suppression.has(alertId)) {
      const suppressUntil = this.alerts.suppression.get(alertId);
      if (currentTime < suppressUntil) {
        return; // Alert is still suppressed
      } else {
        this.alerts.suppression.delete(alertId); // Remove expired suppression
      }
    }
    
    // Check if this is a new alert or an update
    const existingAlert = this.alerts.active.get(alertId);
    
    if (!existingAlert) {
      // New alert
      const alert = {
        id: alertId,
        ...alertData,
        firstOccurrence: currentTime,
        lastOccurrence: currentTime,
        occurrenceCount: 1,
        resolved: false
      };
      
      this.alerts.active.set(alertId, alert);
      this.alerts.history.push({ ...alert });
      
      console.error(`🚨 ALERT [${alertData.level.toUpperCase()}]: ${alertData.message}`);
      
      // Emit alert event
      this.emit('alert', alert);
      
      // Send notification (implement based on your notification system)
      this.sendAlertNotification(alert);
      
    } else {
      // Update existing alert
      existingAlert.lastOccurrence = currentTime;
      existingAlert.occurrenceCount++;
      existingAlert.value = alertData.value;
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.active.get(alertId);
    
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      
      this.alerts.active.delete(alertId);
      
      console.log(`✅ RESOLVED: Alert ${alertId} has been resolved`);
      
      // Emit resolution event
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      // In a real implementation, this would integrate with:
      // - Email notifications
      // - Slack/Teams webhooks
      // - SMS alerts
      // - PagerDuty integration
      
      const notificationData = {
        alert: alert,
        platform: 'DoktuTracker Medical Platform',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date(alert.timestamp).toISOString()
      };
      
      // Log notification (replace with actual notification service)
      console.log(`📧 Alert notification sent: ${alert.id}`);
      
      // Cache alert for dashboard display
      await cacheService.set('alert', alert.id, notificationData, 3600); // Cache for 1 hour
      
    } catch (error) {
      console.error('❌ Failed to send alert notification:', error);
    }
  }

  /**
   * Suppress alerts for a specific duration
   */
  suppressAlert(alertId, durationMs) {
    const suppressUntil = Date.now() + durationMs;
    this.alerts.suppression.set(alertId, suppressUntil);
    
    console.log(`🔇 Alert ${alertId} suppressed for ${durationMs / 1000}s`);
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    // Update cache metrics from cache service
    if (cacheService) {
      const cacheMetrics = cacheService.getMetrics();
      this.metrics.cache = {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        hitRate: parseFloat(cacheMetrics.hitRate),
        operations: {
          get: cacheMetrics.hits + cacheMetrics.misses,
          set: cacheMetrics.sets,
          delete: cacheMetrics.deletes
        }
      };
    }
    
    return {
      ...this.metrics,
      alerts: {
        active: Array.from(this.alerts.active.values()),
        activeCount: this.alerts.active.size,
        historyCount: this.alerts.history.length
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const activeAlerts = this.alerts.active.size;
    const criticalAlerts = Array.from(this.alerts.active.values())
      .filter(alert => alert.level === 'critical').length;
    
    let status = 'healthy';
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (activeAlerts > 0) {
      status = 'warning';
    }
    
    return {
      status,
      activeAlerts,
      criticalAlerts,
      uptime: this.metrics.system.processUptime,
      responseTime: this.metrics.application.responseTime.average,
      errorRate: this.metrics.application.errorRate,
      memoryUsage: this.metrics.system.memory.percentage,
      timestamp: Date.now()
    };
  }

  /**
   * Start metrics cleanup (prevent memory leaks)
   */
  startMetricsCleanup() {
    this.metricsCleanupInterval = setInterval(() => {
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      // Clean old request times
      this.requestTimes = this.requestTimes.filter(r => r.timestamp > cutoffTime);
      
      // Clean old encryption times
      this.encryptionTimes = this.encryptionTimes.filter(e => e.timestamp > cutoffTime);
      
      // Clean old query times
      this.queryTimes = this.queryTimes.filter(q => q.timestamp > cutoffTime);
      
      // Clean old alert history (keep last 1000)
      if (this.alerts.history.length > 1000) {
        this.alerts.history = this.alerts.history.slice(-1000);
      }
      
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const cleanup = () => {
      console.log('🛑 APM Service shutting down...');
      
      if (this.systemMetricsInterval) clearInterval(this.systemMetricsInterval);
      if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);
      if (this.metricsCleanupInterval) clearInterval(this.metricsCleanupInterval);
      
      console.log('✅ APM Service shut down gracefully');
    };
    
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }
}

// Create singleton instance
export const apmService = new APMService();

export default apmService;