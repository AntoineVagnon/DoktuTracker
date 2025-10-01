/**
 * Redis Cache Service for Doktu Medical Platform
 * Phase 3 - Production Performance Optimization
 * 
 * Features:
 * - Medical data caching with encryption
 * - Intelligent cache invalidation
 * - Performance metrics
 * - Medical compliance considerations
 */

import Redis from 'ioredis';
import { encryptionService } from './encryptionService.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    // Cache TTL configurations (in seconds)
    this.ttlConfig = {
      // User data - shorter TTL for security
      userSession: 3600, // 1 hour
      userProfile: 1800, // 30 minutes
      userPermissions: 900, // 15 minutes
      
      // Medical data - very short TTL for data freshness
      medicalRecord: 300, // 5 minutes
      healthProfile: 600, // 10 minutes
      prescription: 300, // 5 minutes
      
      // System data - longer TTL
      systemHealth: 60, // 1 minute
      apiMetrics: 300, // 5 minutes
      auditLogs: 180, // 3 minutes
      
      // Static data - longest TTL
      doctorList: 3600, // 1 hour
      appointmentSlots: 1800, // 30 minutes
      notificationTemplates: 7200 // 2 hours
    };
    
    this.init();
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    try {
      // Skip Redis initialization if Redis URL is explicitly empty or not set
      if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
        console.log('⚠️ Redis not configured - using memory cache fallback');
        this.redis = new Map();
        this.isConnected = false;
        return;
      }

      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        
        // Performance optimizations
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        keepAlive: 30000,
        
        // Disable auto-reconnect to prevent spam
        enableAutoPipelining: false,
        maxRetriesPerRequest: 0, // No retries to prevent spam
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false, // Prevent queueing when offline
        
        // Medical data security
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        
        // Connection pool
        family: 4,
        connectTimeout: 5000, // Shorter timeout
        commandTimeout: 3000
      };

      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        console.log('🔄 Redis: Connecting...');
      });

      this.redis.on('ready', () => {
        this.isConnected = true;
        console.log('✅ Redis: Connected and ready');
        // Skip health check to prevent connection spam
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.metrics.errors++;
        console.error('❌ Redis error:', error.message);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        console.log('🔌 Redis: Connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
      });

      // Skip connection test to prevent immediate errors when Redis unavailable
      console.log('🏓 Redis: Configuration loaded, will connect on first use');

    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      
      // Fall back to memory cache in development
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Falling back to memory cache for development');
        this.redis = new Map(); // Simple fallback
      }
    }
  }

  /**
   * Setup periodic health check
   */
  setupHealthCheck() {
    setInterval(async () => {
      try {
        await this.redis.ping();
      } catch (error) {
        this.isConnected = false;
        console.error('❌ Redis health check failed:', error.message);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace, identifier, userContext = null) {
    const baseKey = `doktu:${namespace}:${identifier}`;
    
    // Add user context for personalized data
    if (userContext) {
      return `${baseKey}:user:${userContext}`;
    }
    
    return baseKey;
  }

  /**
   * Encrypt sensitive data before caching
   */
  encryptForCache(data, isMedicalData = false) {
    if (!isMedicalData || !data) {
      return JSON.stringify(data);
    }
    
    try {
      const encrypted = encryptionService.encryptObject(data);
      return JSON.stringify({
        _encrypted: true,
        _medical: true,
        data: encrypted
      });
    } catch (error) {
      console.error('❌ Cache encryption failed:', error);
      throw new Error('Failed to encrypt cache data');
    }
  }

  /**
   * Decrypt data from cache
   */
  decryptFromCache(cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      
      if (parsed._encrypted && parsed._medical) {
        return encryptionService.decryptObject(parsed.data);
      }
      
      return parsed;
    } catch (error) {
      console.error('❌ Cache decryption failed:', error);
      return null;
    }
  }

  /**
   * Set cache value with automatic encryption for medical data
   */
  async set(namespace, identifier, data, customTtl = null, userContext = null, isMedicalData = false) {
    if (!this.isConnected && !this.redis) {
      return false;
    }

    try {
      const key = this.generateKey(namespace, identifier, userContext);
      const ttl = customTtl || this.ttlConfig[namespace] || 300;
      const encryptedData = this.encryptForCache(data, isMedicalData);

      if (this.redis instanceof Map) {
        // Fallback memory cache
        this.redis.set(key, encryptedData);
        setTimeout(() => this.redis.delete(key), ttl * 1000);
      } else {
        await this.redis.setex(key, ttl, encryptedData);
      }

      this.metrics.sets++;
      
      // Log cache set for medical data
      if (isMedicalData) {
        console.log(`🔒 Medical data cached: ${namespace}:${identifier} (TTL: ${ttl}s)`);
      }
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache set failed:', error.message);
      return false;
    }
  }

  /**
   * Get cache value with automatic decryption
   */
  async get(namespace, identifier, userContext = null) {
    if (!this.isConnected && !this.redis) {
      this.metrics.misses++;
      return null;
    }

    try {
      const key = this.generateKey(namespace, identifier, userContext);
      let cachedData;

      if (this.redis instanceof Map) {
        // Fallback memory cache
        cachedData = this.redis.get(key);
      } else {
        cachedData = await this.redis.get(key);
      }

      if (cachedData) {
        this.metrics.hits++;
        const decryptedData = this.decryptFromCache(cachedData);
        
        if (decryptedData) {
          return decryptedData;
        }
      }

      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache get failed:', error.message);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(namespace, identifier, userContext = null) {
    if (!this.isConnected && !this.redis) {
      return false;
    }

    try {
      const key = this.generateKey(namespace, identifier, userContext);

      if (this.redis instanceof Map) {
        this.redis.delete(key);
      } else {
        await this.redis.del(key);
      }

      this.metrics.deletes++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache delete failed:', error.message);
      return false;
    }
  }

  /**
   * Invalidate cache pattern (for bulk operations)
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected || this.redis instanceof Map) {
      return false;
    }

    try {
      const keys = await this.redis.keys(`doktu:${pattern}*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Cache pattern invalidation failed:', error.message);
      return false;
    }
  }

  /**
   * Medical-specific cache methods
   */

  // Cache medical record
  async cacheMedicalRecord(recordId, data, patientId) {
    return await this.set('medicalRecord', recordId, data, this.ttlConfig.medicalRecord, patientId, true);
  }

  // Get cached medical record
  async getMedicalRecord(recordId, patientId) {
    return await this.get('medicalRecord', recordId, patientId);
  }

  // Cache health profile
  async cacheHealthProfile(patientId, data) {
    return await this.set('healthProfile', patientId, data, this.ttlConfig.healthProfile, patientId, true);
  }

  // Get cached health profile
  async getHealthProfile(patientId) {
    return await this.get('healthProfile', patientId, patientId);
  }

  // Cache user session
  async cacheUserSession(userId, sessionData) {
    return await this.set('userSession', userId, sessionData, this.ttlConfig.userSession, userId);
  }

  // Get cached user session
  async getUserSession(userId) {
    return await this.get('userSession', userId, userId);
  }

  // Cache API metrics
  async cacheApiMetrics(data) {
    return await this.set('apiMetrics', 'current', data, this.ttlConfig.apiMetrics);
  }

  // Get cached API metrics
  async getApiMetrics() {
    return await this.get('apiMetrics', 'current');
  }

  // Cache system health
  async cacheSystemHealth(data) {
    return await this.set('systemHealth', 'current', data, this.ttlConfig.systemHealth);
  }

  // Get cached system health
  async getSystemHealth() {
    return await this.get('systemHealth', 'current');
  }

  /**
   * Cache invalidation strategies for medical data compliance
   */

  // Invalidate all medical data for a patient (GDPR compliance)
  async invalidatePatientData(patientId) {
    await Promise.all([
      this.invalidatePattern(`medicalRecord:*:user:${patientId}`),
      this.invalidatePattern(`healthProfile:${patientId}`),
      this.invalidatePattern(`prescription:*:user:${patientId}`)
    ]);
    
    console.log(`🗑️ Invalidated all cached medical data for patient: ${patientId}`);
  }

  // Invalidate user session (logout/security)
  async invalidateUserSession(userId) {
    await this.delete('userSession', userId, userId);
    console.log(`🗑️ Invalidated user session: ${userId}`);
  }

  // Invalidate system caches (for updates)
  async invalidateSystemCaches() {
    await Promise.all([
      this.delete('systemHealth', 'current'),
      this.delete('apiMetrics', 'current'),
      this.invalidatePattern('doctorList'),
      this.invalidatePattern('appointmentSlots')
    ]);
    
    console.log('🗑️ Invalidated system caches');
  }

  /**
   * Performance monitoring
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      totalRequests: total,
      isConnected: this.isConnected
    };
  }

  /**
   * Health check for monitoring
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          message: 'Redis not connected',
          metrics: this.getMetrics()
        };
      }

      if (this.redis instanceof Map) {
        return {
          status: 'degraded',
          message: 'Using fallback memory cache',
          metrics: this.getMetrics()
        };
      }

      const start = performance.now();
      await this.redis.ping();
      const latency = performance.now() - start;

      return {
        status: 'healthy',
        latency: `${latency.toFixed(2)}ms`,
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        metrics: this.getMetrics()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.redis && typeof this.redis.disconnect === 'function') {
      await this.redis.disconnect();
      console.log('👋 Redis cache service shut down gracefully');
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await cacheService.shutdown();
});

process.on('SIGINT', async () => {
  await cacheService.shutdown();
});

export default cacheService;