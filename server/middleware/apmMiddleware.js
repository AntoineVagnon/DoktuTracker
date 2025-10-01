/**
 * APM Middleware for Doktu Medical Platform
 * Phase 3 - Production Performance Monitoring
 * 
 * Features:
 * - Automatic request tracking
 * - Response time measurement
 * - Medical operation monitoring
 * - Error tracking and alerting
 */

import { apmService } from '../services/apmService.js';
import { performance } from 'perf_hooks';

/**
 * Main APM middleware for tracking HTTP requests
 */
export function apmMiddleware(req, res, next) {
  const startTime = performance.now();
  const requestId = generateRequestId();
  
  // Add request ID for tracing
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  
  // Track request start
  req.apmStartTime = startTime;
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Record request metrics
    apmService.recordRequest(
      req.method,
      req.route ? req.route.path : req.path,
      res.statusCode,
      responseTime
    );
    
    // Add performance headers
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Medical operation tracking middleware
 */
export function medicalOperationMiddleware(operation) {
  return (req, res, next) => {
    const startTime = performance.now();
    
    // Override res.json to capture medical operation metrics
    const originalJson = res.json;
    res.json = function(data) {
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Record medical operation
      apmService.recordMedicalOperation(operation, operationTime, success);
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Database operation tracking middleware
 */
export function databaseOperationMiddleware(operation) {
  return (req, res, next) => {
    // This would typically be used with database interceptors
    req.dbOperation = operation;
    req.dbStartTime = performance.now();
    
    next();
  };
}

/**
 * Error tracking middleware
 */
export function errorTrackingMiddleware(err, req, res, next) {
  const responseTime = req.apmStartTime ? performance.now() - req.apmStartTime : 0;
  
  // Record failed request
  apmService.recordRequest(
    req.method,
    req.route ? req.route.path : req.path,
    err.status || 500,
    responseTime
  );
  
  // Log error details for APM
  console.error('🚨 Request Error:', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Trigger alert for critical errors
  if (err.status >= 500) {
    apmService.emit('criticalError', {
      error: err.message,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      timestamp: Date.now()
    });
  }
  
  next(err);
}

/**
 * Security monitoring middleware
 */
export function securityMonitoringMiddleware(req, res, next) {
  // Track suspicious activities
  const suspiciousPatterns = [
    /\b(union|select|drop|delete|insert|update)\b/i, // SQL injection attempts
    /<script|javascript:|vbscript:/i, // XSS attempts
    /\.\.\//g, // Path traversal attempts
    /etc\/passwd|proc\/self\/environ/i // File inclusion attempts
  ];
  
  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query
  });
  
  const suspiciousActivity = suspiciousPatterns.some(pattern => 
    pattern.test(requestData)
  );
  
  if (suspiciousActivity) {
    console.warn('⚠️ Suspicious activity detected:', {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    
    // Record security event
    apmService.emit('securityEvent', {
      type: 'suspicious_activity',
      requestId: req.requestId,
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: Date.now()
    });
  }
  
  next();
}

/**
 * Rate limiting monitoring middleware
 */
export function rateLimitingMiddleware(windowMs = 900000, maxRequests = 100) {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key);
      const recentRequests = userRequests.filter(time => time > windowStart);
      requests.set(key, recentRequests);
    }
    
    const currentRequests = requests.get(key) || [];
    
    if (currentRequests.length >= maxRequests) {
      // Rate limit exceeded
      console.warn('⚠️ Rate limit exceeded:', {
        ip: key,
        requests: currentRequests.length,
        limit: maxRequests,
        window: windowMs
      });
      
      // Record rate limiting event
      apmService.emit('rateLimitExceeded', {
        ip: key,
        requests: currentRequests.length,
        limit: maxRequests,
        timestamp: now
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return;
    }
    
    // Record this request
    currentRequests.push(now);
    requests.set(key, currentRequests);
    
    next();
  };
}

/**
 * Medical data access monitoring
 */
export function medicalDataAccessMiddleware(req, res, next) {
  const isMedicalData = req.path.includes('/medical-records') || 
                      req.path.includes('/health-profile') ||
                      req.path.includes('/prescription');
  
  if (isMedicalData) {
    const startTime = performance.now();
    
    // Override res.json to track medical data access
    const originalJson = res.json;
    res.json = function(data) {
      const endTime = performance.now();
      const accessTime = endTime - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Record medical data access
      apmService.recordMedicalOperation('patient_data_access', accessTime, success);
      
      // Log medical data access for audit
      console.log('🏥 Medical data access:', {
        requestId: req.requestId,
        userId: req.user?.id,
        path: req.path,
        method: req.method,
        success,
        accessTime,
        timestamp: Date.now()
      });
      
      return originalJson.call(this, data);
    };
  }
  
  next();
}

/**
 * Health check middleware for APM endpoints
 */
export function healthCheckMiddleware(req, res, next) {
  // Don't track health check requests in main metrics
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  
  // Apply APM tracking for all other requests
  return apmMiddleware(req, res, next);
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Performance budget middleware
 */
export function performanceBudgetMiddleware(budgets = {}) {
  const defaultBudgets = {
    responseTime: 500, // ms
    memoryIncrease: 50 * 1024 * 1024, // 50MB
    ...budgets
  };
  
  return (req, res, next) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    // Override res.end to check performance budget
    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      
      // Check performance budget violations
      if (responseTime > defaultBudgets.responseTime) {
        console.warn('⚠️ Response time budget exceeded:', {
          path: req.path,
          responseTime,
          budget: defaultBudgets.responseTime
        });
        
        apmService.emit('performanceBudgetViolation', {
          type: 'response_time',
          path: req.path,
          actual: responseTime,
          budget: defaultBudgets.responseTime,
          timestamp: Date.now()
        });
      }
      
      if (memoryIncrease > defaultBudgets.memoryIncrease) {
        console.warn('⚠️ Memory budget exceeded:', {
          path: req.path,
          memoryIncrease,
          budget: defaultBudgets.memoryIncrease
        });
        
        apmService.emit('performanceBudgetViolation', {
          type: 'memory',
          path: req.path,
          actual: memoryIncrease,
          budget: defaultBudgets.memoryIncrease,
          timestamp: Date.now()
        });
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

export default {
  apmMiddleware,
  medicalOperationMiddleware,
  databaseOperationMiddleware,
  errorTrackingMiddleware,
  securityMonitoringMiddleware,
  rateLimitingMiddleware,
  medicalDataAccessMiddleware,
  healthCheckMiddleware,
  performanceBudgetMiddleware
};