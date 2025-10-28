#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('=== DEBUGGING PASSWORD RESET FLOW ===\n');

try {
  // Check Supabase Auth config via API
  console.log('📋 Checking Supabase Auth Configuration...\n');

  // Test: Trigger a password reset for a test email
  const testEmail = 'avagnonperso@gmail.com';

  console.log(`🔄 Triggering password reset for: ${testEmail}`);
  console.log('This will show us what redirect URL Supabase is actually using...\n');

  const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: 'https://doktu.co/reset-password'
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Password reset email sent');
    console.log('📧 Check the email to see which URL it contains');
    console.log('   Expected: https://doktu.co/reset-password?token=...');
    console.log('   If wrong:  https://doktu-tracker.vercel.app/...');
  }

  console.log('\n=== TROUBLESHOOTING STEPS ===\n');
  console.log('1. Check Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/auth/url-configuration');
  console.log('');
  console.log('2. Verify these settings:');
  console.log('   Site URL: https://doktu.co');
  console.log('   Redirect URLs: https://doktu.co/**');
  console.log('');
  console.log('3. Check if there are Email Templates with hardcoded URLs:');
  console.log('   https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/auth/templates');
  console.log('');
  console.log('4. Look for this in the email template:');
  console.log('   {{ .ConfirmationURL }} - Should use Site URL');
  console.log('   If template has hardcoded URL, that overrides Site URL setting!');

} catch (error) {
  console.error('Error:', error);
}
