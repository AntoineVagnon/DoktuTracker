/**
 * Security Hardening Middleware for Doktu Medical Platform
 * Phase 3 - Production Security Excellence
 * 
 * Features:
 * - Comprehensive security headers
 * - Advanced rate limiting
 * - Medical data protection
 * - OWASP Top 10 mitigation
 * - Input validation and sanitization
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, query, param, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { apmService } from '../services/apmService.js';

/**
 * Security headers middleware using Helmet
 */
export function securityHeaders() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com"
        ],
        scriptSrc: [
          "'self'", 
          "https://js.stripe.com",
          "https://replit.com",
          "'unsafe-inline'",
          "'unsafe-eval'" // Only for development
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "wss:",
          "ws:",
          "https:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:"
        ],
        mediaSrc: [
          "'self'",
          "blob:"
        ],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://zoom.us"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        scriptSrcAttr: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    
    // Cross-Origin policies
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    
    // Additional security headers
    originAgentCluster: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // HSTS (HTTP Strict Transport Security)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // DNS prefetch control
    dnsPrefetchControl: { allow: false },
    
    // Download options
    ieNoOpen: true,
    
    // MIME type sniffing protection
    noSniff: true,
    
    // Permissions Policy
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: ["self"],
        geolocation: []
      }
    },
    
    // X-Powered-By header removal
    hidePoweredBy: true,
    
    // XSS Protection
    xssFilter: true
  });
}

/**
 * Advanced rate limiting for different endpoint types
 */
export const rateLimitConfig = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit violations
      apmService.emit('rateLimitExceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: Date.now()
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      });
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    skipSuccessfulRequests: true,
    message: {
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    handler: (req, res) => {
      apmService.emit('authRateLimitExceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: Date.now()
      });
      
      res.status(429).json({
        error: 'Authentication rate limit exceeded',
        message: 'Too many login attempts. Account temporarily locked.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      });
    }
  }),

  // Medical data rate limiting (more restrictive)
  medical: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 medical data requests per 5 minutes
    message: {
      error: 'Medical data rate limit exceeded',
      message: 'Too many medical data requests. Please try again later.',
      retryAfter: '5 minutes'
    },
    handler: (req, res) => {
      apmService.emit('medicalRateLimitExceeded', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        timestamp: Date.now()
      });
      
      res.status(429).json({
        error: 'Medical data rate limit exceeded',
        message: 'Too many medical data requests. Please wait before accessing more medical records.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      });
    }
  }),

  // Admin operations rate limiting
  admin: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // 50 admin operations per 10 minutes
    message: {
      error: 'Admin operation rate limit exceeded',
      message: 'Too many admin operations. Please try again later.'
    }
  }),

  // GDPR data export rate limiting (very restrictive)
  gdpr: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 data export requests per hour
    message: {
      error: 'Data export rate limit exceeded',
      message: 'Too many data export requests. Please wait before requesting another export.'
    }
  })
};

/**
 * Input validation middleware factory
 */
export function createInputValidation(validationRules = []) {
  return [
    ...validationRules,
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        // Log validation failures
        apmService.emit('inputValidationFailed', {
          ip: req.ip,
          endpoint: req.path,
          method: req.method,
          errors: errors.array(),
          timestamp: Date.now()
        });
        
        return res.status(400).json({
          error: 'Input validation failed',
          message: 'Invalid input provided',
          details: errors.array()
        });
      }
      
      next();
    }
  ];
}

/**
 * Common validation rules
 */
export const validationRules = {
  // User ID validation
  userId: param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  
  // Patient ID validation
  patientId: param('patientId').isInt({ min: 1 }).withMessage('Patient ID must be a positive integer'),
  
  // Email validation
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  
  // Password validation (strong passwords for medical platform)
  password: body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  // Medical record validation
  medicalRecord: [
    body('patientId').isInt({ min: 1 }).withMessage('Patient ID is required'),
    body('diagnosis').isLength({ min: 3, max: 1000 }).withMessage('Diagnosis must be 3-1000 characters'),
    body('symptoms').optional().isLength({ max: 2000 }).withMessage('Symptoms must be under 2000 characters'),
    body('treatment').optional().isLength({ max: 2000 }).withMessage('Treatment must be under 2000 characters'),
    body('severity').optional().isIn(['low', 'normal', 'high', 'critical']).withMessage('Invalid severity level')
  ],
  
  // Search query validation
  searchQuery: query('q')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be 2-100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.@]+$/)
    .withMessage('Search query contains invalid characters'),
  
  // Date range validation
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 format'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 format')
  ],
  
  // Pagination validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ]
};

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req, res, next) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const sanitizedKey = sanitizeValue(key);
    
    // Sanitize value
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

