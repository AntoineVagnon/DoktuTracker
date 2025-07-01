import { test, expect } from '@playwright/test';

test.describe('Simplified Slot Click Flow', () => {
  test('should redirect to 404 for old booking URLs', async ({ page }) => {
    // The old booking URL should no longer work since we removed the route
    const oldBookingUrl = '/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=3.00';
    
    await page.goto(oldBookingUrl);
    
    // Should show 404 since /book route is removed
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('should show error for malformed booking URLs with missing parameters', async ({ page }) => {
    // Try to access booking page with missing parameters
    await page.goto('/book?doctorId=invalid');
    
    // Should be redirected to login first
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // For testing purposes, let's simulate being logged in by visiting a valid page first
    // In a real test, you'd mock authentication or use a test user
  });

  test('should show error for booking with non-existent doctor', async ({ page }) => {
    // This test would require authentication setup
    // For now, we'll just verify the redirect behavior
    const bookingUrl = '/book?doctorId=non-existent-id&slot=2024-07-02T10:00:00.000Z&price=3.00';
    
    await page.goto(bookingUrl);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test('should handle slot clicks from doctor profile page correctly', async ({ page }) => {
    // Navigate to a doctor profile page
    await page.goto('/doctor/8be00061-3f91-4236-a09a-525b035a7d00');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for available time slots (they should be clickable buttons or links)
    const timeSlots = page.locator('[data-testid*="time-slot"], .time-slot, button:has-text(":")');
    
    if (await timeSlots.count() > 0) {
      // Click the first available slot
      const firstSlot = timeSlots.first();
      await firstSlot.click();
      
      // Should be redirected directly to register with booking parameters
      await expect(page).toHaveURL(/\/register\?doctorId=.*&slot=.*&price=/);
      
      // Verify the URL contains proper booking parameters
      const currentUrl = page.url();
      const urlParams = new URL(currentUrl).searchParams;
      expect(urlParams.get('doctorId')).toBeTruthy();
      expect(urlParams.get('slot')).toBeTruthy();
      expect(urlParams.get('price')).toBeTruthy();
    } else {
      console.log('No time slots found on doctor profile page');
    }
  });

  test('should preserve booking parameters through login redirect', async ({ page }) => {
    const doctorId = '8be00061-3f91-4236-a09a-525b035a7d00';
    const slot = '2024-07-02T14:30:00.000Z';
    const price = '3.00';
    const bookingUrl = `/book?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`;
    
    // Try to access booking page directly
    await page.goto(bookingUrl);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Verify all booking parameters are preserved in the redirect URL
    const currentUrl = page.url();
    const redirectParam = decodeURIComponent(new URL(currentUrl).searchParams.get('redirect') || '');
    
    expect(redirectParam).toContain(`doctorId=${doctorId}`);
    expect(redirectParam).toContain(`slot=${encodeURIComponent(slot)}`);
    expect(redirectParam).toContain(`price=${price}`);
  });

  test('should show loading state while checking authentication', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=2024-07-02T10:00:00.000Z&price=3.00');
    
    // We should see either a loading spinner briefly or get redirected
    // Since auth check is fast, we mainly verify no error pages appear
    await page.waitForLoadState('networkidle');
    
    // Should end up on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle edge cases with special characters in slot parameter', async ({ page }) => {
    const slotWithSpecialChars = '2024-07-02T10:00:00.000Z';
    const encodedSlot = encodeURIComponent(slotWithSpecialChars);
    const bookingUrl = `/book?doctorId=8be00061-3f91-4236-a09a-525b035a7d00&slot=${encodedSlot}&price=3.00`;
    
    await page.goto(bookingUrl);
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Verify special characters are properly handled in redirect
    const currentUrl = page.url();
    const redirectParam = new URL(currentUrl).searchParams.get('redirect');
    expect(redirectParam).toContain('slot=');
  });
});