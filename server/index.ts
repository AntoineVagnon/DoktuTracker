import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.set("trust proxy", 1); // Trust first proxy (required for rate limiting behind proxy/load balancer)

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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add session middleware for Supabase auth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true, // Allow sessions for unauthenticated users
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
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

      log(logLine);
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Prevent multiple server instances - critical for dev stability
  if (globalThis.__serverListening) {
    log('⚠️ Server already listening, skipping duplicate listener');
    return;
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    // Remove reusePort to prevent multiple server instances
  }, () => {
    log(`serving on port ${port}`);
    globalThis.__serverListening = true;
  });
})();