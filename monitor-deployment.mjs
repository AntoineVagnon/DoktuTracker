import fetch from 'node-fetch';

console.log('\n🔍 MONITORING PRODUCTION API FOR doctorId FIELD\n');
console.log('='.repeat(80));
console.log('Checking every 10 seconds until doctorId appears...\n');

let checkCount = 0;
const maxChecks = 60; // 10 minutes max

async function checkDeployment() {
  checkCount++;

  try {
    // Login
    const loginResponse = await fetch('https://web-production-b2ce.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'james.rodriguez@doktu.com',
        password: 'password123'
      })
    });

    if (loginResponse.status !== 200) {
      console.log(`[${new Date().toLocaleTimeString()}] Check #${checkCount}: Login failed (${loginResponse.status})`);
      return false;
    }

    const setCookieHeader = loginResponse.headers.get('set-cookie');

    // Check /api/auth/user
    const userResponse = await fetch('https://web-production-b2ce.up.railway.app/api/auth/user', {
      headers: { 'Cookie': setCookieHeader.split(';')[0] }
    });

    if (userResponse.status !== 200) {
      console.log(`[${new Date().toLocaleTimeString()}] Check #${checkCount}: User endpoint failed (${userResponse.status})`);
      return false;
    }

    const userData = await userResponse.json();

    if (userData.doctorId !== undefined) {
      console.log('\n' + '='.repeat(80));
      console.log('✅ SUCCESS! doctorId field is now present in production API!');
      console.log('='.repeat(80));
      console.log('\nUser data:');
      console.log(JSON.stringify(userData, null, 2));
      console.log(`\n✅ doctorId: ${userData.doctorId}`);
      console.log(`\nDeployment completed after ${checkCount} checks.`);
      console.log('='.repeat(80));
      return true;
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Check #${checkCount}: doctorId still missing ❌`);
      return false;
    }
  } catch (error) {
    console.log(`[${new Date().toLocaleTimeString()}] Check #${checkCount}: Error - ${error.message}`);
    return false;
  }
}

// Run checks
async function monitor() {
  while (checkCount < maxChecks) {
    const success = await checkDeployment();

    if (success) {
      process.exit(0);
    }

    if (checkCount >= maxChecks) {
      console.log('\n❌ Max checks reached. Deployment may have failed or is taking longer than expected.');
      console.log('Please check Railway logs manually.');
      process.exit(1);
    }

    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

monitor();
