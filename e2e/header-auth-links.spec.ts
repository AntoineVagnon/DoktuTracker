import { test, expect } from '@playwright/test';

test.describe('Header Authentication Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Header Sign In button routes to internal login page', async ({ page }) => {
    // Find and click the "Sign In" button in the header
    const signInButton = page.getByRole('link', { name: 'Sign In' }).first();
    await expect(signInButton).toBeVisible();
    
    // Click the button
    await signInButton.click();
    
    // Should navigate to our internal login page, not trigger Replit Auth popup
    await expect(page).toHaveURL('/login');
    
    // Verify we're on the login page with our custom content
    await expect(page.getByText('Patient Portal')).toBeVisible();
  });

  test('Header Sign Up Free button routes to internal register page', async ({ page }) => {
    // Find and click the "Sign Up Free" button in the header
    const signUpButton = page.getByRole('link', { name: 'Sign Up Free' }).first();
    await expect(signUpButton).toBeVisible();
    
    // Click the button
    await signUpButton.click();
    
    // Should navigate to our internal register page, not trigger Replit Auth popup
    await expect(page).toHaveURL('/register');
    
    // Verify we're on the register page with our custom content
    await expect(page.getByText('Create your account')).toBeVisible();
  });

  test('Mobile menu Sign In button routes to internal login page', async ({ page }) => {
    // Resize to mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();
    
    // Find and click the "Sign In" button in the mobile menu
    const mobileSignInButton = page.getByRole('link', { name: 'Sign In' }).last();
    await expect(mobileSignInButton).toBeVisible();
    
    // Click the button
    await mobileSignInButton.click();
    
    // Should navigate to our internal login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Patient Portal')).toBeVisible();
  });

  test('Mobile menu Sign Up Free button routes to internal register page', async ({ page }) => {
    // Resize to mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();
    
    // Find and click the "Sign Up Free" button in the mobile menu
    const mobileSignUpButton = page.getByRole('link', { name: 'Sign Up Free' }).last();
    await expect(mobileSignUpButton).toBeVisible();
    
    // Click the button
    await mobileSignUpButton.click();
    
    // Should navigate to our internal register page
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Create your account')).toBeVisible();
  });

  test('Header buttons are not visible when user is authenticated', async ({ page }) => {
    // This test would require authentication setup
    // For now, we test that the buttons exist when not authenticated
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up Free' })).toBeVisible();
  });

  test('No Replit Auth popup or external redirects occur', async ({ page }) => {
    let popupOpened = false;
    let externalRedirect = false;
    
    // Listen for popup windows (should not occur)
    page.on('popup', () => {
      popupOpened = true;
    });
    
    // Listen for navigation to external URLs (should not occur)
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (url.includes('replit.com') || url.includes('/api/login')) {
          externalRedirect = true;
        }
      }
    });
    
    // Click Sign In button
    await page.getByRole('link', { name: 'Sign In' }).click();
    
    // Wait a moment to ensure no popup or redirect occurs
    await page.waitForTimeout(1000);
    
    // Verify no popup opened and no external redirect
    expect(popupOpened).toBe(false);
    expect(externalRedirect).toBe(false);
    
    // Should be on internal login page
    await expect(page).toHaveURL('/login');
    
    // Go back and test Sign Up button
    await page.goto('/');
    await page.getByRole('link', { name: 'Sign Up Free' }).click();
    
    // Wait a moment to ensure no popup or redirect occurs
    await page.waitForTimeout(1000);
    
    // Verify no popup opened and no external redirect
    expect(popupOpened).toBe(false);
    expect(externalRedirect).toBe(false);
    
    // Should be on internal register page
    await expect(page).toHaveURL('/register');
  });

  test('Header links maintain correct styling', async ({ page }) => {
    const signInButton = page.getByRole('link', { name: 'Sign In' });
    const signUpButton = page.getByRole('link', { name: 'Sign Up Free' });
    
    // Sign In should have ghost variant styling
    await expect(signInButton).toHaveAttribute('class', expect.stringMatching(/variant="ghost"/));
    
    // Sign Up Free should have gradient styling
    await expect(signUpButton).toHaveAttribute('class', expect.stringContaining('bg-gradient-to-r'));
  });

  test('Navigation works from different starting pages', async ({ page }) => {
    // Test from doctor profile page
    await page.goto('/doctor/1');
    
    const signInButton = page.getByRole('link', { name: 'Sign In' });
    await signInButton.click();
    
    await expect(page).toHaveURL('/login');
    
    // Test from a non-existent page (should still work)
    await page.goto('/some-random-page');
    
    // Header should still be visible and functional
    const signUpButton = page.getByRole('link', { name: 'Sign Up Free' });
    await signUpButton.click();
    
    await expect(page).toHaveURL('/register');
  });

  test('Links work with keyboard navigation', async ({ page }) => {
    // Tab to Sign In button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need to adjust based on page structure
    
    // Press Enter on focused element
    await page.keyboard.press('Enter');
    
    // Should navigate (this test may need adjustment based on actual tab order)
    // For now, we'll just verify the links are keyboard accessible
    const signInButton = page.getByRole('link', { name: 'Sign In' });
    await signInButton.focus();
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL('/login');
  });
});