import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
  try {
    console.log('🔧 Attempting password reset for james.rodriguez@doktu.com');
    
    const { error } = await supabase.auth.resetPasswordForEmail('james.rodriguez@doktu.com', {
      redirectTo: 'https://localhost:3000/reset-password'
    });
    
    if (error) {
      console.log('❌ Password reset error:', error.message);
    } else {
      console.log('✅ Password reset email sent (but email is test domain)');
      console.log('Since this is a test email, the reset won\'t work through email');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();
