import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session data interface
declare module "express-session" {
  interface SessionData {
    bookingRedirect?: string;
    loginRedirect?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store booking parameters for post-auth redirect
    const { doctorId, slot, price } = req.query;
    console.log('Login endpoint - query params:', { doctorId, slot, price });
    
    if (doctorId && slot && price) {
      // Safely convert query params to strings
      const doctorIdStr = typeof doctorId === 'string' ? doctorId : Array.isArray(doctorId) ? doctorId[0] : String(doctorId);
      const slotStr = typeof slot === 'string' ? slot : Array.isArray(slot) ? slot[0] : String(slot);
      const priceStr = typeof price === 'string' ? price : Array.isArray(price) ? price[0] : String(price);
      req.session!.bookingRedirect = `/payment?doctorId=${doctorIdStr}&slot=${encodeURIComponent(slotStr)}&price=${priceStr}`;
      console.log('Stored booking redirect:', req.session!.bookingRedirect);
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Success handler that bypasses splash page
  app.get("/api/auth-success", async (req, res) => {
    console.log('Auth success handler called');
    
    if (!req.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      return res.redirect('/api/login');
    }

    try {
      const user = req.user as any;
      console.log('Authenticated user:', user.claims);

      // Priority 1: Check for booking flow redirect
      const bookingRedirect = req.session?.bookingRedirect;
      console.log('Auth success - bookingRedirect:', bookingRedirect);
      if (bookingRedirect) {
        delete req.session.bookingRedirect;
        console.log('Redirecting to booking payment:', bookingRedirect);
        return res.redirect(bookingRedirect);
      }
      
      // Priority 2: Get user from database to check role
      const dbUser = await storage.getUser(user.claims.sub);
      console.log('Database user found:', dbUser);
      
      if (dbUser) {
        // Role-based redirect based on user role in database
        if (dbUser.role === 'doctor') {
          console.log('Redirecting doctor to dashboard');
          return res.redirect('/doctor-dashboard');
        } else if (dbUser.role === 'admin') {
          console.log('Redirecting admin to dashboard');
          return res.redirect('/admin-dashboard');
        }
      }
      
      // Priority 3: Check for other stored redirects
      const storedRedirect = req.session?.loginRedirect;
      if (storedRedirect) {
        delete req.session.loginRedirect;
        console.log('Redirecting to stored redirect:', storedRedirect);
        return res.redirect(storedRedirect);
      }
      
      // Default redirect for patients
      console.log('Redirecting to default patient dashboard');
      return res.redirect('/dashboard');
    } catch (error) {
      console.error('Error in auth success handler:', error);
      return res.redirect('/dashboard');
    }
  });

  app.get("/api/callback", async (req, res, next) => {
    console.log('OAuth callback received with query:', req.query);
    console.log('Session data:', req.session);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: '/api/auth-success',
      failureRedirect: '/api/login'
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
