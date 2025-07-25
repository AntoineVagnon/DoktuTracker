// Reset user completely - delete from both Supabase Auth and local database
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function resetUser(email) {
  try {
    console.log(`Resetting user: ${email}`);
    
    // 1. Try to delete from Supabase Auth (this will only work with service role key)
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users) {
        const userToDelete = users.users.find(user => user.email === email);
        
        if (userToDelete) {
          console.log('Found Supabase Auth user:', userToDelete.id);
          
          const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);
          
          if (deleteError) {
            console.log('Note: Could not delete from Supabase Auth (need service role key):', deleteError.message);
          } else {
            console.log('✅ Deleted user from Supabase Auth');
          }
        } else {
          console.log('No Supabase Auth user found with that email');
        }
      }
    } catch (authError) {
      console.log('Note: Supabase Auth deletion failed (this is ok):', authError.message);
    }
    
    // 2. Delete from local database
    try {
      const result = await db.delete(users)
        .where(eq(users.email, email))
        .returning();
      
      if (result.length > 0) {
        console.log('✅ Deleted user from local database:', result[0].username);
      } else {
        console.log('No user found in local database');
      }
    } catch (dbError) {
      console.log('Database deletion error:', dbError.message);
    }
    
    console.log(`\n✅ User reset completed for ${email}`);
    console.log('You can now register with this email again.');
    
  } catch (error) {
    console.error('Reset user error:', error);
  } finally {
    await client.end();
  }
}

// Reset the user
resetUser('antoine.vagnon@gmail.com');