/**
 * Authentication setup for test doctor
 * Creates authenticated session via backend API
 */
import { test as setup } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';

// Test doctor credentials
const TEST_DOCTOR_EMAIL = 'test.doctor.1760200122865@doktu.co';
const TEST_DOCTOR_PASSWORD = 'SecurePassword123!';

const doctorAuthFile = './playwright/.auth/doctor.json';

setup('authenticate as test doctor', async ({ request }) => {
  console.log('\n🔐 Authenticating test doctor via API...');
  console.log(`Email: ${TEST_DOCTOR_EMAIL}`);

  // Use the test auth endpoint
  const response = await request.post(`${API_URL}/api/test/auth`, {
    data: {
      email: TEST_DOCTOR_EMAIL,
      password: TEST_DOCTOR_PASSWORD
    }
  });

  if (response.ok()) {
    const data = await response.json();
    console.log('✅ Authenticated as test doctor');
    console.log(`Session ID: ${data.sessionId}`);

    // Save cookies
    const context = request.storageState();
    console.log(`✅ Doctor authentication state saved`);
  } else {
    console.log(`❌ Authentication failed: ${response.status()}`);
    const body = await response.text();
    console.log(`Response: ${body}`);
    throw new Error(`Failed to authenticate doctor: ${response.status()}`);
  }
});
