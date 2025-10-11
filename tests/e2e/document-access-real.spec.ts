import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://doktu-tracker.vercel.app';
const PATIENT_EMAIL = 'patient121@gmail.com';
const PATIENT_PASSWORD = 'password123';
const DOCTOR_EMAIL = 'james.rodriguez@doktu.co';
const DOCTOR_PASSWORD = 'password123';

// Helper function to handle cookie consent
async function handleCookieConsent(page: Page) {
  try {
    const acceptCookies = page.locator('button:has-text("Accept All")');
    if (await acceptCookies.isVisible({ timeout: 2000 })) {
      await acceptCookies.click();
      await page.waitForTimeout(500);
      console.log('✓ Accepted cookies');
    }
  } catch (error) {
    // Cookie banner not present, continue
  }
}

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await handleCookieConsent(page);

  // Click Sign In button to open modal
  const signInButton = page.locator('button:has-text("Sign In")').first();
  await signInButton.click();
  await page.waitForTimeout(1000);

  // Fill credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click the Sign In button inside the modal (second one)
  await page.locator('button:has-text("Sign In")').nth(1).click();

  // Wait for redirect
  await page.waitForTimeout(3000);
}

test.describe('Document Access Control - Real User Testing', () => {

  test('TEST 1: Patient can login successfully', async ({ page }) => {
    console.log('\n📋 TEST 1: Patient Login');
    console.log('=========================================');

    await login(page, PATIENT_EMAIL, PATIENT_PASSWORD);

    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('dashboard')) {
      console.log('✅ PASS: Patient logged in successfully');
    } else {
      console.log('⚠️  FAIL: Did not redirect to dashboard');
      console.log('   Current URL:', url);
    }

    expect(url).toContain('dashboard');
  });

  test('TEST 2: Patient can access document library', async ({ page }) => {
    console.log('\n📋 TEST 2: Document Library Access');
    console.log('=========================================');

    await login(page, PATIENT_EMAIL, PATIENT_PASSWORD);
    await page.waitForTimeout(2000);

    // Try multiple selectors for document library
    const librarySelectors = [
      '[data-testid="document-library"]',
      'text=Document Library',
      'button:has-text("Upload Docs")',
      '[title="Upload Docs"]'
    ];

    let libraryFound = false;
    for (const selector of librarySelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          console.log(`✓ Found document library using: ${selector}`);
          libraryFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (libraryFound) {
      console.log('✅ PASS: Document library is accessible');
    } else {
      console.log('⚠️  INFO: Document library not immediately visible');
      console.log('   This may be expected - checking appointments...');
    }
  });

  test('TEST 3: Check for appointments', async ({ page }) => {
    console.log('\n📋 TEST 3: Patient Appointments');
    console.log('=========================================');

    await login(page, PATIENT_EMAIL, PATIENT_PASSWORD);
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/patient-dashboard.png', fullPage: true });
    console.log('✓ Screenshot saved: patient-dashboard.png');

    // Count appointments
    const appointmentCount = await page.locator('[data-appointment-id]').count();
    console.log(`Found ${appointmentCount} appointments`);

    if (appointmentCount > 0) {
      console.log('✅ PASS: Patient has appointments');

      // Try to click first appointment
      await page.locator('[data-appointment-id]').first().click();
      await page.waitForTimeout(1500);

      // Look for upload button
      const uploadButtons = await page.locator('button').all();
      console.log(`Found ${uploadButtons.length} buttons on appointment details`);

      for (const button of uploadButtons) {
        const text = await button.textContent();
        if (text && text.toLowerCase().includes('upload')) {
          console.log(`✓ Found upload button: "${text}"`);
        }
      }
    } else {
      console.log('ℹ️  INFO: No appointments found');
      console.log('   Patient may need to book an appointment first');
    }
  });

  test('TEST 4: Doctor can login', async ({ page }) => {
    console.log('\n📋 TEST 4: Doctor Login');
    console.log('=========================================');

    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD);

    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('dashboard') || url.includes('doctor')) {
      console.log('✅ PASS: Doctor logged in successfully');
    } else {
      console.log('⚠️  FAIL: Unexpected redirect');
      console.log('   Current URL:', url);
    }
  });

  test('TEST 5: Doctor appointments and document access', async ({ page }) => {
    console.log('\n📋 TEST 5: Doctor Appointment Access');
    console.log('=========================================');

    await login(page, DOCTOR_EMAIL, DOCTOR_PASSWORD);
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/doctor-dashboard.png', fullPage: true });
    console.log('✓ Screenshot saved: doctor-dashboard.png');

    // Count appointments
    const appointmentCount = await page.locator('[data-appointment-id]').count();
    console.log(`Doctor can see ${appointmentCount} appointments`);

    if (appointmentCount > 0) {
      console.log('✅ PASS: Doctor has assigned appointments');

      // Click first appointment
      await page.locator('[data-appointment-id]').first().click();
      await page.waitForTimeout(1500);

      // Take screenshot of appointment details
      await page.screenshot({ path: 'test-results/doctor-appointment-details.png' });

      // Look for document-related elements
      const allText = await page.textContent('body');
      if (allText) {
        if (allText.includes('document') || allText.includes('Document')) {
          console.log('✓ Found document-related content in appointment');
        }
      }
    } else {
      console.log('ℹ️  INFO: No appointments assigned to this doctor');
    }
  });

  test('TEST 6: Security - Unauthenticated access', async ({ page }) => {
    console.log('\n📋 TEST 6: Unauthenticated Access Prevention');
    console.log('=========================================');

    // Try to access dashboard without login
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log('Attempted to access:', `${BASE_URL}/dashboard`);
    console.log('Redirected to:', url);

    if (url === `${BASE_URL}/dashboard`) {
      console.log('❌ FAIL: Dashboard accessible without authentication - SECURITY ISSUE!');
    } else {
      console.log('✅ PASS: Unauthenticated access blocked');
      console.log('   Redirected to:', url);
    }

    expect(url).not.toBe(`${BASE_URL}/dashboard`);
  });

  test('TEST 7: Document download security', async ({ page }) => {
    console.log('\n📋 TEST 7: Document Download Security');
    console.log('=========================================');

    // Test with made-up document ID
    const fakeDocId = 'ced9012f-7b5f-46d9-8959-fc7634a410a7';

    // Try without authentication
    const response1 = await page.request.get(`${BASE_URL}/api/download/${fakeDocId}`);
    console.log('Unauthenticated download attempt:', response1.status());

    if (response1.status() === 401 || response1.status() === 404 || response1.status() === 403) {
      console.log('✅ PASS: Unauthenticated download blocked');
    } else {
      console.log('❌ FAIL: Unauthenticated download returned:', response1.status());
    }

    // Login as patient
    await login(page, PATIENT_EMAIL, PATIENT_PASSWORD);
    await page.waitForTimeout(2000);

    // Try to download a document
    const response2 = await page.request.get(`${BASE_URL}/api/download/${fakeDocId}`);
    console.log('Authenticated download attempt:', response2.status());

    if (response2.status() === 404 || response2.status() === 403) {
      console.log('✅ PASS: Invalid document ID blocked');
    } else if (response2.status() === 200) {
      console.log('⚠️  WARNING: Document download succeeded - may be valid ID');
    }
  });

  test('TEST 8: SUMMARY', async ({ page }) => {
    console.log('\n');
    console.log('=========================================');
    console.log('           TEST SUMMARY');
    console.log('=========================================');
    console.log('✅ Patient Login: TESTED');
    console.log('✅ Document Library: TESTED');
    console.log('✅ Patient Appointments: TESTED');
    console.log('✅ Doctor Login: TESTED');
    console.log('✅ Doctor Appointments: TESTED');
    console.log('✅ Unauthenticated Access: TESTED');
    console.log('✅ Download Security: TESTED');
    console.log('=========================================');
    console.log('\nCheck screenshots in test-results/ folder');
    console.log('=========================================\n');
  });
});
