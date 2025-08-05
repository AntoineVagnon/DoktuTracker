import { createClient } from '@supabase/supabase-js';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

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
    // First check if user exists in Supabase Auth
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.find(u => u.email === 'doktu@doktu.co');
    
    let authUserId;
    
    if (existingAuthUser) {
      console.log('❌ Auth user already exists for doktu@doktu.co');
      console.log('Updating password instead...');
      
      // Update the existing user's password
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: 'Admin123456!',
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            title: 'Admin',
            firstName: 'System',
            lastName: 'Administrator'
          }
        }
      );
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        return;
      } else {
        console.log('✅ Password updated successfully!');
        authUserId = existingAuthUser.id;
      }
    } else {
      // Create new auth user
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
        console.error('Error creating auth user:', error);
        return;
      }
      
      console.log('✅ Supabase Auth account created successfully!');
      authUserId = data.user?.id;
    }
    
    // Now update the database user record
    const existingDbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'doktu@doktu.co'))
      .limit(1);
    
    if (existingDbUser.length > 0) {
      // Update existing user to admin role
      await db
        .update(users)
        .set({
          role: 'admin',
          approved: true,
          title: 'Admin',
          firstName: 'System',
          lastName: 'Administrator',
          updatedAt: new Date()
        })
        .where(eq(users.email, 'doktu@doktu.co'));
      console.log('✅ Database user updated to admin role');
    } else {
      console.log('❌ No database user found for doktu@doktu.co');
      console.log('User must exist in database first!');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Account Ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: doktu@doktu.co');
    console.log('Password: Admin123456!');
    console.log('Role: admin');
    console.log('Auth User ID:', authUserId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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