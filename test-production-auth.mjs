import fetch from 'node-fetch';

console.log('\n🔍 TESTING PRODUCTION /api/auth/user ENDPOINT\n');
console.log('='.repeat(80));

// First, login to production
console.log('\n📝 Step 1: Logging in to production as james.rodriguez@doktu.com...\n');

const loginResponse = await fetch('https://web-production-b2ce.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'james.rodriguez@doktu.com',
    password: 'password123'
  })
});

const setCookieHeader = loginResponse.headers.get('set-cookie');
console.log('Login status:', loginResponse.status);

if (loginResponse.status !== 200) {
  console.error('❌ Login failed');
  const errorText = await loginResponse.text();
  console.error('Response:', errorText);
  process.exit(1);
}

console.log('✅ Login successful');
console.log('Session cookie:', setCookieHeader ? 'Received' : 'NOT RECEIVED');

// Now call /api/auth/user with the session cookie
console.log('\n📊 Step 2: Calling /api/auth/user with session cookie...\n');

const userResponse = await fetch('https://web-production-b2ce.up.railway.app/api/auth/user', {
  headers: {
    'Cookie': setCookieHeader.split(';')[0]
  }
});

console.log('User endpoint status:', userResponse.status);

if (userResponse.status === 200) {
  const userData = await userResponse.json();
  console.log('\n✅ User data received:\n');
  console.log(JSON.stringify(userData, null, 2));

  console.log('\n📋 Field Check:\n');
  console.log(`✓ id: ${userData.id ? '✅ Present' : '❌ Missing'}`);
  console.log(`✓ email: ${userData.email ? '✅ Present' : '❌ Missing'}`);
  console.log(`✓ role: ${userData.role ? `✅ Present (${userData.role})` : '❌ Missing'}`);
  console.log(`✓ doctorId: ${userData.doctorId !== undefined ? `✅ Present (${userData.doctorId})` : '❌ MISSING'}`);

  if (userData.role === 'doctor' && userData.doctorId === undefined) {
    console.log('\n❌ CRITICAL ISSUE: User has role="doctor" but doctorId is MISSING!');
    console.log('   This explains the "Error: Doctor ID not found" message.');
    console.log('\n🔧 This means the backend code change was NOT deployed or not working.');
  } else if (userData.role === 'doctor' && userData.doctorId) {
    console.log(`\n✅ SUCCESS: Doctor user has doctorId=${userData.doctorId}`);
    console.log('   The fix is working correctly!');
  }
} else {
  console.error('❌ Failed to fetch user data');
  const errorText = await userResponse.text();
  console.error('Response:', errorText);
}

console.log('\n' + '='.repeat(80));
