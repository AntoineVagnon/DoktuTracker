import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Patient Booking Flow
 * Tests the critical path from registration to appointment booking
 */

const TEST_EMAIL = `test-patient-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

test.describe('Patient Booking Flow', () => {

  test('Complete patient journey: Register → Book → Pay', async ({ page }) => {
    // Step 1: Navigate to homepage
    await test.step('Load homepage', async () => {
      await page.goto('https://doktu-tracker.vercel.app/');
      // Verify page loaded by checking for main heading
      await expect(page.locator('h1')).toContainText('Book one of our hand-picked doctors');
    });

    // Step 2: Register new patient account
    await test.step('Register new patient', async () => {
      // Click "Sign Up Free" button in header
      await page.click('button:has-text("Sign Up Free")');

      // Wait for auth modal to appear
      await page.waitForSelector('text=Welcome to Doktu');

      // Click the "Sign Up" tab (modal opens to Login by default)
      await page.click('tab[role="tab"]:has-text("Sign Up")');

      // Wait for registration form to appear
      await page.waitForSelector('input[name="firstName"]');

      // Fill registration form
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'Patient');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

      // Submit registration
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 30000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // Step 3: Navigate to doctors page
    await test.step('Browse doctors', async () => {
      await page.goto('https://doktu-tracker.vercel.app/doctors');

      // Wait for doctors to load
      await page.waitForSelector('.doctor-card', { timeout: 10000 });

      // Verify at least one doctor is displayed
      const doctorCards = page.locator('.doctor-card');
      await expect(doctorCards).toHaveCountGreaterThan(0);
    });

    // Step 4: Select first doctor and view available slots
    await test.step('Select doctor and time slot', async () => {
      // Click on first doctor's "Book Appointment" button
      await page.click('.doctor-card:first-child button:has-text("Book")');

      // Wait for calendar/time slots to load
      await page.waitForSelector('.time-slot', { timeout: 10000 });

      // Select first available slot
      await page.click('.time-slot.available:first-child');

      // Click confirm/next button
      await page.click('button:has-text("Confirm")');
    });

    // Step 5: Complete payment (using Stripe test card)
    await test.step('Complete payment', async () => {
      // Wait for Stripe payment form
      await page.waitForSelector('iframe[name*="stripe"]', { timeout: 15000 });

      // Switch to Stripe iframe
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();

      // Fill card details (Stripe test card)
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await stripeFrame.locator('input[name="postal"]').fill('12345');

      // Submit payment
      await page.click('button:has-text("Pay")');

      // Wait for success redirect
      await page.waitForURL('**/dashboard*', { timeout: 30000 });

      // Verify success message or booking confirmation
      await expect(page.locator('text=/booking.*success/i')).toBeVisible();
    });

    // Step 6: Verify appointment appears in dashboard
    await test.step('Verify appointment in dashboard', async () => {
      // Go to appointments tab
      await page.click('button[value="appointments"]');

      // Check that appointment is listed
      const appointments = page.locator('.appointment-card');
      await expect(appointments).toHaveCountGreaterThan(0);

      // Verify appointment status is "paid" or "confirmed"
      await expect(page.locator('text=/paid|confirmed/i')).toBeVisible();
    });
  });

  test('Reschedule appointment flow', async ({ page }) => {
    // Login with existing patient account
    await test.step('Login', async () => {
      await page.goto('https://doktu-tracker.vercel.app/login');
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    // Find appointment and click reschedule
    await test.step('Click reschedule', async () => {
      await page.click('button:has-text("Reschedule")');

      // Wait for reschedule modal
      await expect(page.locator('text=/reschedule.*appointment/i')).toBeVisible();
    });

    // Select new time slot
    await test.step('Select new time', async () => {
      // Wait for available slots to load
      await page.waitForSelector('.time-slot', { timeout: 10000 });

      // Click first available slot different from current
      await page.click('.time-slot:not(.selected):first-child');

      // Enter reason
      await page.fill('textarea[name="reason"]', 'Schedule conflict');

      // Confirm reschedule
      await page.click('button:has-text("Reschedule Appointment")');

      // Wait for success message
      await expect(page.locator('text=/successfully.*rescheduled/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test('Cancel appointment flow', async ({ page }) => {
    // Login
    await page.goto('https://doktu-tracker.vercel.app/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Enter cancellation reason
    await page.fill('textarea[name="reason"]', 'No longer needed');

    // Confirm cancellation
    await page.click('button:has-text("Cancel Appointment")');

    // Verify cancellation success
    await expect(page.locator('text=/cancelled/i')).toBeVisible({ timeout: 10000 });
  });
});
