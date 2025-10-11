/**
 * Authentication setup for test patient
 * Creates authenticated session via backend API
 */
import { test as setup } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';

// Test patient credentials (existing production user)
const TEST_PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'kalyos.officiel@gmail.com';
const TEST_PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'Test123456!';

const patientAuthFile = './playwright/.auth/patient.json';

setup('authenticate as test patient', async ({ page }) => {
  console.log('\n🔐 Authenticating test patient via API...');
  console.log(`Email: ${TEST_PATIENT_EMAIL}`);

  // Use the test auth endpoint via page context
  await page.goto(API_URL);
  const response = await page.request.post(`${API_URL}/api/test/auth`, {
    data: {
      email: TEST_PATIENT_EMAIL,
      password: TEST_PATIENT_PASSWORD
    }
  });

  if (response.ok()) {
    const data = await response.json();
    console.log('✅ Authenticated as test patient');
    console.log(`Session ID: ${data.sessionId}`);

    // Save authentication state
    await page.context().storageState({ path: patientAuthFile });
    console.log(`✅ Patient authentication state saved to ${patientAuthFile}`);
  } else {
    console.log(`❌ Authentication failed: ${response.status()}`);
    const body = await response.text();
    console.log(`Response: ${body}`);
    throw new Error(`Failed to authenticate patient: ${response.status()}`);
  }
});
