
import { Router } from 'express';
import { supabase } from '../supabaseAuth';

export const authRouter = Router();

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

    // Get user role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.session.user.id)
      .single();

    const role = userData?.role || 'patient';

    return res.json({ 
      user: {
        ...data.session.user,
        role
      },
      role
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
        role: 'patient'
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
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
        role: 'patient'
      },
      message: 'Account created successfully'
    });

  } catch (error: any) {
    console.error('Register error:', error);
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
