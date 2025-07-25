// Delete user from Supabase Auth
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser() {
  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }
    
    const userToDelete = users.users.find(user => user.email === 'antoine.vagnon@gmail.com');
    
    if (userToDelete) {
      console.log('Found user to delete:', userToDelete.id);
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);
      
      if (deleteError) {
        console.error('Error deleting user:', deleteError);
      } else {
        console.log('Successfully deleted user from Supabase Auth');
      }
    } else {
      console.log('No user found with email antoine.vagnon@gmail.com');
    }
    
  } catch (error) {
    console.error('Delete user error:', error);
  }
}

deleteUser();