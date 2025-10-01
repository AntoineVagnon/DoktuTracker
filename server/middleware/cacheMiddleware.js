/**
 * Cache Middleware for Doktu Medical Platform
 * Phase 3 - Production Performance Optimization
 * 
 * Features:
 * - Intelligent caching for API responses
 * - Medical data specific caching rules
 * - Cache invalidation hooks
 * - Performance monitoring
 */

import { cacheService } from '../services/cacheService.js';

/**
 * Generic cache middleware factory
 */
export function createCacheMiddleware(options = {}) {
  const {
    namespace = 'api',
    ttl = 300, // 5 minutes default
    keyGenerator = null,
    skipCache = false,
    isMedicalData = false,
    invalidateOnMutation = true
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET' && !options.cacheAllMethods) {
      return next();
    }

    // Skip if explicitly disabled
    if (skipCache || req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : generateDefaultCacheKey(req);

      const userContext = req.user ? req.user.id : null;

      // Try to get from cache
      const cachedResponse = await cacheService.get(namespace, cacheKey, userContext);
      
      if (cachedResponse) {
        // Cache hit - return cached response
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttl.toString());
        return res.json(cachedResponse);
      }

      // Cache miss - continue with request
      res.set('X-Cache', 'MISS');

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache in background (don't wait)
          cacheService.set(namespace, cacheKey, data, ttl, userContext, isMedicalData)
            .catch(error => {
              console.error('❌ Failed to cache response:', error.message);
            });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('❌ Cache middleware error:', error.message);
      // Continue without caching
      next();
    }
  };
}

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req) {
  const path = req.route ? req.route.path : req.path;
  const params = JSON.stringify(req.params || {});
  const query = JSON.stringify(req.query || {});
  
  return `${path}:${params}:${query}`;
}

/**
 * Medical data cache middleware
 */
export const medicalDataCache = createCacheMiddleware({
  namespace: 'medical',
  ttl: 300, // 5 minutes for medical data
  isMedicalData: true,
  keyGenerator: (req) => {
    // Include patient ID in cache key for medical data
    const patientId = req.params.patientId || req.body.patientId || req.user?.id;
    const baseKey = generateDefaultCacheKey(req);
    return patientId ? `${baseKey}:patient:${patientId}` : baseKey;
  }
});

/**
 * User data cache middleware
 */
export const userDataCache = createCacheMiddleware({
  namespace: 'user',
  ttl: 1800, // 30 minutes for user data
  keyGenerator: (req) => {
    const userId = req.params.userId || req.user?.id;
    const baseKey = generateDefaultCacheKey(req);
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }
});

/**
 * System metrics cache middleware
 */
export const metricsCache = createCacheMiddleware({
  namespace: 'metrics',
  ttl: 60, // 1 minute for metrics
  keyGenerator: (req) => {
    const timeRange = req.query.timeRange || '7d';
    return `dashboard:${timeRange}`;
  }
});

/**
 * API health cache middleware
 */
export const healthCache = createCacheMiddleware({
  namespace: 'health',
  ttl: 30, // 30 seconds for health checks
  keyGenerator: () => 'system_health'
});

/**
 * Doctor list cache middleware
 */
export const doctorListCache = createCacheMiddleware({
  namespace: 'doctorList',
  ttl: 3600, // 1 hour for doctor lists
  keyGenerator: (req) => {
    const specialty = req.query.specialty || 'all';
    const location = req.query.location || 'all';
    return `doctors:${specialty}:${location}`;
  }
});

/**
 * Cache invalidation middleware for mutations
 */
