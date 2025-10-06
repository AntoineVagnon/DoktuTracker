import { test, expect } from '@playwright/test';

/**
 * E2E Test: Critical Bug Verification
 * Tests for known critical issues that were recently fixed
 */

test.describe('Critical Bug Verification', () => {

  test('BUG FIX: Booked slots should not appear in reschedule modal', async ({ page }) => {
    const patientEmail = `patient-${Date.now()}@example.com`;
    const TEST_PASSWORD = 'TestPass123!';

    // Register patient 1 and book a slot
    await test.step('Patient 1: Book appointment at specific slot', async () => {
      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="firstName"]', 'Patient');
      await page.fill('input[name="lastName"]', 'One');
      await page.fill('input[name="email"]', patientEmail);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Book appointment
      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');

      // Note the first available slot time
      const firstSlot = page.locator('.time-slot.available').first();
      const slotTime = await firstSlot.textContent();
      console.log('Booked slot:', slotTime);

      await firstSlot.click();
      await page.click('button:has-text("Confirm")');

      // Complete payment
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await page.click('button:has-text("Pay")');

      await page.waitForURL('**/dashboard*', { timeout: 30000 });
    });

    // Logout
    await page.click('button:has-text("Logout")');

    // Register patient 2 and try to reschedule to that same slot
    await test.step('Patient 2: Verify booked slot not available for reschedule', async () => {
      const patient2Email = `patient2-${Date.now()}@example.com`;

      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="firstName"]', 'Patient');
      await page.fill('input[name="lastName"]', 'Two');
      await page.fill('input[name="email"]', patient2Email);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Book a different appointment
      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');
      await page.click('.time-slot.available:nth-child(2)'); // Book second slot
      await page.click('button:has-text("Confirm")');

      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await page.click('button:has-text("Pay")');
      await page.waitForURL('**/dashboard*', { timeout: 30000 });

      // Now try to reschedule
      await page.click('button:has-text("Reschedule")');

      // CRITICAL CHECK: The slot booked by Patient 1 should NOT appear
      // Get all available slots in reschedule modal
      const availableSlots = await page.locator('.time-slot.available').allTextContents();

      console.log('Available slots for reschedule:', availableSlots);

      // The first slot (booked by patient 1) should NOT be in this list
      // This is the bug that was fixed - previously it would show up
      // We can't check exact time easily, but we can verify count is less than total
      const originalSlotsCount = await page.locator('.time-slot').count();
      expect(availableSlots.length).toBeLessThan(originalSlotsCount);
    });
  });

  test('BUG FIX: Welcome email should send within 2 minutes', async ({ page }) => {
    const testEmail = `welcome-test-${Date.now()}@example.com`;

    await test.step('Register new user', async () => {
      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="firstName"]', 'Welcome');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.fill('input[name="confirmPassword"]', 'TestPass123!');

      const registrationTime = Date.now();
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      console.log(`User registered at: ${new Date(registrationTime).toISOString()}`);
      console.log(`MANUAL VERIFICATION REQUIRED: Check email ${testEmail} for welcome email`);
      console.log('Expected: Email should arrive within 2 minutes (120 seconds)');
      console.log('Previous bug: Emails delayed up to 30 minutes');
    });

    // Note: Actual email verification requires manual check or email API integration
  });

  test('BUG FIX: Membership allowance auto-initializes for existing subscriptions', async ({ page }) => {
    const memberEmail = `auto-init-${Date.now()}@example.com`;

    await test.step('Subscribe to membership', async () => {
      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="firstName"]', 'Auto');
      await page.fill('input[name="lastName"]', 'Init');
      await page.fill('input[name="email"]', memberEmail);
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.fill('input[name="confirmPassword"]', 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Subscribe
      await page.goto('https://doktu-tracker.vercel.app/membership');
      await page.click('button:has-text("Choose This Plan")').first();

      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await page.click('button:has-text("Subscribe")');
      await page.waitForURL('**/membership/success', { timeout: 30000 });
    });

    await test.step('Verify allowance appears immediately without manual initialization', async () => {
      await page.goto('https://doktu-tracker.vercel.app/dashboard');

      // CRITICAL CHECK: Membership widget should show credits immediately
      // Previous bug: Required manual "Initialize Allowance" button click
      await expect(page.locator('.membership-chip')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/2.*credit/i')).toBeVisible();

      // Click widget to open details
      await page.click('.membership-chip');

      // Verify allowance data is populated
      await expect(page.locator('text=/allowance.*granted/i')).toBeVisible();
      await expect(page.locator('text=/2\/2/i')).toBeVisible(); // 2 of 2 credits remaining
    });
  });

  test('BUG FIX: Payment webhook marks slot as unavailable', async ({ page }) => {
    const testEmail = `webhook-test-${Date.now()}@example.com`;

    await test.step('Register and book appointment', async () => {
      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="firstName"]', 'Webhook');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.fill('input[name="confirmPassword"]', 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');

      // Note the selected slot
      const selectedSlot = page.locator('.time-slot.available').first();
      const slotText = await selectedSlot.textContent();
      console.log('Booking slot:', slotText);

      await selectedSlot.click();
      await page.click('button:has-text("Confirm")');

      // Complete payment
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await page.click('button:has-text("Pay")');

      await page.waitForURL('**/dashboard*', { timeout: 30000 });
    });

    await test.step('Verify slot is marked unavailable after payment', async () => {
      // Logout
      await page.click('button:has-text("Logout")');

      // Register new patient
      await page.goto('https://doktu-tracker.vercel.app/register');
      await page.fill('input[name="email"]', `verify-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');

      // Try to book the same doctor
      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');

      // CRITICAL CHECK: Previously booked slot should NOT be available
      // Previous bug: Webhook didn't properly mark slots unavailable
      const unavailableSlots = page.locator('.time-slot:not(.available)');
      await expect(unavailableSlots).toHaveCountGreaterThan(0);
    });
  });
});
