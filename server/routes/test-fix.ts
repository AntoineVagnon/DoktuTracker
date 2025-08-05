import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Special endpoint to fix test account email mismatches
router.post('/api/test/fix-email-mismatch', async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body;

    if (!currentEmail || !newEmail) {
      return res.status(400).json({ error: 'Both currentEmail and newEmail are required' });
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Delete the old test user and create a new one with matching email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const oldUser = users?.users.find(u => u.email === currentEmail);

    if (oldUser) {
      // Delete the old user
      await supabaseAdmin.auth.admin.deleteUser(oldUser.id);
      console.log('Deleted old test user:', currentEmail);
    }

    // Create new user with correct email
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: newEmail,
      password: 'Test123456!', // Default test password
      email_confirm: true, // Auto-confirm since it's a test account
      user_metadata: {
        role: 'patient'
      }
    });

    if (createError) {
      console.error('Error creating new user:', createError);
      return res.status(500).json({ error: 'Failed to create new test user' });
    }

    res.json({
      message: 'Test account fixed successfully!',
      credentials: {
        email: newEmail,
        password: 'Test123456!',
        note: 'Please change your password after logging in'
      }
    });

  } catch (error: any) {
    console.error('Test fix error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as testFixRouter };