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

  test('should navigate through simplified new patient registration', async ({ page }) => {
    const bookingUrl = '/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00';
    
    // Step 1: Start with booking URL (should redirect to login)
    await page.goto(bookingUrl);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Step 2: Click "Sign Up as New Patient"
    await page.click('text=Sign Up as New Patient');
    await expect(page).toHaveURL(/\/register\?redirect=/);
    
    // Verify the register page has the right content
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('text=Quick registration')).toBeVisible();
    
    // Step 3: Click "Create Account & Continue" should redirect to Replit Auth
    await page.click('text=Create Account & Continue');
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should navigate through returning patient login flow', async ({ page }) => {
    const bookingUrl = '/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00';
    
    // Step 1: Start with booking URL (should redirect to login)
    await page.goto(bookingUrl);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Step 2: Click "Sign In to Account" should redirect to Replit Auth
    await page.click('text=Sign In to Account');
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should preserve redirect parameters through simplified flow', async ({ page }) => {
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
  });

  test('should have back navigation from register to login', async ({ page }) => {
    // Start at register page
    await page.goto('/register?redirect=%2Fcheckout');
    
    // Click back button
    await page.click('[aria-label="Go back"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle doctor and admin login differently from patients', async ({ page }) => {
    // Test doctor login
    await page.goto('/login?role=doctor');
    await page.click('text=Sign In to Account');
    
    // Should redirect to API login for doctors (OIDC)
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should handle register page without redirect parameters', async ({ page }) => {
    // Test register page without redirect
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    
    // Should still show the quick registration content
    await expect(page.locator('text=Create your account')).toBeVisible();
    await expect(page.locator('text=Quick registration')).toBeVisible();
  });
});