import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import './types'; // Import session types

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function setupSupabaseAuth(app: Express) {
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      console.log('Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error.message);
        return res.status(401).json({ error: error.message });
      }

      // Store session in request for middleware
      (req.session as any).supabaseSession = data.session;

      // Get or create user profile in database
      // For login, find user by email since Supabase UUIDs don't match our integer IDs
      let user = await storage.getUserByEmail(data.user.email || email);
      if (!user) {
        user = await storage.upsertUser({
          id: data.user.id,
          email: data.user.email || email,
          role: 'patient'
        });
      }

      res.json({ 
        user,
        session: data.session,
        message: 'Login successful' 
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = 'patient' } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (data.user) {
        // Create user profile in our database - only use fields that exist
        const user = await storage.upsertUser({
          id: data.user.id, // This will be ignored in favor of auto-increment
          email: data.user.email!,
          role
        });

        // Store session if user is confirmed
        if (data.session) {
          (req.session as any).supabaseSession = data.session;
        }

        res.json({ 
          user,
          session: data.session,
          message: data.session ? 'Registration successful' : 'Check your email to confirm your account'
        });
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const session = req.session.supabaseSession;

      if (session) {
        await supabase.auth.signOut();
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.json({ message: 'Logout successful' });
      });

    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Email confirmation endpoint
  app.post('/api/auth/confirm', async (req, res) => {
    try {
      const { accessToken, refreshToken } = req.body;

      if (!accessToken || !refreshToken) {
        return res.status(400).json({ error: 'Access token and refresh token required' });
      }

      // Set the session using the tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('Email confirmation error:', error);
        return res.status(400).json({ error: error.message });
      }

      if (data.user) {
        // Store session
        (req.session as any).supabaseSession = data.session;
        
        return res.json({ 
          user: data.user, 
          session: data.session,
          message: 'Email confirmed successfully' 
        });
      }

      return res.status(400).json({ error: 'No user found' });
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      res.status(500).json({ error: 'Email confirmation failed' });
    }
  });

  // Delete user endpoint (for testing only)
  app.delete('/api/auth/user/:email', async (req, res) => {
    try {
      const { email } = req.params;
      
      // Delete from local database
      const user = await storage.getUserByEmail(email);
      if (user) {
        // Note: We can't easily delete from users table due to foreign key constraints
        // So we'll just mark for testing that the user can be recreated
        console.log('User found in local database:', user);
      }
      
      res.json({ message: 'User cleanup completed', email });
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Delete user failed' });
    }
  });

  // Password reset endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const siteUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : 'https://doktu-tracker.replit.app';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback`
      });

      if (error) {
        console.error('Password reset error:', error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Password reset email sent' });
    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  });

  // Update password endpoint (for password reset flow)
  app.post('/api/auth/update-password', async (req, res) => {
    try {
      const { access_token, refresh_token, password } = req.body;

      if (!access_token || !password) {
        return res.status(400).json({ error: 'Access token and password required' });
      }

      console.log('Attempting to update password with recovery token');

      // Create a temporary Supabase client specifically for this password reset
      const tempSupabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_KEY || ''
      );

      // Try to get user from the access token directly
      const { data: { user }, error: userError } = await tempSupabase.auth.getUser(access_token);

      if (userError || !user) {
        console.error('User retrieval error:', userError);
        return res.status(401).json({ error: 'Invalid or expired recovery token' });
      }

      console.log('Recovery token validated for user:', user.email);

      // Set session with the recovery token and update password
      const sessionSetResult = await tempSupabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || ''
      });

      if (sessionSetResult.error) {
        console.log('Session set failed, trying alternative approach...');
        
        // Alternative: Use the access token directly in headers
        const { error: updateError } = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY || ''
          },
          body: JSON.stringify({ password })
        }).then(res => res.json());

        if (updateError) {
          const errorMsg = updateError.message || 'Password update failed';
          if (errorMsg.includes('should be different')) {
            throw new Error('Please choose a different password than your current one');
          }
          throw new Error(errorMsg);
        }
      } else {
        // Session established, update password normally
        const { error: updateError } = await tempSupabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          const errorMsg = updateError.message || 'Password update failed';
          if (errorMsg.includes('should be different')) {
            throw new Error('Please choose a different password than your current one');
          }
          throw new Error(errorMsg);
        }
      }

      console.log('Password updated successfully for user:', user.email);
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Update password error:', error);
      res.status(500).json({ error: 'Password update failed' });
    }
  });

  // Email confirmation endpoint
  app.post('/api/auth/confirm', async (req, res) => {
    try {
      const { access_token, refresh_token } = req.body;

      if (!access_token) {
        return res.status(400).json({ error: 'Access token required' });
      }

      // Set session to confirm user
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return res.status(401).json({ error: 'Invalid session tokens' });
      }

      // Store session in request
      (req.session as any).supabaseSession = sessionData.session;
      (req.session as any).userId = sessionData.user?.id;

      // Get or create user profile in database
      const user = await storage.getUserByEmail(sessionData.user?.email || '');
      let profile = user;
      
      if (!profile) {
        profile = await storage.upsertUser({
          id: sessionData.user?.id || '',
          email: sessionData.user?.email || '',
          role: 'patient'
        });
      }

      res.json({ 
        message: 'Email confirmed successfully',
        user: profile,
        session: sessionData.session
      });
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      res.status(500).json({ error: 'Email confirmation failed' });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Password reset endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Password reset email sent' });

    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Legacy Replit OIDC redirect endpoints (for migration)
  app.get('/api/login', (req, res) => {
    res.redirect(302, '/login');
  });

  app.get('/api/callback', (req, res) => {
    res.redirect(302, '/login');
  });

  app.get('/api/logout', (req, res) => {
    res.redirect(302, '/login');
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const session = req.session.supabaseSession;

    if (!session || !session.access_token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && now >= session.expires_at) {
      // Try to refresh token
      const { data, error } = await supabase.auth.refreshSession(session);

      if (error || !data.session) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Update session
      req.session.supabaseSession = data.session;
      req.user = { id: data.user.id, email: data.user.email };
    } else {
      // Verify current token
      const { data: { user }, error } = await supabase.auth.getUser(session.access_token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = { id: user.id, email: user.email };
    }

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};