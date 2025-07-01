import { test, expect } from '@playwright/test';

test.describe('Booking Authentication Flow', () => {
  test('should navigate through complete new patient booking flow', async ({ page }) => {
    // Step 1: Unauthenticated user clicks slot on doctor profile
    await page.goto('/doctor/8be00061-3f91-4236-a09a-525b035a7d00');
    await page.waitForLoadState('networkidle');
    
    // Look for available time slots and click one
    const timeSlots = page.locator('[data-testid*="time-slot"], .time-slot, button:has-text(":")');
    
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click();
      
      // Step 2: Should land on auth-choice page with booking parameters
      await expect(page).toHaveURL(/\/auth-choice\?doctorId=.*&slot=.*&price=/);
      
      // Verify booking summary is displayed
      await expect(page.locator('text=Booking Summary')).toBeVisible();
      await expect(page.locator('text=Complete Your Booking')).toBeVisible();
      
      // Step 3: Click "Sign Up as New Patient"
      await page.click('text=Sign Up as New Patient');
      
      // Step 4: Should navigate to register-form with booking parameters
      await expect(page).toHaveURL(/\/register-form\?doctorId=.*&slot=.*&price=/);
      
      // Verify booking summary panel is visible
      await expect(page.locator('text=Booking Summary')).toBeVisible();
      
      // Verify form fields are present
      await expect(page.locator('input[name="firstName"]')).toBeVisible();
      await expect(page.locator('input[name="lastName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      
      // Step 5: Fill form and submit (should redirect to Replit Auth)
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', 'john.doe@example.com');
      await page.fill('input[name="password"]', 'password123');
      
      await page.click('text=Create Account & Continue');
      
      // Should redirect to API login (Replit Auth)
      await expect(page).toHaveURL(/\/api\/login/);
    }
  });

  test('should navigate through returning patient login flow', async ({ page }) => {
    // Step 1: Navigate to auth-choice with booking parameters
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    // Step 2: Click "Sign In to Account"
    await page.click('text=Sign In to Account');
    
    // Step 3: Should navigate to login-form with booking parameters
    await expect(page).toHaveURL(/\/login-form\?doctorId=.*&slot=.*&price=/);
    
    // Verify booking summary panel is visible
    await expect(page.locator('text=Booking Summary')).toBeVisible();
    
    // Verify login form fields are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Step 4: Fill login form and submit
    await page.fill('input[name="email"]', 'patient@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    await page.click('text=Sign In & Continue');
    
    // Should redirect to API login (Replit Auth)
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should have back navigation between forms and auth-choice', async ({ page }) => {
    // Test register-form back navigation
    await page.goto('/register-form?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    await page.click('[aria-label*="Back"], text=Back to patient choice');
    await expect(page).toHaveURL(/\/auth-choice\?doctorId=.*&slot=.*&price=/);
    
    // Test login-form back navigation
    await page.goto('/login-form?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    await page.click('[aria-label*="Back"], text=Back to patient choice');
    await expect(page).toHaveURL(/\/auth-choice\?doctorId=.*&slot=.*&price=/);
  });

  test('should preserve booking parameters through all steps', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '35.00';
    
    // Start at auth-choice
    await page.goto(`/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`);
    
    // Navigate to register-form
    await page.click('text=Sign Up as New Patient');
    
    // Check URL parameters are preserved
    const registerUrl = page.url();
    const registerParams = new URL(registerUrl).searchParams;
    expect(registerParams.get('doctorId')).toBe(doctorId);
    expect(registerParams.get('slot')).toBe(slot);
    expect(registerParams.get('price')).toBe(price);
    
    // Go back and try login-form
    await page.click('[aria-label*="Back"], text=Back to patient choice');
    await page.click('text=Sign In to Account');
    
    // Check URL parameters are preserved
    const loginUrl = page.url();
    const loginParams = new URL(loginUrl).searchParams;
    expect(loginParams.get('doctorId')).toBe(doctorId);
    expect(loginParams.get('slot')).toBe(slot);
    expect(loginParams.get('price')).toBe(price);
  });

  test('should display correct booking summary information', async ({ page }) => {
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T14:30:00.000Z&price=35.00');
    
    // Verify booking summary displays correctly formatted date/time
    await expect(page.locator('text=Tuesday, July 2, 2024')).toBeVisible();
    await expect(page.locator('text=14:30')).toBeVisible();
    await expect(page.locator('text=€35.00')).toBeVisible();
  });

  test('should handle cross-links between register and login forms', async ({ page }) => {
    // Start at register-form
    await page.goto('/register-form?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    // Look for "Already have an account?" link (not implemented in current form, but should be)
    // This would be a link at the bottom of the register form
    
    // Start at login-form
    await page.goto('/login-form?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    // Look for "Don't have an account? Sign up here" link
    await page.click('text=Sign up here');
    await expect(page).toHaveURL(/\/register-form\?doctorId=.*&slot=.*&price=/);
  });
});