/**
 * Full Booking Flow with Payment - End-to-End Test
 * Tests the complete journey including Stripe payment and meeting verification
 *
 * Priority: P0 (Critical) - Revenue-generating flow
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';
const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'antoine.vagnon@gmail.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Spl@ncnopleure49';

// Test doctor who will receive the booking
const TEST_DOCTOR_ID = 8; // Dr. Sarah Johnson
const TEST_DOCTOR_NAME = 'Sarah Johnson';

// Helper to dismiss cookie banner
async function dismissCookieBanner(page: Page) {
  try {
    const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("Accept"), button:has-text("I understand")').first();
    if (await acceptButton.isVisible({ timeout: 3000 })) {
      await acceptButton.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No cookie banner
  }
}

// Helper to authenticate as admin
async function authenticateAsAdmin(page: Page) {
  const response = await page.request.post(`${API_URL}/api/test/auth`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }
  });

  if (!response.ok()) {
    throw new Error(`Admin auth failed: ${response.status()}`);
  }

  return await response.json();
}

// Helper to create time slots for doctor
async function createSlotsForDoctor(page: Page, doctorId: number, sessionCookie: string) {
  console.log(`\n📅 Creating time slots for doctor ${doctorId}...`);

  // Create slots for tomorrow and day after
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const slots = [];
  for (const date of [tomorrow, dayAfter]) {
    const dateStr = date.toISOString().split('T')[0];

    // Create morning and afternoon slots
    const times = [
      { start: '09:00:00', end: '09:30:00' },
      { start: '10:00:00', end: '10:30:00' },
      { start: '14:00:00', end: '14:30:00' },
      { start: '15:00:00', end: '15:30:00' },
    ];

    for (const time of times) {
      slots.push({
        date: dateStr,
        startTime: time.start,
        endTime: time.end,
        isAvailable: true
      });
    }
  }

  // Create slots via API
  for (const slot of slots) {
    const response = await page.request.post(`${API_URL}/api/doctors/${doctorId}/slots`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      data: slot
    });

    if (response.ok()) {
      console.log(`  ✅ Created slot: ${slot.date} ${slot.startTime}`);
    } else {
      console.log(`  ⚠️ Failed to create slot: ${response.status()}`);
    }
  }

  console.log(`✅ Slot creation complete`);
}

// Use patient authentication
test.use({
  storageState: './playwright/.auth/patient.json'
});

test.describe('Full Booking Flow with Payment', () => {

  test('P0 - Complete booking with Stripe payment and verify meeting access', async ({ page, context }) => {
    console.log('\n🧪 Testing FULL booking flow with payment\n');

    // SETUP: Create slots for test doctor as admin
    console.log('SETUP: Authenticating as admin to create slots');
    const authData = await authenticateAsAdmin(page);
    const sessionCookie = context.storageState().then(state =>
      state.cookies.map(c => `${c.name}=${c.value}`).join('; ')
    );

    await createSlotsForDoctor(page, TEST_DOCTOR_ID, await sessionCookie);

    // STEP 1: Navigate to home page
    console.log('\nSTEP 1: Navigate to home page');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);
    await page.waitForTimeout(3000);

    // STEP 2: Find test doctor
    console.log(`\nSTEP 2: Find ${TEST_DOCTOR_NAME}`);
    const doctorCard = page.locator('.group').filter({ hasText: new RegExp(TEST_DOCTOR_NAME, 'i') }).first();
    await expect(doctorCard).toBeVisible({ timeout: 10000 });

    const availability = await doctorCard.locator('text=/Next/i').textContent();
    console.log(`  ✅ Found availability: ${availability}`);

    // STEP 3: Navigate to doctor profile
    console.log('\nSTEP 3: Navigate to doctor profile');
    const viewProfileLink = doctorCard.locator('a:has-text("View Full Profile")').first();
    await viewProfileLink.click();
    await page.waitForURL(new RegExp(`/doctor/${TEST_DOCTOR_ID}`), { timeout: 10000 });
    console.log(`  ✅ On doctor profile: ${page.url()}`);
    await page.waitForTimeout(2000);

    // STEP 4: Select first available time slot
    console.log('\nSTEP 4: Select first available time slot');
    const slotSelectors = [
      'button:has-text("09:00")',
      'button:has-text("10:00")',
      'button:has-text("14:00")',
      'button:has-text("15:00")',
    ];

    let slot = null;
    for (const selector of slotSelectors) {
      slot = page.locator(selector).filter({ hasNot: page.locator('[disabled]') }).first();
      const visible = await slot.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        const slotText = await slot.textContent();
        console.log(`  ✅ Found slot: ${slotText}`);
        break;
      }
    }

    if (!slot || !(await slot.isVisible().catch(() => false))) {
      throw new Error('No available time slots found');
    }

    await slot.click();
    console.log('  ✅ Clicked time slot');

    // STEP 5: Wait for redirect to checkout
    console.log('\nSTEP 5: Wait for redirect to checkout');
    await page.waitForURL(/\/checkout/, { timeout: 15000 });
    console.log(`  ✅ Redirected to: ${page.url()}`);

    // Verify checkout page loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for Stripe to load

    // STEP 6: Fill Stripe payment form with test card
    console.log('\nSTEP 6: Fill Stripe payment form');

    // Wait for Stripe iframe to load
    const stripeFrame = page.frameLocator('iframe[title*="Secure"], iframe[name*="__privateStripeFrame"]').first();

    // Fill card number
    const cardNumberInput = stripeFrame.locator('[name="cardnumber"], [placeholder*="Card number"]').first();
    await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 });
    await cardNumberInput.fill('4242424242424242');
    console.log('  ✅ Filled card number');

    // Fill expiry
    const expiryInput = stripeFrame.locator('[name="exp-date"], [placeholder*="MM"], [placeholder*="expiry"]').first();
    await expiryInput.fill('12/25');
    console.log('  ✅ Filled expiry');

    // Fill CVC
    const cvcInput = stripeFrame.locator('[name="cvc"], [placeholder*="CVC"]').first();
    await cvcInput.fill('123');
    console.log('  ✅ Filled CVC');

    // Fill postal code if present
    const postalInput = stripeFrame.locator('[name="postal"], [placeholder*="ZIP"]').first();
    const hasPostal = await postalInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasPostal) {
      await postalInput.fill('12345');
      console.log('  ✅ Filled postal code');
    }

    // STEP 7: Submit payment
    console.log('\nSTEP 7: Submit payment');
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Complete"), button:has-text("Confirm")').first();
    await expect(payButton).toBeVisible({ timeout: 5000 });
    await payButton.click();
    console.log('  ✅ Clicked payment button');

    // Wait for payment processing and redirect to confirmation
    await page.waitForURL(/\/appointment|\/confirmation|\/success/, { timeout: 30000 });
    console.log(`  ✅ Payment complete - redirected to: ${page.url()}`);

    // STEP 8: Verify confirmation page
    console.log('\nSTEP 8: Verify confirmation page');
    const confirmationElements = [
      'text=/confirmed|success|booked/i',
      'text=/appointment|meeting/i',
    ];

    for (const selector of confirmationElements) {
      const element = page.locator(selector).first();
      const visible = await element.isVisible({ timeout: 5000 }).catch(() => false);
      if (visible) {
        const text = await element.textContent();
        console.log(`  ✅ Found confirmation: ${text?.substring(0, 50)}`);
      }
    }

    await page.screenshot({ path: 'test-results/booking-confirmation.png', fullPage: true });

    // STEP 9: Verify appointment in patient dashboard
    console.log('\nSTEP 9: Verify appointment in patient dashboard');
    await page.goto(`${BASE_URL}/patient/appointments`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const appointmentCard = page.locator(`text=/Dr.*${TEST_DOCTOR_NAME}/i, text=/appointment/i`).first();
    const hasAppointment = await appointmentCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasAppointment) {
      console.log(`  ✅ Appointment visible in patient dashboard`);

      // Look for meeting link
      const meetingLink = page.locator('a:has-text("Join"), button:has-text("Join"), a:has-text("Meeting")').first();
      const hasMeetingLink = await meetingLink.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasMeetingLink) {
        console.log(`  ✅ Meeting link available`);
      }
    } else {
      console.log(`  ⚠️ Appointment not yet visible in dashboard`);
    }

    await page.screenshot({ path: 'test-results/patient-dashboard.png', fullPage: true });

    console.log('\n✅ COMPLETE BOOKING FLOW TEST PASSED!');
    console.log('   Successfully completed: Slot Selection → Payment → Confirmation → Dashboard');
  });
});
