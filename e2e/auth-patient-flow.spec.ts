import { test, expect } from '@playwright/test';

test.describe('Multi-step Patient Authentication Flow', () => {
  test('should handle complete new patient registration flow from slot click', async ({ page }) => {
    // Step 1: As unauthenticated user, click a time slot
    await page.goto('/doctor/8be00061-3f91-4236-a09a-525b035a7d00');
    await page.waitForLoadState('networkidle');
    
    // Look for available time slots and click one
    const timeSlots = page.locator('[data-testid*="time-slot"], .time-slot, button:has-text(":")');
    
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click();
      
      // Should be redirected to login with booking parameters
      await expect(page).toHaveURL(/\/login\?redirect=.*\/book/);
      
      // Verify the redirect URL contains proper booking parameters
      const currentUrl = page.url();
      const redirectParam = new URL(currentUrl).searchParams.get('redirect');
      expect(redirectParam).toContain('doctorId=');
      expect(redirectParam).toContain('slot=');
      expect(redirectParam).toContain('price=');
    }
  });

  test('should navigate through complete new patient registration steps', async ({ page }) => {
    const bookingUrl = '/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00';
    
    // Step 1: Start with booking URL (should redirect to login)
    await page.goto(bookingUrl);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Step 2: Click "Sign Up as New Patient"
    await page.click('text=Sign Up as New Patient');
    await expect(page).toHaveURL(/\/register\?redirect=/);
    
    // Verify the register page has the right content
    await expect(page.locator('h1')).toContainText('Patient Registration');
    await expect(page.locator('text=Quick registration')).toBeVisible();
    
    // Step 3: Click "Create Account & Continue"
    await page.click('text=Create Account & Continue');
    await expect(page).toHaveURL(/\/register-form\?redirect=/);
    
    // Verify we're on the registration form page
    await expect(page.locator('h1, h2')).toContainText('Create Account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate through returning patient login flow', async ({ page }) => {
    const bookingUrl = '/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00';
    
    // Step 1: Start with booking URL (should redirect to login)
    await page.goto(bookingUrl);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Step 2: Click "Returning Patient" or "Sign In to Account"
    await page.click('text=Sign In to Account');
    await expect(page).toHaveURL(/\/login-form\?redirect=/);
    
    // Verify we're on the login form page
    await expect(page.locator('h1, h2')).toContainText('Sign In');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should preserve redirect parameters through entire flow', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '35.00';
    const bookingUrl = `/book?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`;
    
    // Start with booking URL
    await page.goto(bookingUrl);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Navigate to register
    await page.click('text=Sign Up as New Patient');
    await expect(page).toHaveURL(/\/register\?redirect=/);
    
    // Check that redirect parameter is preserved
    let currentUrl = page.url();
    let redirectParam = decodeURIComponent(new URL(currentUrl).searchParams.get('redirect') || '');
    expect(redirectParam).toContain(`doctorId=${doctorId}`);
    expect(redirectParam).toContain(`slot=${encodeURIComponent(slot)}`);
    expect(redirectParam).toContain(`price=${price}`);
    
    // Navigate to register form
    await page.click('text=Create Account & Continue');
    await expect(page).toHaveURL(/\/register-form\?redirect=/);
    
    // Verify parameters are still preserved
    currentUrl = page.url();
    redirectParam = decodeURIComponent(new URL(currentUrl).searchParams.get('redirect') || '');
    expect(redirectParam).toContain(`doctorId=${doctorId}`);
    expect(redirectParam).toContain(`slot=${encodeURIComponent(slot)}`);
    expect(redirectParam).toContain(`price=${price}`);
  });

  test('should show proper form validation on registration form', async ({ page }) => {
    // Navigate directly to registration form
    await page.goto('/register-form');
    
    // Try to submit empty form
    await page.click('text=Create Account & Continue');
    
    // Should show validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/register-form');
    
    // Enter a weak password
    await page.fill('input[name="password"]', '123');
    await expect(page.locator('text=Weak')).toBeVisible();
    
    // Enter a stronger password
    await page.fill('input[name="password"]', 'StrongPass123!');
    await expect(page.locator('text=Strong')).toBeVisible();
  });

  test('should show password confirmation validation', async ({ page }) => {
    await page.goto('/register-form');
    
    // Enter mismatched passwords
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'different');
    await page.click('text=Create Account & Continue');
    
    // Should show validation error
    await expect(page.locator('text=Passwords don\'t match')).toBeVisible();
  });

  test('should have back navigation between steps', async ({ page }) => {
    // Start at register form
    await page.goto('/register-form?redirect=%2Fcheckout');
    
    // Click back button
    await page.click('[aria-label="Go back"]');
    await expect(page).toHaveURL(/\/register/);
    
    // Go to login form and test back navigation
    await page.goto('/login-form?redirect=%2Fcheckout');
    await page.click('[aria-label="Go back"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle cross-navigation between login and register forms', async ({ page }) => {
    // Start at login form
    await page.goto('/login-form?redirect=%2Fcheckout');
    
    // Click "Sign up here" link
    await page.click('text=Sign up here');
    await expect(page).toHaveURL(/\/register/);
    
    // From register page, go to register form
    await page.click('text=Create Account & Continue');
    await expect(page).toHaveURL(/\/register-form/);
    
    // Click "Sign in here" link
    await page.click('text=Sign in here');
    await expect(page).toHaveURL(/\/login-form/);
  });

  test('should handle doctor and admin login differently from patients', async ({ page }) => {
    // Test doctor login
    await page.goto('/login?role=doctor');
    await page.click('text=Sign In to Account');
    
    // Should redirect to API login for doctors (OIDC)
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should handle edge cases with missing redirect parameters', async ({ page }) => {
    // Test register form without redirect
    await page.goto('/register-form');
    await expect(page).toHaveURL('/register-form');
    
    // Should still show the form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Test login form without redirect
    await page.goto('/login-form');
    await expect(page).toHaveURL('/login-form');
    
    // Should still show the form
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});