import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.log('❌ No Supabase key found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixJamesAuth() {
  try {
    console.log('🔧 Attempting to create Supabase auth for james.rodriguez@doktu.com');
    
    // Try to sign up the user in Supabase auth to match our database
    const { data, error } = await supabase.auth.signUp({
      email: 'james.rodriguez@doktu.com',
      password: 'Test123456!',
      options: {
        data: {
          first_name: 'James',
          last_name: 'Rodriguez',
          role: 'doctor'
        }
      }
    });
    
    if (error) {
      console.log('❌ Supabase signup error:', error.message);
      
      // If user already exists, that might be good news
      if (error.message.includes('already registered')) {
        console.log('✅ User already exists in Supabase - checking login...');
        
        // Try to login
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: 'james.rodriguez@doktu.com',
          password: 'Test123456!'
        });
        
        if (loginError) {
          console.log('❌ Login test failed:', loginError.message);
        } else {
          console.log('✅ Login test successful! User exists and password works');
          console.log('User ID:', loginData.user?.id);
          console.log('Email:', loginData.user?.email);
        }
      }
    } else {
      console.log('✅ Supabase signup successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email:', data.user?.email);
      console.log('Confirmation required:', !data.user?.email_confirmed_at);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixJamesAuth();
