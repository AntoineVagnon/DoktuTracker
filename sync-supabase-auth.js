#!/usr/bin/env node

/**
 * Sync script to align Supabase Auth with users table
 * Creates Supabase Auth entries for users that exist in the database but not in Auth
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './shared/schema.ts';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize Supabase client with service role key (can create users)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize database connection
const queryClient = postgres(databaseUrl);
const db = drizzle(queryClient);

async function syncUsersToSupabaseAuth() {
  try {
    console.log('🔄 Starting Supabase Auth sync...');
    
    // Get all users from the database
    const dbUsers = await db.select().from(users);
    console.log(`📊 Found ${dbUsers.length} users in database`);
    
    // Get existing users from Supabase Auth
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to fetch Supabase Auth users: ${listError.message}`);
    }
    
    console.log(`🔐 Found ${authUsers.users.length} users in Supabase Auth`);
    
    // Create a Set of existing auth user emails for quick lookup
    const authUserEmails = new Set(authUsers.users.map(user => user.email));
    
    // Find users that exist in DB but not in Auth
    const missingUsers = dbUsers.filter(user => user.email && !authUserEmails.has(user.email));
    
    if (missingUsers.length === 0) {
      console.log('✅ All database users already exist in Supabase Auth');
      return;
    }
    
    console.log(`🔧 Creating ${missingUsers.length} missing Supabase Auth entries...`);
    
    for (const user of missingUsers) {
      try {
        console.log(`Creating auth entry for: ${user.email} (${user.role})`);
        
        // Create user in Supabase Auth
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'password123', // Default password
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            role: user.role,
            title: user.title,
            firstName: user.firstName,
            lastName: user.lastName,
            database_id: user.id
          }
        });
        
        if (createError) {
          console.error(`❌ Failed to create auth entry for ${user.email}:`, createError.message);
          continue;
        }
        
        console.log(`✅ Created auth entry for ${user.email} with ID: ${newUser.user.id}`);
        
      } catch (error) {
        console.error(`❌ Error creating auth entry for ${user.email}:`, error.message);
      }
    }
    
    console.log('🎉 Supabase Auth sync completed!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

// Run the sync
syncUsersToSupabaseAuth();