/**
 * Sanitize individual values
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potentially dangerous characters but preserve medical text
  // This is a balance between security and medical data integrity
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No HTML attributes allowed
    KEEP_CONTENT: true // Keep text content
  });
}

/**
 * SQL injection protection middleware
 */
export function sqlInjectionProtection(req, res, next) {
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(;|'|"|`)/g,
    /(\bor\b.*=.*\bor\b|\band\b.*=.*\band\b)/gi
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      // Log potential SQL injection attempt
      apmService.emit('sqlInjectionAttempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        suspiciousData: requestData,
        timestamp: Date.now()
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially harmful content'
      });
    }
  }
  
  next();
}

/**
 * XSS protection middleware
 */
export function xssProtection(req, res, next) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<link\b/gi
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query
  });
  
  for (const pattern of xssPatterns) {
    if (pattern.test(requestData)) {
      // Log potential XSS attempt
      apmService.emit('xssAttempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        suspiciousData: requestData,
        timestamp: Date.now()
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially harmful content'
      });
    }
  }
  
  next();
}

/**
 * Path traversal protection middleware
 */
export function pathTraversalProtection(req, res, next) {
  const pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ];
  
  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query
  });
  
  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(requestData)) {
      // Log potential path traversal attempt
      apmService.emit('pathTraversalAttempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        url: req.url,
        timestamp: Date.now()
      });
      
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request contains invalid path components'
      });
    }
  }
  
  next();
}

/**
 * Medical data protection middleware
 */
export function medicalDataProtection(req, res, next) {
  // Check if this is a medical data endpoint
  const isMedicalEndpoint = req.path.includes('/medical-records') ||
                           req.path.includes('/health-profile') ||
                           req.path.includes('/prescription');
  
  if (isMedicalEndpoint) {
    // Enhanced logging for medical data access
    console.log(`🏥 Medical data access: ${req.method} ${req.path}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Add medical data protection headers
    res.set('X-Medical-Data-Access', 'true');
    res.set('X-Data-Classification', 'sensitive');
    res.set('X-Audit-Required', 'true');
    
    // Check for required authentication
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Medical data access requires authentication'
      });
    }
    
    // Enhanced session validation for medical data
    if (req.user.sessionExpiry && new Date() > new Date(req.user.sessionExpiry)) {
      return res.status(401).json({
        error: 'Session expired',
        message: 'Medical data access requires valid session'
      });
    }
  }
  
  next();
}

/**
 * CORS configuration for medical platform
 */
export function corsConfig() {
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Define allowed origins based on environment
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? [
            'https://doktu.co',
            'https://www.doktu.co',
            'https://app.doktu.co'
          ]
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
          ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log unauthorized CORS attempt
        apmService.emit('unauthorizedCORS', {
          origin,
          timestamp: Date.now()
        });
        
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Response-Time',
      'X-Cache',
      'X-Rate-Limit-Remaining'
    ],
    maxAge: 86400 // 24 hours
  };
}

/**
 * Request size limiting middleware
 */
export function requestSizeLimit() {
  return {
    json: { limit: '10mb' }, // For medical document uploads
    urlencoded: { limit: '10mb', extended: true },
    raw: { limit: '10mb' },
    text: { limit: '1mb' }
  };
}

/**
 * Security logging middleware
 */
export function securityLogging(req, res, next) {
  // Log all requests for security analysis
  const securityLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userRole: req.user?.role,
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer')
  };
  
  // Enhanced logging for sensitive operations
  if (req.path.includes('/auth') || 
      req.path.includes('/medical') || 
      req.path.includes('/admin')) {
    console.log('🔒 Security log:', securityLog);
  }
  
  next();
}

export default {
  securityHeaders,
  rateLimitConfig,
  createInputValidation,
  validationRules,
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  pathTraversalProtection,
  medicalDataProtection,
  corsConfig,
  requestSizeLimit,
  securityLogging
};