
import { Router } from 'express';
import { supabase } from '../supabaseAuth';
import sendgrid from '@sendgrid/mail';

export const authRouter = Router();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

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

    // Generate verification link
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'email_change_confirm_new',
      email
    });

    // Send custom verification email if SendGrid is configured
    if (process.env.SENDGRID_API_KEY && linkData?.properties?.token) {
      try {
        await sendgrid.send({
          to: email,
          from: process.env.FROM_EMAIL || 'noreply@doktu.com',
          subject: 'Confirm your email for Doktu',
          html: `
            <p>Welcome to Doktu!</p>
            <p>Please confirm your email address by clicking 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify?token=${linkData.properties.token}">
            this link</a>.</p>
            <p>You can start using Doktu immediately, but you'll need to verify your email to book appointments.</p>
          `
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    // If session exists (email confirmation disabled), set it up
    if (data.session) {
      req.session.supabaseSession = data.session;

      res.cookie('sb-access-token', data.session.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: data.session.expires_in * 1000
      });

      res.cookie('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
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
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: data.session.expires_in * 1000
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      sameSite: 'lax', 
      secure: process.env.NODE_ENV === 'production',
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
      role
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
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
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify?token=${linkData.properties.token}">
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
