/**
 * MANUAL REGISTRATION TEST - Verify Supabase Fix
 *
 * Run this after rate limiting has reset (1 hour) or server restart
 *
 * Usage: node tests/manual-registration-test.js
 */

const API_BASE_URL = 'http://localhost:5000';

async function testRegistration() {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);

  const testEmail = `manual.test.${timestamp}.${randomId}@doktu.test`;
  const licenseNumber = `MANUAL-${timestamp}-${randomId.toUpperCase()}`;

  console.log('\n==================================================');
  console.log('🧪 MANUAL DOCTOR REGISTRATION TEST');
  console.log('==================================================\n');
  console.log('📧 Email:', testEmail);
  console.log('📋 License:', licenseNumber);
  console.log('🌍 Country: Germany (DE)');
  console.log('\n--------------------------------------------------\n');

  const payload = {
    email: testEmail,
    password: 'SecurePass123!',
    firstName: 'Manual',
    lastName: 'TestDoctor',
    specialty: 'Cardiology',
    licenseNumber: licenseNumber,
    licenseCountry: 'DE',
    phone: '+4912345678',
    bio: 'Manual test doctor'
  };

  try {
    console.log('📤 Sending registration request...\n');

    const response = await fetch(`${API_BASE_URL}/api/doctor-registration/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const body = await response.json();

    console.log('📊 RESPONSE STATUS:', status);
    console.log('━'.repeat(50));

    if (status === 201) {
      console.log('✅ SUCCESS - Registration created!\n');
      console.log('📦 Response Data:');
      console.log(JSON.stringify(body, null, 2));
      console.log('\n✅✅✅ SUPABASE FIX VERIFIED - NO 401 ERROR! ✅✅✅\n');
      console.log('Details:');
      console.log('  • User ID:', body.data?.userId);
      console.log('  • Doctor ID:', body.data?.doctorId);
      console.log('  • Status:', body.data?.status);
      console.log('  • Email:', body.data?.email);
      return true;
    } else if (status === 429) {
      console.log('⚠️  RATE LIMITED - Too many attempts\n');
      console.log('📦 Response:');
      console.log(JSON.stringify(body, null, 2));
      console.log('\n⏳ Wait 1 hour or restart server to reset rate limit\n');
      return null; // Neutral result
    } else if (status === 401) {
      console.log('❌ FAILURE - 401 Unauthorized!\n');
      console.log('📦 Response:');
      console.log(JSON.stringify(body, null, 2));
      console.log('\n❌❌❌ SUPABASE FIX NOT WORKING ❌❌❌\n');
      return false;
    } else {
      console.log(`⚠️  UNEXPECTED STATUS: ${status}\n`);
      console.log('📦 Response:');
      console.log(JSON.stringify(body, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
    return false;
  }
}

// Run the test
testRegistration().then(result => {
  console.log('\n==================================================');
  if (result === true) {
    console.log('✅ TEST PASSED - Supabase authentication working!');
    process.exit(0);
  } else if (result === null) {
    console.log('⏳ TEST BLOCKED - Rate limiting active');
    process.exit(2);
  } else {
    console.log('❌ TEST FAILED - Check configuration');
    process.exit(1);
  }
  console.log('==================================================\n');
});
