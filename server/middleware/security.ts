import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { body, validationResult } from 'express-validator';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// JWT Secret - ensure this is set in environment
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware to protect sensitive endpoints
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    (req as any).user = user;
    next();
  });
}

// Helmet configuration for comprehensive security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://replit.com", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss:", "ws:", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://zoom.us"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false, // For Zoom compatibility
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Additional security headers
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
}

// General rate limiter - DISABLED to allow multiple registrations
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Effectively unlimited - allows multiple registrations
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints (relaxed for development)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 attempts to effectively disable rate limiting
  message: {
    error: 'Too many authentication attempts',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});

// Progressive slow down - DISABLED to allow multiple registrations
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100000, // Never trigger delays
  delayMs: () => 0, // No delay
  maxDelayMs: 0,
});

// Strict limiter - DISABLED to allow multiple registrations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Effectively unlimited
  message: {
    error: 'Sensitive endpoint rate limit exceeded',
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  }
});

// User input validation and sanitization
export const validateAndSanitizeUser = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .customSanitizer(value => purify.sanitize(value)),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .customSanitizer(value => purify.sanitize(value)),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

// Registration-specific validation
export const validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .customSanitizer(value => purify.sanitize(value)),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .customSanitizer(value => purify.sanitize(value)),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase, one uppercase, one number, and one special character')
];

// Middleware to handle validation errors
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array() 
    });
  }
  next();
}

// Global error handler middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log detailed error for developers (server-side only)
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Generic response for clients to avoid information leakage
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.status === 404) {
    return res.status(404).json({ 
      error: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND'
    });
  }
  
  if (err.status === 401) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Generic error to prevent information leakage
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { details: err.message })
  });
}

// Security audit middleware for logging sensitive operations
export function securityAudit(req: Request, res: Response, next: NextFunction) {
  const securityEvent = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id || 'anonymous',
    sessionId: (req as any).sessionID
  };
  
  // Log sensitive endpoint access
  if (req.url.includes('/api/auth/') || 
      req.url.includes('/api/doctors/') ||
      req.url.includes('/api/bookings/') ||
      req.url.includes('/api/appointments')) {
    console.log('[SECURITY AUDIT]', securityEvent);
  }
  
  // Detect potential XSS attempts
  const suspiciousPatterns = ['<script>', 'javascript:', 'data:text/html', 'onerror=', 'onclick='];
  const urlString = req.url + JSON.stringify(req.body || {});
  
  for (const pattern of suspiciousPatterns) {
    if (urlString.toLowerCase().includes(pattern)) {
      console.warn('[SECURITY WARNING] Potential XSS attempt detected:', {
        ...securityEvent,
        severity: 'HIGH',
        type: 'XSS_ATTEMPT',
        pattern
      });
      // Block the request
      return res.status(400).json({
        error: 'Invalid request',
        code: 'MALICIOUS_INPUT_DETECTED'
      });
    }
  }
  
  next();
}

// Sanitize all incoming request data
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = purify.sanitize(req.body[key]);
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = purify.sanitize(req.query[key] as string) as any;
      }
    });
  }
  
  next();
}

// Hash password utility
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

// Verify password utility
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}