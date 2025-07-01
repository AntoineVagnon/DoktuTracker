import { test, expect } from '@playwright/test';

test.describe('Auth Choice Page', () => {
  test('should parse URL parameters and display correct booking summary', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '3.00';
    
    await page.goto(`/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`);
    
    // Verify booking summary displays correct values
    await expect(page.locator('.booking-summary')).toBeVisible();
    await expect(page.locator('text=Booking Summary')).toBeVisible();
    
    // Check formatted date and time display
    await expect(page.locator('text=02/07/2024')).toBeVisible(); // dd/MM/yyyy format
    await expect(page.locator('text=14:30')).toBeVisible(); // HH:mm format
    await expect(page.locator('text=€3.00')).toBeVisible();
  });

  test('should display both patient choice cards with correct content', async ({ page }) => {
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T14:30:00.000Z&price=3.00');
    
    // Check New Patient card
    await expect(page.locator('text=New Patient')).toBeVisible();
    await expect(page.locator('text=First time using Doktu? Create your patient account to book your consultation.')).toBeVisible();
    await expect(page.locator('button:text("Sign Up as New Patient")')).toBeVisible();
    
    // Check Returning Patient card
    await expect(page.locator('text=Returning Patient')).toBeVisible();
    await expect(page.locator('text=Already have a Doktu account? Sign in to continue booking.')).toBeVisible();
    await expect(page.locator('button:text("Sign In to Account")')).toBeVisible();
  });

  test('should navigate to register-form with preserved parameters', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '3.00';
    
    await page.goto(`/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`);
    
    // Click "Sign Up as New Patient" button
    await page.click('button:text("Sign Up as New Patient")');
    
    // Verify navigation to register-form with preserved parameters
    await expect(page).toHaveURL(/\/register-form\?doctorId=.*&slot=.*&price=/);
    
    const currentUrl = page.url();
    const urlParams = new URL(currentUrl).searchParams;
    expect(urlParams.get('doctorId')).toBe(doctorId);
    expect(urlParams.get('slot')).toBe(slot);
    expect(urlParams.get('price')).toBe(price);
  });

  test('should navigate to login-form with preserved parameters', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '3.00';
    
    await page.goto(`/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`);
    
    // Click "Sign In to Account" button
    await page.click('button:text("Sign In to Account")');
    
    // Verify navigation to login-form with preserved parameters
    await expect(page).toHaveURL(/\/login-form\?doctorId=.*&slot=.*&price=/);
    
    const currentUrl = page.url();
    const urlParams = new URL(currentUrl).searchParams;
    expect(urlParams.get('doctorId')).toBe(doctorId);
    expect(urlParams.get('slot')).toBe(slot);
    expect(urlParams.get('price')).toBe(price);
  });

  test('should be responsive and stack cards on mobile', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T14:30:00.000Z&price=3.00');
    
    // Cards should be visible and stacked
    await expect(page.locator('text=New Patient')).toBeVisible();
    await expect(page.locator('text=Returning Patient')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    
    // Cards should still be visible in side-by-side layout
    await expect(page.locator('text=New Patient')).toBeVisible();
    await expect(page.locator('text=Returning Patient')).toBeVisible();
  });

  test('should have accessible buttons with aria-labels', async ({ page }) => {
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T14:30:00.000Z&price=3.00');
    
    // Check aria-labels exist for accessibility
    await expect(page.locator('button[aria-label*="Sign up as new patient"]')).toBeVisible();
    await expect(page.locator('button[aria-label*="Sign in to existing account"]')).toBeVisible();
  });

  test('should handle missing parameters gracefully', async ({ page }) => {
    // Test with missing parameters
    await page.goto('/auth-choice');
    
    // Page should still load but booking summary should not appear
    await expect(page.locator('text=New Patient')).toBeVisible();
    await expect(page.locator('text=Returning Patient')).toBeVisible();
    await expect(page.locator('.booking-summary')).not.toBeVisible();
  });

  test('should not show any back links or quick registration boxes', async ({ page }) => {
    await page.goto('/auth-choice?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T14:30:00.000Z&price=3.00');
    
    // Verify these elements are NOT present
    await expect(page.locator('text=Back to login options')).not.toBeVisible();
    await expect(page.locator('text=Quick registration')).not.toBeVisible();
    await expect(page.locator('text=← Back')).not.toBeVisible();
  });
});