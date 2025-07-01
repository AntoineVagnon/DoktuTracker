import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('redirects to book page with correct parameters when slot is clicked', async ({ page }) => {
    // Go to a doctor profile page
    await page.goto('/doctor/8be00061-3f91-4236-a09a-525b035a7d00');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Dr.');
    
    // Click on a time slot (wait for slots to load first)
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
    const firstSlot = page.locator('[data-testid="time-slot"]').first();
    await firstSlot.click();
    
    // Should redirect to book page with correct parameters
    await expect(page).toHaveURL(/\/book\?doctorId=.+&slot=.+&price=.+/);
    
    // Book page should display doctor name and appointment details
    await expect(page.locator('h1')).toContainText('Book appointment');
    await expect(page.locator('p')).toContainText('with Dr.');
  });

  test('new patient flow navigates to register page', async ({ page }) => {
    // Go directly to book page with test parameters
    await page.goto('/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2025-07-02T10:00:00Z&price=35.00');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Book appointment');
    
    // Click "New patient" button
    await page.click('text=I\'m a new patient');
    
    // Should redirect to register page with correct redirect parameter
    await expect(page).toHaveURL(/\/register\?redirect=.+/);
    
    // Register page should show create account form
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('returning patient flow navigates to login page', async ({ page }) => {
    // Go directly to book page with test parameters
    await page.goto('/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2025-07-02T10:00:00Z&price=35.00');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Book appointment');
    
    // Click "Returning patient" button
    await page.click('text=I already have an account');
    
    // Should redirect to login page with correct redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=.+/);
    
    // Login page should show login options
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('register page redirects to auth system', async ({ page }) => {
    // Go to register page with redirect
    const redirectUrl = encodeURIComponent('/checkout?doctorId=test&slot=test&price=35.00');
    await page.goto(`/register?redirect=${redirectUrl}`);
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Create your account');
    
    // Click create account button (should redirect to auth system)
    await page.click('text=Create Account & Continue to Payment');
    
    // Should redirect to /api/login (auth system)
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('displays booking summary with correct information', async ({ page }) => {
    // Go to book page with test parameters
    await page.goto('/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2025-07-02T10:00:00Z&price=35.00');
    
    // Wait for page to load and verify booking summary
    await expect(page.locator('h3')).toContainText('Booking Summary');
    
    // Check that date, time, and price are displayed
    await expect(page.locator('text=Date')).toBeVisible();
    await expect(page.locator('text=Time')).toBeVisible();
    await expect(page.locator('text=€35.00')).toBeVisible();
    
    // Check that doctor information is loaded
    await expect(page.locator('text=with Dr.')).toBeVisible();
  });

  test('handles invalid booking parameters gracefully', async ({ page }) => {
    // Go to book page without required parameters
    await page.goto('/book');
    
    // Should show error message
    await expect(page.locator('text=Invalid Booking Request')).toBeVisible();
    await expect(page.locator('text=Return to Home')).toBeVisible();
  });
});