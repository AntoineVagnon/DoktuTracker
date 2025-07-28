import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDoctorsInAuth() {
  console.log('🔍 Checking doctors in Supabase Auth...');
  
  const doctorEmails = [
    'james.rodriguez@doktu.com',
    'sarah.johnson@doktu.com', 
    'lisa.martinez@doktu.com',
    'michael.thompson@doktu.com',
    'alexandra.dubois@doktu.com',
    'marie.prevost@doktu.com',
    'pierre.martin@doktu.com'
  ];
  
  for (const email of doctorEmails) {
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      const userExists = users.users.find(u => u.email === email);
      
      if (userExists) {
        console.log(`✅ ${email} exists in Supabase Auth`);
      } else {
        console.log(`❌ ${email} missing from Supabase Auth - creating...`);
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            role: 'doctor'
          }
        });
        
        if (createError) {
          console.error(`❌ Failed to create ${email}:`, createError.message);
        } else {
          console.log(`✅ Created ${email} in Supabase Auth`);
        }
      }
    } catch (error) {
      console.error(`Error checking ${email}:`, error.message);
    }
  }
}

checkDoctorsInAuth();