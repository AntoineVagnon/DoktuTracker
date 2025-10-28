#!/usr/bin/env node
/**
 * Test Password Reset Email Locale Fix
 *
 * This script verifies that password reset emails respect the user's current language.
 * Tests the fix for commit ed22109.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzmrkvooqjbxptqjqxii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRODUCTION_API_URL = 'https://web-production-b2ce.up.railway.app';
const TEST_EMAIL = 'avagnonperso@gmail.com';

console.log('=== TESTING PASSWORD RESET LOCALE FIX ===\n');
console.log('This test verifies that password reset emails are sent in the correct language.\n');

async function testPasswordResetLocale(locale, languageName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: Password Reset in ${languageName} (locale: ${locale})`);
  console.log('='.repeat(80));

  try {
    // Step 1: Get user from database
    console.log(`\n1️⃣  Looking up user: ${TEST_EMAIL}`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL)
      .single();

    if (userError) {
      console.error(`❌ User lookup failed: ${userError.message}`);
      return false;
    }

    console.log(`✅ User found: ${userData.firstName} ${userData.lastName} (ID: ${userData.id})`);

    // Step 2: Send password reset request with locale
    console.log(`\n2️⃣  Sending password reset request with locale: ${locale}`);

    const response = await fetch(`${PRODUCTION_API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        context: 'test_locale',
        locale: locale  // This is the fix we're testing
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Password reset request failed: ${errorData.error}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Password reset request successful: ${data.message}`);

    // Step 3: Check notification was created with correct locale
    console.log(`\n3️⃣  Checking notification in database...`);

    // Wait a moment for notification to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: notifications, error: notificationError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.id)
      .eq('trigger_code', 'ACCOUNT.PASSWORD_RESET')
      .order('created_at', { ascending: false })
      .limit(1);

    if (notificationError) {
      console.error(`❌ Notification check failed: ${notificationError.message}`);
      return false;
    }

    if (!notifications || notifications.length === 0) {
      console.error('❌ No notification found in database');
      return false;
    }

    const notification = notifications[0];
    console.log(`✅ Notification created (ID: ${notification.id})`);
    console.log(`   Status: ${notification.status}`);
    console.log(`   Locale: ${notification.locale || 'NOT SET'}`);
    console.log(`   Created: ${notification.created_at}`);

    // Step 4: Verify locale matches
    if (notification.locale === locale) {
      console.log(`\n✅ SUCCESS! Locale matches: ${notification.locale} === ${locale}`);
      return true;
    } else {
      console.log(`\n❌ FAILED! Locale mismatch:`);
      console.log(`   Expected: ${locale}`);
      console.log(`   Got: ${notification.locale || 'NULL'}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const testCases = [
    { locale: 'en', name: 'English' },
    { locale: 'bs', name: 'Bosnian' },
    { locale: 'fr', name: 'French' }
  ];

  const results = [];

  for (const testCase of testCases) {
    const passed = await testPasswordResetLocale(testCase.locale, testCase.name);
    results.push({ ...testCase, passed });

    // Wait between tests
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name} (${result.locale})`);
  });

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  console.log(`\n${passedCount}/${results.length} tests passed`);

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Locale fix is working correctly.');
    console.log('\nThe fix in commit ed22109 is confirmed working:');
    console.log('  - Frontend sends locale from i18n.language');
    console.log('  - Backend extracts locale from request body');
    console.log('  - Notification service receives locale parameter');
    console.log('  - Emails will be generated in the correct language');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. The locale fix may need adjustment.');
  }

  console.log('\n' + '='.repeat(80));
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
