
import { Router } from 'express';
import { supabase } from '../supabaseAuth';
import { notificationService, TriggerCode } from '../services/notificationService';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, preferredLanguage } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate and normalize locale (default to 'en' if not provided or invalid)
  const supportedLocales = ['en', 'bs'];
  const userLocale = preferredLanguage && supportedLocales.includes(preferredLanguage)
    ? preferredLanguage
    : 'en';

  console.log('🌍 Registration with detected language:', userLocale);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'patient'
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // Create user record in database
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        role: 'patient',
        email_verified: false
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
    }

    // Create notification preferences with user's detected language
    try {
      // Get the numeric user ID from the database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userData) {
        const { error: prefsError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userData.id,
            email_enabled: true,
            sms_enabled: false,
            push_enabled: false,
            marketing_emails_enabled: true,
            reminder_timing: { hours: [24, 2], minutes: [0, 0] },
            locale: userLocale, // Use detected language
            timezone: 'Europe/Paris'
          });

        if (prefsError) {
          console.error('Error creating notification preferences:', prefsError);
        } else {
          console.log(`✅ Created notification preferences with locale: ${userLocale}`);
        }
      }
    } catch (prefsError) {
      console.error('Error setting up notification preferences:', prefsError);
      // Don't fail registration if preferences creation fails
    }

    // Send welcome and verification emails via notification system
    try {
      // Get the created user record from our database to get the numeric ID
      let dbUser = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Sometimes there's a slight delay, so try a few times
      while (!dbUser && attempts < maxAttempts) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        
        dbUser = userData;
        if (!dbUser && attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        }
        attempts++;
      }

      if (dbUser) {
        // Send registration success notification via integrated system
        // Fixed: Use scheduleNotification instead of non-existent trigger method
        await notificationService.scheduleNotification({
          userId: parseInt(dbUser.id),
          triggerCode: TriggerCode.ACCOUNT_REG_SUCCESS,
          scheduledFor: new Date(), // Schedule immediately
          mergeData: {
            first_name: firstName,
            last_name: lastName,
            verification_link: `${process.env.CLIENT_URL || 'https://doktu.co'}/verify`
          }
        });
        
        console.log(`✅ Registration success email queued for user ${dbUser.id}`);
      } else {
        console.warn(`⚠️ Could not find database user record for ${email} to send welcome email`);
      }
    } catch (emailError) {
      console.error('❌ Error queueing welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // If session exists (email confirmation disabled), set it up
    if (data.session) {
      req.session.supabaseSession = data.session;

      res.cookie('sb-access-token', data.session.access_token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: true, // Required for sameSite: 'none'
        maxAge: data.session.expires_in * 1000
      });

      res.cookie('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: true, // Required for sameSite: 'none'
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    return res.json({ 
      user: {
        ...data.user,
        role: 'patient',
        email_verified: false
      },
      message: 'Account created successfully. Check your email to verify your address.'
    });

  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(401).json({ error: 'Failed to create session' });
    }

    // Store session in Express session
    req.session.supabaseSession = data.session;

    // Set HTTP-only cookies for additional security
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: true, // Required for sameSite: 'none'
      maxAge: data.session.expires_in * 1000
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: true, // Required for sameSite: 'none'
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Get user role and verification status from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email_verified')
      .eq('id', data.session.user.id)
      .single();

    const role = userData?.role || 'patient';
    const email_verified = userData?.email_verified || false;

    return res.json({
      user: {
        ...data.session.user,
        role,
        email_verified
      },
      role,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify - Email verification endpoint
authRouter.get('/verify', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Missing verification token');
  }

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token: token as string,
      type: 'email'
    });

    if (error) {
      return res.status(400).send('Invalid or expired verification token');
    }

    // Mark user as email verified in our database
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Error updating email verification status:', updateError);
    }

    // Redirect to dashboard with verification success flag
    const frontendUrl = process.env.CLIENT_URL || 'https://doktu.co';
    return res.redirect(`${frontendUrl}/dashboard?verified=1`);

  } catch (error: any) {
    console.error('Verification error:', error);
    return res.status(500).send('Verification failed');
  }
});

// POST /api/auth/resend-verification
authRouter.post('/resend-verification', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const email = session.user.email;
    
    // Generate new verification link
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'email_change_confirm_new',
      email
    });

    if (linkErr) {
      return res.status(500).json({ error: 'Failed to generate verification link' });
    }

    // Send verification email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY && linkData?.properties?.token) {
      try {
        await sendgrid.send({
          to: email,
          from: process.env.FROM_EMAIL || 'noreply@doktu.com',
          subject: 'Confirm your email for Doktu',
          html: `
            <p>Here's your new verification link for Doktu.</p>
            <p>Please confirm your email address by clicking 
            <a href="${process.env.CLIENT_URL || 'https://doktu.co'}/verify?token=${linkData.properties.token}">
            this link</a>.</p>
          `
        });
        
        return res.json({ message: 'Verification email sent successfully' });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        return res.status(500).json({ error: 'Failed to send verification email' });
      }
    }

    return res.json({ message: 'Verification link generated (email service not configured)' });

  } catch (error: any) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req, res) => {
  try {
    const session = req.session.supabaseSession;
    
    if (session) {
      await supabase.auth.signOut();
    }

    // Clear session and cookies
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');

    return res.json({ message: 'Logged out successfully' });

  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
