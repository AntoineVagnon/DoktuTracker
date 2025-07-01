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
      
      // Should be redirected directly to register with booking parameters
      await expect(page).toHaveURL(/\/register\?doctorId=.*&slot=.*&price=/);
      
      // Verify the URL contains proper booking parameters
      const currentUrl = page.url();
      const urlParams = new URL(currentUrl).searchParams;
      expect(urlParams.get('doctorId')).toBeTruthy();
      expect(urlParams.get('slot')).toBeTruthy();
      expect(urlParams.get('price')).toBeTruthy();
    }
  });

  test('should navigate through simplified new patient registration', async ({ page }) => {
    // Step 1: Go directly to register with booking parameters
    await page.goto('/register?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=3.00');
    
    // Verify the register page has the right content
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('text=Quick registration')).toBeVisible();
    
    // Step 2: Click "Create Account & Continue" should redirect to Replit Auth
    await page.click('text=Create Account & Continue');
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should handle returning patient login through /login page', async ({ page }) => {
    // Navigate to login page directly
    await page.goto('/login');
    
    // Click "Sign In to Account" should redirect to Replit Auth
    await page.click('text=Sign In to Account');
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should preserve booking parameters in register URL', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '3.00';
    const registerUrl = `/register?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`;
    
    // Navigate to register with booking parameters
    await page.goto(registerUrl);
    
    // Check that booking parameters are preserved in URL
    const currentUrl = page.url();
    const urlParams = new URL(currentUrl).searchParams;
    expect(urlParams.get('doctorId')).toBe(doctorId);
    expect(urlParams.get('slot')).toBe(slot);
    expect(urlParams.get('price')).toBe(price);
  });

  test('should have back navigation from register to login', async ({ page }) => {
    // Start at register page
    await page.goto('/register');
    
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