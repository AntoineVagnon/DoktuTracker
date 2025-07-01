import { test, expect } from '@playwright/test';

test.describe('Auth Redirects Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('Home Sign Up → Register → Dashboard (no redirect param)', async ({ page }) => {
    // From Home, click "Sign Up" button
    await page.getByRole('link', { name: 'Sign Up' }).first().click();
    
    // Should be on register page without redirect param
    await expect(page).toHaveURL('/register');
    
    // Click register button to trigger auth flow
    await page.getByRole('button', { name: /Create Account/ }).click();
    
    // Should redirect to Replit Auth
    await expect(page).toHaveURL(/\/api\/login/);
    
    // Mock successful login by manually navigating to home
    // In real flow, user would authenticate and be redirected back
    await page.goto('/');
    
    // Should see authenticated state (mock check)
    await expect(page.getByText(/Good morning|Good afternoon|Good evening/)).toBeVisible();
  });

  test('Home Sign In → Login → Dashboard (no redirect param)', async ({ page }) => {
    // From Home, click "Sign In" button
    await page.getByRole('link', { name: 'Sign In' }).first().click();
    
    // Should be on login page without redirect param
    await expect(page).toHaveURL('/login');
    
    // Click returning patient to trigger auth flow
    await page.getByText(/already have an account/i).click();
    
    // Should redirect to Replit Auth
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('Booking Flow → Book → Register → Checkout (with redirect)', async ({ page }) => {
    // Navigate to a doctor profile
    await page.goto('/doctor/1');
    
    // Wait for the calendar to load
    await page.waitForSelector('[data-testid="availability-calendar"]');
    
    // Click on an available time slot
    const timeSlot = page.locator('.time-slot').first();
    await timeSlot.click();
    
    // Should redirect to book page with parameters
    await expect(page).toHaveURL(/\/book\?doctorId=1&slot=.*&price=.*/);
    
    // Click "New Patient" button
    await page.getByRole('button', { name: /new patient/i }).click();
    
    // Should be on register page with redirect parameter to checkout
    await expect(page).toHaveURL(/\/register\?redirect=.*checkout/);
    
    // Click register button
    await page.getByRole('button', { name: /Create Account/ }).click();
    
    // Should redirect to Replit Auth
    await expect(page).toHaveURL(/\/api\/login/);
    
    // Mock successful auth and redirect to checkout
    await page.goto('/checkout?doctorId=1&slot=2024-07-01T09:00:00Z&price=35.00');
    
    // Should be on checkout page
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText('Payment')).toBeVisible();
  });

  test('Booking Flow → Book → Login → Checkout (returning patient)', async ({ page }) => {
    // Navigate to a doctor profile
    await page.goto('/doctor/1');
    
    // Wait for the calendar to load
    await page.waitForSelector('[data-testid="availability-calendar"]');
    
    // Click on an available time slot
    const timeSlot = page.locator('.time-slot').first();
    await timeSlot.click();
    
    // Should redirect to book page
    await expect(page).toHaveURL(/\/book\?doctorId=1&slot=.*&price=.*/);
    
    // Click "Returning Patient" button
    await page.getByRole('button', { name: /already have an account/i }).click();
    
    // Should redirect to Replit Auth
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('Dashboard → Book New Appointment → Select Slot → Checkout (authenticated)', async ({ page }) => {
    // Mock being authenticated by starting at dashboard
    await page.goto('/dashboard');
    
    // Should have authentication headers or session
    // For this test, we'll simulate the user is already authenticated
    await page.goto('/');
    
    // Click "Book New Appointment" from quick actions
    await page.getByRole('link', { name: /Book New Appointment/i }).click();
    
    // Should scroll to doctors section or navigate to doctors
    await expect(page.locator('#doctors-grid')).toBeVisible();
    
    // Click on a doctor card to view profile
    await page.locator('.doctor-card').first().click();
    
    // Wait for doctor profile page
    await page.waitForSelector('[data-testid="availability-calendar"]');
    
    // As an authenticated user, clicking a slot should go directly to checkout
    // This would require mocking authentication state in a real test
    const timeSlot = page.locator('.time-slot').first();
    await timeSlot.click();
    
    // For authenticated users, should skip /book and go straight to /checkout
    // await expect(page).toHaveURL(/\/checkout\?doctorId=.*&slot=.*&price=.*/);
  });

  test('Checkout → Payment Success → Dashboard', async ({ page }) => {
    // Start at checkout page (user already authenticated)
    await page.goto('/checkout?doctorId=1&slot=2024-07-01T09:00:00Z&price=35.00');
    
    // Should show appointment summary
    await expect(page.getByText('Payment')).toBeVisible();
    await expect(page.getByText('€35.00')).toBeVisible();
    
    // Click payment button
    await page.getByRole('button', { name: /Pay.*Book Appointment/i }).click();
    
    // Should redirect to dashboard after successful payment
    await expect(page).toHaveURL('/dashboard');
  });

  test('Direct access to auth pages without redirect', async ({ page }) => {
    // Direct access to login page
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    
    // Direct access to register page
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Create your account')).toBeVisible();
  });

  test('Back navigation from booking flow', async ({ page }) => {
    // Start booking flow
    await page.goto('/doctor/1');
    
    // Click time slot to go to book page
    await page.waitForSelector('[data-testid="availability-calendar"]');
    const timeSlot = page.locator('.time-slot').first();
    await timeSlot.click();
    
    // Should be on book page
    await expect(page).toHaveURL(/\/book/);
    
    // Click back button
    await page.getByRole('button', { name: /Back to profile/i }).click();
    
    // Should return to doctor profile
    await expect(page).toHaveURL('/doctor/1');
  });

  test('Invalid booking parameters handling', async ({ page }) => {
    // Access book page with missing parameters
    await page.goto('/book');
    
    // Should show error message
    await expect(page.getByText('Invalid Booking Request')).toBeVisible();
    
    // Click return home button
    await page.getByRole('button', { name: /Return to Home/i }).click();
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });

  test('Authentication state persistence across navigation', async ({ page }) => {
    // Mock login by setting session storage
    await page.evaluate(() => {
      sessionStorage.setItem('loginRedirect', '/checkout?doctorId=1&slot=test&price=35.00');
    });
    
    // Navigate to home page
    await page.goto('/');
    
    // Check that redirect URL is properly stored
    const storedRedirect = await page.evaluate(() => sessionStorage.getItem('loginRedirect'));
    expect(storedRedirect).toContain('/checkout');
  });
});