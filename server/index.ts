// Deployment: 2025-10-28-1445 - Force rebuild for doctorId fix
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
// Import conditionnel pour éviter Vite en production

// Import email processor to start it automatically
import "./services/emailProcessor";

// Import and initialize cron jobs for scheduled notifications
import { initializeAppointmentReminders } from "./cron/appointmentReminders";
import { initializeMembershipReminders } from "./cron/membershipReminders";
import { notificationService } from "./services/notificationService";

// Initialize cron jobs after a short delay to ensure all services are ready
setTimeout(() => {
  console.log('[CRON] Initializing notification cron jobs...');
  initializeAppointmentReminders(notificationService);
  initializeMembershipReminders(notificationService);
  console.log('[CRON] All cron jobs initialized successfully');
}, 2000);

const app = express();
app.set("trust proxy", 1); // Trust first proxy (required for rate limiting behind proxy/load balancer)

// ============================================================================
// CORS CONFIGURATION - Fixed for credentials support
// ============================================================================
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow specific origins (no wildcard due to credentials)
  if (origin === 'https://www.doktu.co' ||
      origin === 'https://doktu.co' ||
      origin === 'https://doktu-tracker.vercel.app' ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5000' ||
      origin === 'http://localhost:3000') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// ============================================================================
// GUARANTEED REQUEST VISIBILITY - ABSOLUTE TOP PRIORITY
// ============================================================================
app.use((req, res, next) => {
  const start = Date.now();
  const url = req.originalUrl;
  console.log(`[REQ] ${req.method} ${url}`);
  res.on('finish', () => {
    console.log(`[RES] ${req.method} ${url} -> ${res.statusCode} in ${Date.now() - start}ms`);
  });
  next();
});

// ============================================================================
// BODY PARSING - Special handling for Stripe webhooks
// ============================================================================
// Stripe webhooks need RAW body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// All other routes use JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add session middleware for Supabase auth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true, // Allow sessions for unauthenticated users
  cookie: {
    secure: true, // Required for sameSite: 'none'
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // ============================================================================
  // EMERGENCY TRACER FOR /api/appointments* - BEFORE VITE SETUP
  // ============================================================================
  app.all('/api/appointments*', (req, _res, next) => {
    console.log('🚨🚨 [EMERGENCY INDEX TRACER] 🚨🚨', req.method, req.originalUrl);
    console.error('🚨🚨 [EMERGENCY INDEX ERROR LOG] 🚨🚨', req.method, req.originalUrl);
    next();
  });

  await registerRoutes(app);
  
  // Create single HTTP server instance (moved from routes.ts)
  const { createServer } = await import('http');
  const server = createServer(app);
  
  // ============================================================================
  // HARDENED NODE-LEVEL REQUEST TRACER - PREPENDED TO GUARANTEE VISIBILITY
  // ============================================================================
  server.prependListener('request', (req) => {
    console.log(`[SRV-PREPEND] ${req.method} ${req.url}`);
  });
  
  server.on('request', (req) => {
    console.log(`[SRV] ${req.method} ${req.url}`);
  });

  // ============================================================================
  // LAST-CHANCE API FALLTHROUGH TRACER
  // ============================================================================
  app.use('/api', (req, _res, next) => {
    console.log('API fallthrough:', req.method, req.originalUrl);
    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('NODE_ENV trimmed:', process.env.NODE_ENV?.trim());
  console.log('Is development?', process.env.NODE_ENV?.trim() === "development");
  if (process.env.NODE_ENV?.trim() === "development") {
    console.log('Setting up Vite dev server...');
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    console.log('Setting up production static server...');
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  // Prevent multiple server instances - critical for dev stability
  if (globalThis.__serverListening) {
    console.log('⚠️ Server already listening, skipping duplicate listener');
    return;
  }

  // Use Railway's PORT environment variable or default to 5000
  const port = parseInt(process.env.PORT || '5000');
  server.listen({
    port,
    host: "0.0.0.0",
    // Remove reusePort to prevent multiple server instances
  }, () => {
    console.log(`serving on port ${port}`);
    globalThis.__serverListening = true;
  });
})();