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

  app.get("/api/callback", (req, res, next) => {
    console.log('OAuth callback received with query:', req.query);
    console.log('Session data:', req.session);
    
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err) {
        console.error('OAuth authentication error:', err);
        return next(err);
      }
      if (!user) {
        console.log('No user returned from OAuth, redirecting to login');
        return res.redirect("/api/login");
      }
      
      console.log('User authenticated successfully:', user.claims);
      
      req.logIn(user, async (err) => {
        if (err) {
          console.error('Session login error:', err);
          return next(err);
        }
        
        try {
          // Instead of redirecting to splash page, send HTML that closes the window and redirects parent
          const bookingRedirect = req.session?.bookingRedirect;
          console.log('Auth callback - bookingRedirect from session:', bookingRedirect);
          
          let redirectUrl = '/dashboard';
          
          if (bookingRedirect) {
            delete req.session.bookingRedirect;
            redirectUrl = bookingRedirect;
          } else {
            // Check user role for appropriate dashboard
            const dbUser = await storage.getUser(user.claims.sub);
            if (dbUser) {
              if (dbUser.role === 'doctor') {
                redirectUrl = '/doctor-dashboard';
              } else if (dbUser.role === 'admin') {
                redirectUrl = '/admin-dashboard';
              }
            }
          }
          
          console.log('Final redirect URL:', redirectUrl);
          
          // Send HTML that redirects the parent window and closes popup
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Success</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
                .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <p>Authentication successful. Redirecting...</p>
              <script>
                console.log('Auth callback executing, redirect URL:', '${redirectUrl}');
                
                function redirect() {
                  if (window.opener && !window.opener.closed) {
                    console.log('Redirecting opener to:', '${redirectUrl}');
                    
                    // Try postMessage first
                    try {
                      window.opener.postMessage({
                        type: 'AUTH_SUCCESS',
                        redirectUrl: '${redirectUrl}'
                      }, window.location.origin);
                    } catch (e) {
                      console.log('PostMessage failed, using direct redirect');
                    }
                    
                    // Also do direct redirect as fallback
                    window.opener.location.href = '${redirectUrl}';
                    
                    setTimeout(() => {
                      window.close();
                    }, 1000);
                  } else {
                    console.log('No opener found, redirecting current window');
                    window.location.href = '${redirectUrl}';
                  }
                }
                
                // Try redirect immediately and also after a short delay
                redirect();
                setTimeout(redirect, 500);
              </script>
            </body>
            </html>
          `;
          
          return res.send(html);
        } catch (error) {
          console.error('Error in callback redirect logic:', error);
          return res.redirect('/dashboard');
        }
      });
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
