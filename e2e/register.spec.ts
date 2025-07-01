import { test, expect } from '@playwright/test';

test.describe('Simplified Register Page Flow', () => {
  test('should navigate from slot click to register with booking parameters', async ({ page }) => {
    // Step 1: Go to doctor profile as unauthenticated user
    await page.goto('/doctor/8be00061-3f91-4236-a09a-525b035a7d00');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Click an available time slot
    const timeSlots = page.locator('[data-testid*="time-slot"], .time-slot, button:has-text(":")');
    
    if (await timeSlots.count() > 0) {
      await timeSlots.first().click();
      
      // Step 3: Should redirect directly to register with booking parameters
      await expect(page).toHaveURL(/\/register\?doctorId=.*&slot=.*&price=/);
      
      // Verify booking parameters are present
      const currentUrl = page.url();
      const urlParams = new URL(currentUrl).searchParams;
      expect(urlParams.get('doctorId')).toBeTruthy();
      expect(urlParams.get('slot')).toBeTruthy();
      expect(urlParams.get('price')).toBeTruthy();
    }
  });

  test('should display booking summary and registration form without back link', async ({ page }) => {
    // Navigate to register page with booking parameters
    const registerUrl = '/register?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00';
    await page.goto(registerUrl);
    
    // Verify booking summary is displayed
    await expect(page.locator('text=Booking Summary')).toBeVisible();
    await expect(page.locator('text=Tuesday, 2 July 2024')).toBeVisible();
    await expect(page.locator('text=€35.00')).toBeVisible();
    
    // Verify registration form is displayed
    await expect(page.locator('h1:has-text("Create your account")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your full name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Create a password"]')).toBeVisible();
    
    // Verify primary action button
    await expect(page.locator('button:has-text("Create Account & Continue to Payment")')).toBeVisible();
    
    // Verify secondary sign-in link (but NO back link)
    await expect(page.locator('button:has-text("Already have an account? Sign in")')).toBeVisible();
    
    // Ensure there is NO "Back to login options" link
    await expect(page.locator('text=Back to login options')).not.toBeVisible();
    
    // Ensure there is NO Quick Registration info box
    await expect(page.locator('text=Quick registration:')).not.toBeVisible();
  });

  test('should trigger header login modal when clicking "Already have an account" link', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    // Click the "Already have an account? Sign in" link
    await page.click('button:has-text("Already have an account? Sign in")');
    
    // Should redirect to Replit Auth (since modal functionality uses login API for now)
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should redirect to Replit Auth when clicking Create Account button', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=35.00');
    
    // Click the primary "Create Account & Continue to Payment" button
    await page.click('button:has-text("Create Account & Continue to Payment")');
    
    // Should redirect to Replit Auth
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('should work without booking parameters for general registration', async ({ page }) => {
    // Navigate to register page without booking parameters
    await page.goto('/register');
    
    // Should NOT show booking summary
    await expect(page.locator('text=Booking Summary')).not.toBeVisible();
    
    // Should still show registration form
    await expect(page.locator('h1:has-text("Create your account")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your full name"]')).toBeVisible();
    
    // Primary button should still work for general registration
    await expect(page.locator('button:has-text("Create Account & Continue to Payment")')).toBeVisible();
  });
});