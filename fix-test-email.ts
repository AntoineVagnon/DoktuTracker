const { createClient } = require('@supabase/supabase-js');
const { db } = require('./server/db');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTestEmailMismatch() {
  try {
    console.log('Starting email mismatch fix for test account...');

    // Find the user in our database
    const dbUser = await db.select().from(users).where(eq(users.email, 'kalyos.officiel@gmail.com')).limit(1);
    
    if (!dbUser || dbUser.length === 0) {
      console.error('User not found in database');
      return;
    }

    const user = dbUser[0];
    console.log('Found user in database:', { id: user.id, email: user.email });

    // List all users in Supabase to find the test account
    const { data: supabaseUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing Supabase users:', listError);
      return;
    }

    // Find user with old email
    const supabaseUser = supabaseUsers.users.find(u => u.email === 'patient@test40.com');
    
    if (!supabaseUser) {
      console.error('User with old email not found in Supabase');
      
      // Try to create a new auth user with the correct email
      console.log('Creating new Supabase auth user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'kalyos.officiel@gmail.com',
        password: 'Test123456!', // Temporary password
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (createError) {
        console.error('Error creating new user:', createError);
        return;
      }

      console.log('New Supabase user created successfully');
      console.log('You can now login with:');
      console.log('Email: kalyos.officiel@gmail.com');
      console.log('Password: Test123456!');
      console.log('Please change your password after logging in.');
      
      return;
    }

    console.log('Found Supabase user with old email:', supabaseUser.email);

    // Update the email in Supabase
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      supabaseUser.id,
      {
        email: 'kalyos.officiel@gmail.com',
        email_confirm: true // Mark as confirmed since it's a test account
      }
    );

    if (updateError) {
      console.error('Error updating Supabase user:', updateError);
      
      // If update fails, delete old and create new
      console.log('Attempting to delete old user and create new one...');
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id);
      if (deleteError) {
        console.error('Error deleting old user:', deleteError);
        return;
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'kalyos.officiel@gmail.com',
        password: 'Test123456!', // Temporary password
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (createError) {
        console.error('Error creating new user:', createError);
        return;
      }

      console.log('Successfully recreated user with correct email');
      console.log('You can now login with:');
      console.log('Email: kalyos.officiel@gmail.com');
      console.log('Password: Test123456!');
      return;
    }

    console.log('Successfully updated email in Supabase!');
    console.log('The email is now synchronized between database and Supabase.');
    console.log('You should be able to login with kalyos.officiel@gmail.com');

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixTestEmailMismatch();