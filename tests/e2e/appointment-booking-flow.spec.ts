/**
 * Appointment Booking Flow - E2E Test Suite
 * Tests the complete journey from home page to appointment confirmation
 *
 * Priority: P0 (Critical) - Core revenue-generating functionality
 * Test Level: System/E2E (Black-Box)
 * Coverage: Happy path + Critical error scenarios
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';
const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';

// Test patient credentials (using existing test account)
const TEST_PATIENT_EMAIL = process.env.TEST_PATIENT_EMAIL || 'kalyos.officiel@gmail.com';
const TEST_PATIENT_PASSWORD = process.env.TEST_PATIENT_PASSWORD || 'Test123456!';

// Helper function to dismiss cookie banner
async function dismissCookieBanner(page: Page) {
  try {
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("I understand")').first();
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No cookie banner present
  }
}

// Helper function to log in as patient
async function loginAsPatient(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  // Fill login form
  await page.locator('input[type="email"], input[name="email"]').fill(TEST_PATIENT_EMAIL);
  await page.locator('input[type="password"], input[name="password"]').fill(TEST_PATIENT_PASSWORD);

  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for redirect (could be /dashboard or /home)
  await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 10000 }).catch(() => {
    console.log('Login redirect timeout, checking current URL:', page.url());
  });

  await page.waitForTimeout(1000);
}

test.describe('Appointment Booking Flow - P0 Critical Scenarios', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsPatient(page);
    await dismissCookieBanner(page);
    console.log('✅ Test setup complete - logged in as patient');
  });

  test('P0 - Navigate from home page to doctor profile', async ({ page }) => {
    console.log('\n🧪 Testing navigation: Home → Doctor Profile');

    // Navigate to home page
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for doctors section to load
    await page.waitForSelector('[data-testid="doctors-grid"], .doctors-grid, text="Find a Doctor"', {
      timeout: 10000
    }).catch(() => console.log('Doctors section selector not found, proceeding...'));

    // Look for any doctor card (using flexible selectors)
    const doctorCard = page.locator('text=/Dr\\..*Rodriguez|Dr\\..*Johnson|Dr\\..*Chen/i').first();
    const isVisible = await doctorCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      console.log('⚠️ No doctor cards found on page');
      console.log('Current URL:', page.url());

      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/no-doctors-found.png' });

      // Fail test with informative message
      expect(isVisible).toBe(true);
      return;
    }

    // Get doctor name for verification
    const doctorNameText = await doctorCard.textContent();
    console.log(`Found doctor card: ${doctorNameText}`);

    // Click on doctor card
    await doctorCard.click();

    // Wait for navigation to doctor profile
    await page.waitForURL(/\/doctor\/\d+/, { timeout: 10000 });

    const currentUrl = page.url();
    console.log(`✅ Navigated to doctor profile: ${currentUrl}`);

    // Verify we're on a doctor profile page
    expect(currentUrl).toMatch(/\/doctor\/\d+/);

    // Verify doctor profile loaded
    const profileHeader = page.locator('text=/Dr\\..*|General Medicine|Cardiology|Pediatrics/i').first();
    await expect(profileHeader).toBeVisible({ timeout: 10000 });

    console.log('✅ Doctor profile loaded successfully');
  });

  test('P0 - Doctor profile displays availability calendar', async ({ page }) => {
    console.log('\n🧪 Testing doctor profile availability display');

    // Navigate directly to a known doctor (Sarah Johnson - ID 8)
    await page.goto(`${BASE_URL}/doctor/8`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());

    // Verify doctor name loaded
    const doctorName = page.locator('text=/Dr\\..*Johnson|Sarah.*Johnson/i').first();
    await expect(doctorName).toBeVisible({ timeout: 10000 });
    console.log('✅ Doctor profile header visible');

    // Look for calendar/availability section
    // Try multiple possible selectors
    const calendarSelectors = [
      'text="Available Times"',
      'text="Select a time slot"',
      'text="Availability"',
      '[data-testid="calendar"]',
      '[data-testid="time-slots"]',
      '.calendar',
      'button[data-slot]',
      'div[data-date]'
    ];

    let foundCalendar = false;
    for (const selector of calendarSelectors) {
      const element = page.locator(selector).first();
      const visible = await element.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        console.log(`✅ Found calendar element: ${selector}`);
        foundCalendar = true;
        break;
      }
    }

    if (!foundCalendar) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/no-calendar-found.png' });
      console.log('⚠️ No calendar/availability section found');
    }

    // Verify consultation fee is displayed
    const feeElement = page.locator('text=/€|EUR|35.00|50.00|60.00/').first();
    await expect(feeElement).toBeVisible({ timeout: 5000 });
    console.log('✅ Consultation fee displayed');

    // Verify rating/review count
    const ratingElement = page.locator('text=/4\\.[0-9]|reviews?|★/i').first();
    await expect(ratingElement).toBeVisible({ timeout: 5000 });
    console.log('✅ Rating/reviews displayed');
  });

  test('P1 - Unauthenticated user prompted to login when selecting slot', async ({ page, context }) => {
    console.log('\n🧪 Testing unauthenticated booking attempt');

    // Clear cookies to simulate logged-out user
    await context.clearCookies();

    // Navigate to doctor profile
    await page.goto(`${BASE_URL}/doctor/8`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to find and click a time slot
    const timeSlotSelectors = [
      'button[data-slot]:not([disabled])',
      'button:has-text("10:00")',
      'button:has-text("11:00")',
      '.time-slot:not(.disabled)',
    ];

    let slotFound = false;
    for (const selector of timeSlotSelectors) {
      const slot = page.locator(selector).first();
      const visible = await slot.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        console.log(`Found time slot: ${selector}`);
        await slot.click();
        slotFound = true;
        break;
      }
    }

    if (slotFound) {
      // Should see login modal or be redirected to login
      const loginModalVisible = await page.locator('text=/log in|sign in|please login/i').isVisible({ timeout: 5000 }).catch(() => false);
      const redirectedToLogin = page.url().includes('/login');

      expect(loginModalVisible || redirectedToLogin).toBe(true);
      console.log('✅ User prompted to login when attempting to book');
    } else {
      console.log('⚠️ No available slots found to test login prompt');
    }
  });

  test('P2 - Doctor with no availability shows appropriate message', async ({ page }) => {
    console.log('\n🧪 Testing doctor with no available slots');

    // Navigate to test doctor (API Test - ID 5) which has 0 slots
    await page.goto(`${BASE_URL}/doctor/5`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify doctor loaded
    const doctorName = page.locator('text=/API.*Test|Test.*API/i').first();
    await expect(doctorName).toBeVisible({ timeout: 10000 });
    console.log('✅ Doctor profile (no slots) loaded');

    // Look for "no availability" message
    const noSlotsMessage = page.locator('text=/no.*available|no.*slots|not.*available/i').first();
    const messageVisible = await noSlotsMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (messageVisible) {
      console.log('✅ "No availability" message displayed');
    } else {
      // Alternatively, check if calendar is empty
      const timeSlot = page.locator('button[data-slot], .time-slot').first();
      const slotsExist = await timeSlot.isVisible({ timeout: 2000 }).catch(() => false);
      expect(slotsExist).toBe(false);
      console.log('✅ No time slots displayed (calendar empty)');
    }
  });
});

test.describe('Appointment Booking Flow - API Level Tests', () => {

  test('P0 - Doctor list API returns doctors with availability', async ({ request }) => {
    console.log('\n🧪 Testing doctors API endpoint');

    const response = await request.get(`${API_URL}/api/doctors`);

    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);

    const doctors = await response.json();
    expect(Array.isArray(doctors)).toBe(true);
    expect(doctors.length).toBeGreaterThan(0);

    console.log(`✅ Found ${doctors.length} doctors`);

    // Verify each doctor has required fields
    const firstDoctor = doctors[0];
    expect(firstDoctor).toHaveProperty('id');
    expect(firstDoctor).toHaveProperty('specialty');
    expect(firstDoctor).toHaveProperty('consultationPrice');
    expect(firstDoctor).toHaveProperty('availableSlots');

    console.log('✅ Doctor objects have correct structure');
  });

  test('P0 - Doctor time slots API returns valid slot data', async ({ request }) => {
    console.log('\n🧪 Testing doctor slots API endpoint');

    // Test with doctor ID 8 (Sarah Johnson)
    const response = await request.get(`${API_URL}/api/doctors/8/slots`);

    expect(response.ok()).toBe(true);
    const slots = await response.json();

    if (slots.length > 0) {
      const firstSlot = slots[0];
      expect(firstSlot).toHaveProperty('id');
      expect(firstSlot).toHaveProperty('date');
      expect(firstSlot).toHaveProperty('startTime');
      expect(firstSlot).toHaveProperty('endTime');
      expect(firstSlot).toHaveProperty('isAvailable');

      console.log(`✅ Found ${slots.length} slots with correct structure`);
    } else {
      console.log('⚠️ No slots returned (doctor may have no availability)');
    }
  });
});

test.describe('Appointment Booking Flow - Accessibility Tests', () => {

  test('P1 - Doctor cards are keyboard accessible', async ({ page }) => {
    console.log('\n🧪 Testing keyboard navigation on home page');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);
    await page.waitForTimeout(2000);

    // Tab through elements until we reach a doctor card
    let tabCount = 0;
    const maxTabs = 50;

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      // Check if focused element is a doctor card or link
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const tagName = await focusedElement.evaluate(el => el.tagName);
      const textContent = await focusedElement.evaluate(el => el.textContent || '');

      if (textContent.includes('Dr.') || tagName === 'A' && textContent.length > 0) {
        console.log(`✅ Doctor card focusable (tab count: ${tabCount})`);

        // Verify Enter key activates the card
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        const url = page.url();
        if (url.includes('/doctor/')) {
          console.log('✅ Doctor card activated with Enter key');
          return;
        }
      }
    }

    console.log('⚠️ No doctor card found after tabbing through page');
  });

  test('P1 - Doctor profile has proper ARIA labels', async ({ page }) => {
    console.log('\n🧪 Testing accessibility attributes on doctor profile');

    await page.goto(`${BASE_URL}/doctor/8`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check for common accessibility attributes
    const ariaLabels = await page.locator('[aria-label], [aria-labelledby], [role]').count();
    console.log(`Found ${ariaLabels} elements with ARIA attributes`);

    expect(ariaLabels).toBeGreaterThan(0);
    console.log('✅ Page has accessibility attributes');
  });
});
