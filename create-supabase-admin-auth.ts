import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('This key is needed to create auth users programmatically.');
  console.log('You can find it in your Supabase project settings under API.');
  process.exit(1);
}

async function createSupabaseAdminAuth() {
  console.log('Creating Supabase Auth account for doktu@doktu.co...');
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Create the auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'doktu@doktu.co',
      password: 'Admin123456!',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        title: 'Admin',
        firstName: 'System',
        lastName: 'Administrator'
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('❌ Auth user already exists for doktu@doktu.co');
        console.log('Updating password instead...');
        
        // Update the existing user's password
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          data?.user?.id || '',
          { password: 'Admin123456!' }
        );
        
        if (updateError) {
          console.error('Error updating password:', updateError);
        } else {
          console.log('✅ Password updated successfully!');
        }
      } else {
        console.error('Error creating auth user:', error);
      }
      return;
    }
    
    console.log('✅ Supabase Auth account created successfully!');
    console.log('Email: doktu@doktu.co');
    console.log('Password: Admin123456!');
    console.log('Auth User ID:', data.user?.id);
    console.log('\nThe admin can now login with these credentials.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createSupabaseAdminAuth()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });