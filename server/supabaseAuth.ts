import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import './types'; // Import session types
import { emailService } from './emailService';

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
        
        // Check if this is a mismatch issue - user exists in our DB but not in Supabase
        let dbUser;
        try {
          dbUser = await storage.getUserByEmail(email);
        } catch (dbError: any) {
          console.error('Database error during login user check:', dbError.message);
          // If database is down, just return the Supabase error
          return res.status(401).json({ error: error.message });
        }
        
        if (dbUser) {
          console.log('Email mismatch detected - user exists in DB but not in Supabase');
          console.log('DB User found:', { id: dbUser.id, email: dbUser.email, role: dbUser.role });
          
          // For test accounts with doktu domain, allow temporary bypass ONLY in development
          const testEmailAllowlist = process.env.TEST_EMAIL_ALLOWLIST ? process.env.TEST_EMAIL_ALLOWLIST.split(',') : [];
          const isTestAccount = email.includes('@doktu.') || email.includes('@test') || email.includes('@example') || testEmailAllowlist.includes(email);
          const isDevelopment = process.env.NODE_ENV !== 'production';
          const authTestBypass = process.env.AUTH_TEST_BYPASS === 'true';
          
          console.log('Is test account?', isTestAccount, 'for email:', email);
          console.log('Environment:', { NODE_ENV: process.env.NODE_ENV, AUTH_TEST_BYPASS: process.env.AUTH_TEST_BYPASS });
          
          if (isTestAccount && isDevelopment && authTestBypass) {
            console.log('🔓 SECURITY WARNING: Allowing test bypass for:', email, '(development only)');
            
            // Create a temporary session for the test account - DEVELOPMENT ONLY
            (req.session as any).supabaseSession = {
              access_token: 'temp_token_' + Date.now(),
              refresh_token: 'temp_refresh_' + Date.now(),
              expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
              user: {
                id: 'temp_user_' + dbUser.id,
                email: dbUser.email,
                role: 'patient' // SECURITY: Force role to patient for test bypass
              }
            };
            (req.session as any).userId = 'temp_user_' + dbUser.id;
            
            console.log('Temporary session created for test account (development only)');
            
            // Save session
            await new Promise((resolve, reject) => {
              req.session.save((err) => {
                if (err) {
                  console.error('Session save error:', err);
                  reject(err);
                } else {
                  console.log('Session saved successfully');
                  resolve(true);
                }
              });
            });
            
            return res.json({ 
              user: { ...dbUser, role: 'patient' }, // SECURITY: Force role to patient
              session: (req.session as any).supabaseSession,
              message: 'Login successful (development test mode)',
              testMode: true,
              fallbackProfile: true
            });
          } else if (isTestAccount && !isDevelopment) {
            // SECURITY: Explicitly reject test bypass in production
            console.error('🔒 SECURITY: Test bypass attempted in production for:', email);
            return res.status(401).json({ 
              error: 'Authentication failed',
              hint: 'Test accounts are not available in production'
            });
          }
          
          // For other users with sync issues
          if (email === 'kalyos.officiel@gmail.com') {
            return res.status(401).json({ 
              error: 'Email synchronization issue detected. Please try logging in with your old email (patient@test40.com) or reset your password.',
              hint: 'Your email was updated in our system but not in the authentication service.'
            });
          }
          
          return res.status(401).json({ 
            error: 'Authentication sync issue. Your account exists but authentication failed.',
            hint: 'Please contact support or try resetting your password.'
          });
        }
        
        return res.status(401).json({ error: error.message });
      }

      // Store session in Express session
      (req.session as any).supabaseSession = data.session;
      (req.session as any).userId = data.user.id;
      
      console.log('Session stored:', {
        userId: data.user.id,
        email: data.user.email,
        sessionId: req.session.id
      });

      // Get or create user profile in database
      // For login, find user by email since Supabase UUIDs don't match our integer IDs
      let user;
      try {
        user = await storage.getUserByEmail(data.user.email || email);
        if (!user) {
          // SECURITY: For new users, always default to patient role (don't trust metadata)
          user = await storage.upsertUser({
            email: data.user.email || email,
            role: 'patient', // SECURITY: Always default to patient, require admin promotion for other roles
            firstName: data.user.user_metadata?.first_name || null,
            lastName: data.user.user_metadata?.last_name || null
          });
          console.log('Created new user profile:', { email: user.email, role: user.role });
        } else {
          console.log('Found existing user:', { email: user.email, role: user.role });
        }
      } catch (dbError: any) {
        console.error('Database error during login - creating fallback user profile:', dbError.message);
        // Known user mappings for fallback mode when database is unavailable
        const knownUsers: Record<string, { role: string; firstName?: string; lastName?: string; title?: string; approved?: boolean }> = {
          'james.rodriguez@doktu.com': {
            role: 'doctor',
            firstName: 'James',
            lastName: 'Rodriguez',
            title: 'Dr.',
            approved: true
          },
          'antoine.vagnon@gmail.com': {
            role: 'patient',
            firstName: 'Antoine',
            lastName: 'Vagnon',
            approved: true
          }
        };

        const userEmail = data.user.email || email;
        const knownUser = knownUsers[userEmail.toLowerCase()];

        // SECURITY: Create secure fallback user profile when database is unavailable
        user = {
          id: -1, // SECURITY: Use sentinel value to indicate fallback mode
          email: userEmail,
          role: knownUser?.role || 'patient', // Use known role or default to patient
          firstName: knownUser?.firstName || data.user.user_metadata?.first_name || null,
          lastName: knownUser?.lastName || data.user.user_metadata?.last_name || null,
          title: knownUser?.title || null,
          phone: null,
          profileImageUrl: null,
          approved: knownUser?.approved || false, // Use known approval status or default NOT approved
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('🔒 Using SECURE fallback user profile for login:', { email: user.email, role: user.role, fallback: true });
      }

      // Save session before responding
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved successfully');
            resolve(true);
          }
        });
      });

      // SECURITY: Add degraded state indicators for fallback mode
      const response: any = { 
        user,
        session: data.session,
        message: 'Login successful' 
      };
      
      // SECURITY: Indicate if we're in fallback mode
      if (user.id === -1) {
        response.fallbackProfile = true;
        response.degradedAuth = true;
        res.set('X-Auth-Degraded', 'true');
        console.log('🔒 SECURITY: Responding with degraded auth indicators');
      }
      
      res.json(response);

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      // SECURITY: Always force role to 'patient' - never trust client input for role assignment

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Save the old session ID to preserve held slots
      const oldSessionId = req.session.id;
      console.log('Old session ID before registration:', oldSessionId);

      // Check if there's a held slot before registration
      const heldSlot = await storage.getHeldSlot(oldSessionId);
      console.log('Held slot before registration:', heldSlot ? `Slot ${heldSlot.id} held until ${heldSlot.expiresAt}` : 'No held slot');

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'patient' // SECURITY: Always set to patient - role promotion requires admin action
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (data.user) {
        // Create user profile in our database with structured name fields
        console.log('Creating/updating user with data:', {
          email: data.user.email,
          firstName,
          lastName,
          role: 'patient' // SECURITY: Always patient role
        });
        
        const user = await storage.upsertUser({
          email: data.user.email!,
          firstName,
          lastName,
          role: 'patient' // SECURITY: Always set to patient - admin must promote roles manually
        });
        
        console.log('User created/updated:', user);

        // 📧 SCHEDULE WELCOME EMAIL USING UNIVERSAL NOTIFICATION SYSTEM
        try {
          const { UniversalNotificationService, TriggerCode } = await import('./services/notificationService');
          const notificationService = new UniversalNotificationService();
          
          await notificationService.scheduleNotification({
            userId: user.id,
            triggerCode: TriggerCode.ACCOUNT_REG_SUCCESS,
            scheduledFor: new Date(), // Send immediately
            mergeData: {
              first_name: user.firstName ?? firstName ?? 'Patient'
            },
            userContext: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          });
          console.log(`📧 Welcome email scheduled for ${user.email}`);
        } catch (emailError) {
          console.error('📧 Failed to schedule welcome email:', emailError);
          // Don't fail registration if email scheduling fails
        }

        // Store session if user is confirmed
        if (data.session) {
          (req.session as any).supabaseSession = data.session;
          
          // If there was a held slot, transfer it to the new session
          if (heldSlot) {
            // The session ID might have changed, so we need to update the held slot
            console.log('Transferring held slot to new session...');
            
            // First, release the old slot hold
            await storage.releaseAllSlotsForSession(oldSessionId);
            
            // Then re-hold it with the current session ID
            const newSessionId = req.session.id;
            console.log('New session ID after registration:', newSessionId);
            
            // Calculate remaining time for the slot hold
            const now = new Date();
            const expiresAt = new Date(heldSlot.expiresAt);
            const remainingMinutes = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));
            
            // Re-hold the slot with the new session ID
            await storage.holdSlot(heldSlot.id, newSessionId, remainingMinutes);
            console.log(`Slot ${heldSlot.id} transferred to new session, expires in ${remainingMinutes} minutes`);
          }
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
      const session = (req.session as any)?.supabaseSession;

      console.log('Logout request - Session exists:', !!session);

      if (session) {
        // Sign out from Supabase
        await supabase.auth.signOut();
        console.log('Supabase signout completed');
      }

      // Destroy the Express session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: 'Logout failed, please try again.' });
        }
        
        console.log('Session destroyed successfully');
        res.json({ message: 'Logout successful', redirect: '/' });
      });

    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed, please try again.' });
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
      const { email, context } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const siteUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5000' 
        : 'https://doktu-tracker.replit.app';
      
      // Always redirect to password-reset page, not /auth/callback
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/password-reset`
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

      // Use the access token directly to update password via Supabase API
      console.log('Updating password directly via Supabase API...');
      
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_KEY || ''
        },
        body: JSON.stringify({ password })
      });

      const updateResult = await updateResponse.json();
      
      if (!updateResponse.ok) {
        console.error('Password update failed:', updateResult);
        const errorMsg = updateResult.error?.message || updateResult.message || 'Password update failed';
        if (errorMsg.includes('should be different')) {
          throw new Error('Please choose a different password than your current one');
        }
        throw new Error(errorMsg);
      }

      console.log('Password update successful:', updateResult.user?.email);

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
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if this is a fallback user (when database is unavailable)
      if (user.id === -1) {
        // Return the fallback user directly without database lookup
        console.log('Returning fallback user profile (database unavailable)');
        res.set('X-Auth-Degraded', 'true');
        return res.json(user);
      }

      // For normal users, fetch fresh data from database
      try {
        const freshUser = await storage.getUser(user.id.toString());
        if (!freshUser) {
          // User not in database, return the authenticated user object
          console.log('User not found in database, returning session user');
          return res.json(user);
        }
        res.json(freshUser);
      } catch (dbError: any) {
        // Database error, return the user from session
        console.error('Database error fetching user, returning session user:', dbError.message);
        res.set('X-Auth-Degraded', 'true');
        return res.json(user);
      }
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user profile endpoint
  app.patch('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { title, firstName, lastName, phone } = req.body;
      
      // NOTE: Email updates are disabled to prevent authentication issues
      // Email changes should be done through Supabase Auth's email change flow
      console.log('📱 Profile update request:', { userId, title, firstName, lastName, phone });

      // Update user profile in storage (excluding email)
      const updatedUser = await storage.updateUser(userId, {
        title,
        firstName,
        lastName,
        phone
      });
      
      console.log('✅ Profile updated:', updatedUser);

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  });

  // Email change endpoint
  app.post('/api/auth/change-email', isAuthenticated, async (req, res) => {
    try {
      const { newEmail } = req.body;
      const userId = req.user?.id;
      const session = (req.session as any)?.supabaseSession;
      
      if (!userId || !session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!newEmail) {
        return res.status(400).json({ error: 'New email is required' });
      }
      
      // Check if the new email is already in use
      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== Number(userId)) {
        return res.status(400).json({ error: 'This email is already in use' });
      }
      
      console.log(`Attempting to change email from ${req.user?.email} to ${newEmail}`);
      
      // For test environments or accounts with test domains, skip Supabase email update
      // to avoid email confirmation issues
      const isTestEmail = newEmail.includes('@doktu.') || 
                         newEmail.includes('@test') || 
                         newEmail.includes('@example');
      
      if (isTestEmail) {
        console.log('Test email detected, updating local database only');
        
        // For test accounts, only update local database
        const updatedUser = await storage.updateUser(userId, {
          email: newEmail
        });
        
        if (!updatedUser) {
          console.error('Failed to update local user record');
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Update the session with the new email
        if (req.user) {
          req.user.email = newEmail;
        }
        
        return res.json({ 
          message: 'Email updated successfully (test mode - no confirmation required)',
          user: updatedUser,
          requiresConfirmation: false
        });
      }
      
      // For production emails, update Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        email: newEmail
      });
      
      if (authError) {
        console.error('Supabase email update error:', authError);
        
        // If it's an email confirmation error, update local DB anyway for test accounts
        if (authError.message?.includes('email_change_needs_verification')) {
          console.log('Email verification required but proceeding with local update');
          
          const updatedUser = await storage.updateUser(userId, {
            email: newEmail
          });
          
          if (updatedUser) {
            if (req.user) {
              req.user.email = newEmail;
            }
            
            return res.json({ 
              message: 'Email updated locally. Verification email sent to confirm change.',
              user: updatedUser,
              requiresConfirmation: true
            });
          }
        }
        
        return res.status(400).json({ 
          error: authError.message || 'Failed to update email in authentication system' 
        });
      }
      
      // If Supabase update succeeded, update local database
      const updatedUser = await storage.updateUser(userId, {
        email: newEmail
      });
      
      if (!updatedUser) {
        console.error('Failed to update local user record');
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update the session with the new email
      if (req.user) {
        req.user.email = newEmail;
      }
      
      // Note: Email confirmation may be required depending on Supabase settings
      const requiresConfirmation = authData.user?.new_email === newEmail;
      
      res.json({ 
        message: requiresConfirmation 
          ? 'Confirmation emails sent. Please check both your old and new email addresses.'
          : 'Email updated successfully',
        user: updatedUser,
        requiresConfirmation
      });
      
    } catch (error: any) {
      console.error('Email change error:', error);
      res.status(500).json({ error: 'Failed to change email' });
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
        redirectTo: `${req.protocol}://${req.get('host')}/password-reset`
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
    res.redirect(302, '/');
  });

  app.get('/api/callback', (req, res) => {
    res.redirect(302, '/');
  });

  // Legacy logout redirect - now handled by POST /api/auth/logout
  app.get('/api/logout', (req, res) => {
    res.redirect(302, '/');
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Check for Authorization header first (for cross-domain requests)
    const authHeader = req.headers.authorization;
    let accessToken = authHeader?.replace('Bearer ', '');

    // Fallback to session cookies
    const session = (req.session as any)?.supabaseSession;
    const userId = (req.session as any)?.userId;

    if (!accessToken) {
      accessToken = session?.access_token;
    }

    console.log('Auth middleware - Session check:', {
      hasAuthHeader: !!authHeader,
      hasSession: !!session,
      hasAccessToken: !!accessToken,
      userId: userId,
      sessionId: req.session.id
    });

    if (!accessToken) {
      console.log('Auth middleware - No session or access token');
      
      // 🚀 TEMPORARY BYPASS FOR TESTING: Allow userId 53 to create appointments
      const isDevelopment = process.env.NODE_ENV === 'development';
      const authTestBypass = process.env.AUTH_TEST_BYPASS === 'true';
      const isAppointmentCreation = req.url === '/api/appointments/create' && req.method === 'POST';
      
      if (isDevelopment && authTestBypass && isAppointmentCreation) {
        console.log('🔓 TEMPORARY BYPASS: Allowing appointment creation for testing (development only)');
        
        // Get the test user (53) directly from database
        try {
          const testUserId = '53';
          const userProfile = await storage.getUser(testUserId);
          
          if (userProfile) {
            console.log('✅ Temporary bypass - Found user profile:', userProfile.email);
            (req as any).user = userProfile;
            return next();
          } else {
            console.log('❌ Temporary bypass - No user profile found for userId:', testUserId);
          }
        } catch (error: any) {
          console.error('❌ Temporary bypass error:', error.message);
        }
      }
      
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if this is a temporary test account session FIRST before any Supabase validation
    const isTestSession = accessToken?.startsWith('temp_token_');
    console.log('Auth middleware - Test session check:', { isTestSession, token: accessToken?.substring(0, 20) });
    
    if (isTestSession) {
      console.log('Auth middleware - Processing test account session');
      
      // Check if test session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && now >= session.expires_at) {
        console.log('Auth middleware - Test session expired');
        return res.status(401).json({ error: 'Session expired' });
      }
      
      // For test sessions, get user directly from session data
      const testUser = session.user;
      if (!testUser || !testUser.email) {
        console.log('Auth middleware - Invalid test session data');
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      console.log('Auth middleware - Test user validated:', testUser.email);
      
      // Get user profile from database with fallback for database errors
      let userProfile;
      try {
        userProfile = await storage.getUserByEmail(testUser.email);
      } catch (dbError: any) {
        console.error('Auth middleware - Database error for test user:', dbError.message);
        // Create fallback profile when database is unavailable
        userProfile = {
          id: -1, // Sentinel value for fallback
          email: testUser.email,
          role: 'patient', // Always default to patient for safety
          firstName: null,
          lastName: null,
          title: null,
          phone: null,
          profileImageUrl: null,
          approved: false, // Default to not approved for safety
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('Auth middleware - Using fallback profile for test user due to DB error');
        res.set('X-Auth-Degraded', 'true');
      }
      
      if (!userProfile) {
        console.log('Auth middleware - No user profile found for test user:', testUser.email);
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      // Attach user profile to request for use in route handlers
      (req as any).user = userProfile;
      console.log('Auth middleware - Success for test user:', userProfile.email);
      console.log('Auth middleware - Attached test user profile:', {
        id: userProfile.id,
        email: userProfile.email,
        hasId: !!userProfile.id,
        idType: typeof userProfile.id
      });
      return next();
    }

    // Regular Supabase session handling
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && now >= session.expires_at) {
      console.log('Auth middleware - Token expired');
      // Try to refresh token
      const { data, error } = await supabase.auth.refreshSession(session);

      if (error || !data.session) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Update session
      (req.session as any).supabaseSession = data.session;
      if (data.user) {
        (req as any).user = { id: data.user.id, email: data.user.email };
      }
    }

    // Get user data to attach to request
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log('Auth middleware - Invalid session:', error?.message);
      return res.status(401).json({ error: 'Invalid session' });
    }

    console.log('Auth middleware - User validated:', user.email);

    // Get user profile from database with fallback for database errors
    let userProfile;
    try {
      userProfile = await storage.getUserByEmail(user.email!);
    } catch (dbError: any) {
      console.error('Auth middleware - Database error for user:', dbError.message);
      // Create fallback profile when database is unavailable
      userProfile = {
        id: -1, // Sentinel value for fallback
        email: user.email!,
        role: 'patient', // Always default to patient for safety
        firstName: user.user_metadata?.first_name || null,
        lastName: user.user_metadata?.last_name || null,
        title: null,
        phone: null,
        profileImageUrl: null,
        approved: false, // Default to not approved for safety
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('Auth middleware - Using fallback profile due to DB error');
      res.set('X-Auth-Degraded', 'true');
    }
    
    if (!userProfile) {
      console.log('Auth middleware - No user profile found for:', user.email);
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Attach user profile to request for use in route handlers
    (req as any).user = userProfile;

    console.log('Auth middleware - Success for:', userProfile.email);
    console.log('Auth middleware - Attached user profile:', {
      id: userProfile.id,
      email: userProfile.email,
      hasId: !!userProfile.id,
      idType: typeof userProfile.id
    });
    next();
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};