export function createCacheInvalidationMiddleware(patterns = []) {
  return async (req, res, next) => {
    // Only invalidate on successful mutations
    const originalJson = res.json;
    res.json = function(data) {
      // Check if this was a successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300 && 
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        
        // Invalidate cache patterns
        Promise.all(patterns.map(pattern => {
          if (typeof pattern === 'function') {
            return pattern(req, res);
          }
          return cacheService.invalidatePattern(pattern);
        })).catch(error => {
          console.error('❌ Cache invalidation failed:', error.message);
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Medical record cache invalidation
 */
export const invalidateMedicalRecordCache = createCacheInvalidationMiddleware([
  // Invalidate medical record caches
  async (req) => {
    const patientId = req.body.patientId || req.params.patientId;
    if (patientId) {
      await cacheService.invalidatePattern(`medical:*:patient:${patientId}`);
      await cacheService.invalidatePattern(`healthProfile:${patientId}`);
    }
  },
  'medical', // Invalidate all medical namespace
  'metrics' // Invalidate metrics that might include medical data counts
]);

/**
 * User management cache invalidation
 */
export const invalidateUserCache = createCacheInvalidationMiddleware([
  async (req) => {
    const userId = req.body.userId || req.params.userId || req.user?.id;
    if (userId) {
      await cacheService.invalidateUserSession(userId);
      await cacheService.invalidatePattern(`user:*:user:${userId}`);
    }
  },
  'user',
  'metrics'
]);

/**
 * System cache invalidation (for admin operations)
 */
export const invalidateSystemCache = createCacheInvalidationMiddleware([
  async () => {
    await cacheService.invalidateSystemCaches();
  },
  'health',
  'metrics',
  'doctorList'
]);

/**
 * Cache warming middleware (preload frequently accessed data)
 */
export function createCacheWarmingMiddleware(warmupFunctions = []) {
  return async (req, res, next) => {
    // Warm cache in background after response
    const originalJson = res.json;
    res.json = function(data) {
      // Start cache warming after response
      setImmediate(async () => {
        try {
          await Promise.all(warmupFunctions.map(fn => fn(req, data)));
        } catch (error) {
          console.error('❌ Cache warming failed:', error.message);
        }
      });
      
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Medical record cache warming
 */
export const warmMedicalRecordCache = createCacheWarmingMiddleware([
  // Preload related medical records
  async (req, data) => {
    if (data.patientId) {
      // This would typically call your medical records service
      console.log(`🔥 Warming medical record cache for patient: ${data.patientId}`);
    }
  }
]);

/**
 * Cache statistics middleware
 */
export function cacheStatsMiddleware(req, res, next) {
  // Add cache stats to response headers
  const stats = cacheService.getMetrics();
  res.set('X-Cache-Hit-Rate', stats.hitRate);
  res.set('X-Cache-Requests', stats.totalRequests.toString());
  
  next();
}

/**
 * Cache bypass middleware (for debugging)
 */
export function cacheBypassMiddleware(req, res, next) {
  // Check for bypass headers
  if (req.headers['x-cache-bypass'] === 'true' || 
      req.query.nocache === 'true') {
    req.skipCache = true;
  }
  
  next();
}

/**
 * GDPR compliance cache middleware
 */
export function gdprCacheMiddleware(req, res, next) {
  // Add GDPR-related headers
  res.set('X-Data-Processing', 'cached-medical-data');
  res.set('X-Data-Retention', '24-hours-max');
  
  // Override res.json to add GDPR notice for medical data
  const originalJson = res.json;
  res.json = function(data) {
    if (req.route && req.route.path.includes('medical')) {
      // Add GDPR notice to medical data responses
      const responseWithGdpr = {
        ...data,
        _gdpr: {
          notice: 'This medical data is cached for performance. Cache expires automatically.',
          rights: 'You have the right to request immediate cache invalidation.',
          contact: 'dpo@doktu.co'
        }
      };
      return originalJson.call(this, responseWithGdpr);
    }
    
    return originalJson.call(this, data);
  };

  next();
}

export default {
  createCacheMiddleware,
  medicalDataCache,
  userDataCache,
  metricsCache,
  healthCache,
  doctorListCache,
  invalidateMedicalRecordCache,
  invalidateUserCache,
  invalidateSystemCache,
  warmMedicalRecordCache,
  cacheStatsMiddleware,
  cacheBypassMiddleware,
  gdprCacheMiddleware
};