import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.log('❌ No Supabase service key found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJamesAccount() {
  try {
    console.log('🔍 Checking Supabase Auth accounts for James...');
    
    // List all users to find James's accounts
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`📊 Total users in Supabase: ${users?.length || 0}`);
    
    // Find all accounts related to James
    const jamesAccounts = users?.filter(u => 
      u.email?.includes('james') || 
      u.email?.includes('doktu.co') ||
      u.email?.includes('doktu.com')
    );
    
    console.log('\n=== James-related Supabase accounts ===');
    jamesAccounts?.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   New Email: ${user.new_email || 'None'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // Check if we need to delete duplicate or fix email
    const doktuCoAccount = jamesAccounts?.find(u => u.email === 'james.rodriguez@doktu.co');
    const doktuComAccount = jamesAccounts?.find(u => u.email === 'james.rodriguez@doktu.com');
    
    if (doktuCoAccount && doktuComAccount) {
      console.log('🚨 Found both @doktu.co and @doktu.com accounts!');
      console.log('Need to remove one to avoid conflicts');
    } else if (doktuCoAccount && !doktuComAccount) {
      console.log('🔧 Found @doktu.co account, should update to @doktu.com');
    } else if (!doktuCoAccount && doktuComAccount) {
      console.log('✅ Only @doktu.com account exists - correct state');
    } else {
      console.log('❌ No James accounts found in Supabase');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkJamesAccount();
