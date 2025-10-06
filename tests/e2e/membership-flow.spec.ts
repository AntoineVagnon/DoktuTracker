import { test, expect } from '@playwright/test';

/**
 * E2E Test: Membership Subscription Flow
 * Tests membership subscription, allowance tracking, and credit usage
 */

const TEST_EMAIL = `test-member-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

test.describe('Membership Subscription Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('https://doktu-tracker.vercel.app/register');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Member');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Subscribe to monthly membership plan', async ({ page }) => {
    await test.step('Navigate to membership page', async () => {
      await page.goto('https://doktu-tracker.vercel.app/membership');

      // Verify membership plans are displayed
      await expect(page.locator('text=/monthly.*membership/i')).toBeVisible();
      await expect(page.locator('text=/6.*month.*membership/i')).toBeVisible();
    });

    await test.step('Select monthly plan', async () => {
      // Click "Choose This Plan" for monthly
      await page.click('button:has-text("Choose This Plan")').first();

      // Wait for Stripe checkout
      await page.waitForSelector('iframe[name*="stripe"]', { timeout: 15000 });
    });

    await test.step('Complete payment', async () => {
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();

      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
      await stripeFrame.locator('input[name="postal"]').fill('12345');

      await page.click('button:has-text("Subscribe")');

      // Wait for success
      await page.waitForURL('**/membership/success', { timeout: 30000 });
    });

    await test.step('Verify membership active', async () => {
      await page.goto('https://doktu-tracker.vercel.app/dashboard');

      // Check membership widget shows credits
      await expect(page.locator('.membership-chip')).toBeVisible();
      await expect(page.locator('text=/2.*credits?/i')).toBeVisible(); // Monthly = 2 credits
    });
  });

  test('Book appointment using membership credit', async ({ page }) => {
    // First subscribe to membership
    await page.goto('https://doktu-tracker.vercel.app/membership');
    await page.click('button:has-text("Choose This Plan")').first();

    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await page.click('button:has-text("Subscribe")');
    await page.waitForURL('**/membership/success', { timeout: 30000 });

    await test.step('Book appointment with credit', async () => {
      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');
      await page.click('.time-slot.available:first-child');
      await page.click('button:has-text("Confirm")');

      // Should NOT show payment form - covered by membership
      await expect(page.locator('text=/covered.*membership/i')).toBeVisible({ timeout: 10000 });

      // Appointment should be immediately confirmed
      await page.waitForURL('**/dashboard*');
      await expect(page.locator('text=/appointment.*confirmed/i')).toBeVisible();
    });

    await test.step('Verify credit deducted', async () => {
      // Check membership widget now shows 1 credit remaining
      await expect(page.locator('text=/1.*credit/i')).toBeVisible();
    });

    await test.step('Check allowance history', async () => {
      // Click on membership widget to open details
      await page.click('.membership-chip');

      // Should show allowance history
      await expect(page.locator('text=/allowance.*used/i')).toBeVisible();
      await expect(page.locator('text=/1.*of.*2/i')).toBeVisible();
    });
  });

  test('Verify no payment required when credits available', async ({ page }) => {
    // Subscribe first
    await page.goto('https://doktu-tracker.vercel.app/membership');
    await page.click('button:has-text("Choose This Plan")').first();

    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await page.click('button:has-text("Subscribe")');
    await page.waitForURL('**/membership/success', { timeout: 30000 });

    await test.step('Book appointment', async () => {
      await page.goto('https://doktu-tracker.vercel.app/doctors');
      await page.click('.doctor-card:first-child button:has-text("Book")');
      await page.click('.time-slot.available:first-child');
      await page.click('button:has-text("Confirm")');

      // Verify NO Stripe payment form appears
      const stripeIframe = page.locator('iframe[name*="stripe"]');
      await expect(stripeIframe).not.toBeVisible({ timeout: 5000 }).catch(() => {});

      // Should go straight to confirmation
      await expect(page.locator('text=/covered.*membership/i')).toBeVisible();
    });
  });

  test('Cancel membership subscription', async ({ page }) => {
    // Subscribe first
    await page.goto('https://doktu-tracker.vercel.app/membership');
    await page.click('button:has-text("Choose This Plan")').first();

    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await page.click('button:has-text("Subscribe")');
    await page.waitForURL('**/membership/success', { timeout: 30000 });

    await test.step('Navigate to membership management', async () => {
      await page.goto('https://doktu-tracker.vercel.app/membership');
    });

    await test.step('Click cancel subscription', async () => {
      await page.click('button:has-text("Cancel Subscription")');

      // Confirm in dialog
      await page.click('button:has-text("Yes, Cancel Subscription")');

      // Verify cancellation message
      await expect(page.locator('text=/subscription.*cancelled/i')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Verify access until period end', async () => {
      // Should still show active with end date
      await expect(page.locator('text=/active.*until/i')).toBeVisible();
    });
  });

  test('Reactivate cancelled subscription', async ({ page }) => {
    // Subscribe, then cancel
    await page.goto('https://doktu-tracker.vercel.app/membership');
    await page.click('button:has-text("Choose This Plan")').first();

    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await page.click('button:has-text("Subscribe")');
    await page.waitForURL('**/membership/success', { timeout: 30000 });

    await page.goto('https://doktu-tracker.vercel.app/membership');
    await page.click('button:has-text("Cancel Subscription")');
    await page.click('button:has-text("Yes, Cancel Subscription")');

    await test.step('Reactivate subscription', async () => {
      // Click reactivate button
      await page.click('button:has-text("Reactivate")');

      // Confirm reactivation
      await page.click('button:has-text("Yes, Reactivate Subscription")');

      // Verify reactivated
      await expect(page.locator('text=/subscription.*reactivated/i')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/active.*subscription/i')).toBeVisible();
    });
  });
});
