import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''
);

async function checkSettings() {
  try {
    // Get the current user to test
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log("Error fetching users:", error);
      return;
    }
    
    console.log("Total users in Supabase Auth:", users?.length || 0);
    
    // Find James's accounts
    const jamesAccounts = users?.filter(u => 
      u.email?.includes('james') || 
      u.email?.includes('doktu.co')
    );
    
    console.log("\n=== James's Supabase Auth Accounts ===");
    jamesAccounts?.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`  New Email: ${user.new_email || 'None'}`);
      console.log(`  Created: ${user.created_at}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("Error:", error);
  }
}

checkSettings();
