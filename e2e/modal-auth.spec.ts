import { test, expect } from '@playwright/test';

test.describe('AuthModal Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('Header "Sign In" button opens AuthModal with Login tab', async ({ page }) => {
    // Click "Sign In" button in header
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Check that modal is visible
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByText('Access your account or create a new one')).toBeVisible();
    
    // Check that Login tab is active
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
    
    // Check login form fields are visible
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('Header "Sign Up Free" button opens AuthModal with Signup tab', async ({ page }) => {
    // Click "Sign Up Free" button in header
    await page.getByRole('button', { name: 'Sign Up Free' }).first().click();
    
    // Check that modal is visible
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    
    // Check that Sign Up tab is active
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
    
    // Check signup form fields are visible
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('Home page "Get Started" button opens AuthModal with Signup tab', async ({ page }) => {
    // Click "Get Started" button in hero section
    await page.getByRole('button', { name: 'Get Started' }).click();
    
    // Check that modal is visible and Signup tab is active
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
  });

  test('Home page "Sign in" link opens AuthModal with Login tab', async ({ page }) => {
    // Click "Sign in" link in hero section
    await page.getByText('Already have an account?').locator('..').getByRole('button', { name: 'Sign in' }).click();
    
    // Check that modal is visible and Login tab is active
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
  });

  test('Bottom CTA "Sign In" button opens AuthModal with Login tab', async ({ page }) => {
    // Scroll to bottom CTA section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Click "Sign In" button in bottom CTA
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    
    // Check that modal is visible and Login tab is active
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
  });

  test('Bottom CTA "Sign Up" button opens AuthModal with Signup tab', async ({ page }) => {
    // Scroll to bottom CTA section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Click "Sign Up" button in bottom CTA
    await page.getByRole('button', { name: 'Sign Up' }).last().click();
    
    // Check that modal is visible and Signup tab is active
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
  });

  test('Can switch between Login and Signup tabs in modal', async ({ page }) => {
    // Open modal with login tab
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Verify Login tab is active
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByLabel('Email')).toBeVisible();
    
    // Switch to Signup tab
    await page.getByRole('tab', { name: 'Sign Up' }).click();
    
    // Verify Signup tab is now active
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    
    // Switch back to Login tab
    await page.getByRole('tab', { name: 'Login' }).click();
    
    // Verify Login tab is active again
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('Modal closes when clicking backdrop', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Verify modal is open
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    
    // Click on backdrop (outside modal content)
    await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 } });
    
    // Verify modal is closed
    await expect(page.getByText('Welcome to Doktu')).not.toBeVisible();
  });

  test('Modal closes when clicking X button', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Verify modal is open
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    
    // Click close button
    await page.getByRole('button').filter({ hasText: '×' }).click();
    
    // Verify modal is closed
    await expect(page.getByText('Welcome to Doktu')).not.toBeVisible();
  });

  test('Login form validation works', async ({ page }) => {
    // Open modal and switch to login tab
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    
    // Check for validation errors (form should not submit)
    await expect(page.getByText('Welcome to Doktu')).toBeVisible(); // Modal should still be open
    
    // Fill invalid email
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    
    // Should show email validation error
    await expect(page.getByText('Invalid email address')).toBeVisible();
    
    // Fill valid email but short password
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('123');
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    
    // Should show password validation error
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('Signup form validation works', async ({ page }) => {
    // Open modal and switch to signup tab
    await page.getByRole('button', { name: 'Sign Up Free' }).first().click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Check for validation errors (form should not submit)
    await expect(page.getByText('Welcome to Doktu')).toBeVisible(); // Modal should still be open
    
    // Fill partial form
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Should show validation errors
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('Cross-tab navigation links work', async ({ page }) => {
    // Open modal with login tab
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    
    // Click "Sign up" link in login tab
    await page.getByText("Don't have an account?").locator('..').getByRole('button', { name: 'Sign up' }).click();
    
    // Should switch to signup tab
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
    
    // Click "Sign in" link in signup tab
    await page.getByText('Already have an account?').locator('..').getByRole('button', { name: 'Sign in' }).click();
    
    // Should switch back to login tab
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
  });

  test('Mobile menu buttons trigger AuthModal', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.getByRole('button', { name: 'Menu' }).click();
    
    // Click "Sign In" in mobile menu
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Check that modal opens with Login tab
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Login' })).toHaveAttribute('data-state', 'active');
    
    // Close modal
    await page.getByRole('button').filter({ hasText: '×' }).click();
    
    // Open mobile menu again
    await page.getByRole('button', { name: 'Menu' }).click();
    
    // Click "Sign Up Free" in mobile menu
    await page.getByRole('button', { name: 'Sign Up Free' }).click();
    
    // Check that modal opens with Signup tab
    await expect(page.getByText('Welcome to Doktu')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign Up' })).toHaveAttribute('data-state', 'active');
  });

  test('AuthModal does not interfere with booking flow', async ({ page }) => {
    // Navigate to a doctor profile
    await page.goto('/doctor/1');
    
    // Wait for the calendar to load
    await page.waitForSelector('[data-testid="availability-calendar"]', { timeout: 10000 });
    
    // Click on an available time slot (this should not trigger AuthModal)
    const timeSlot = page.locator('.time-slot').first();
    if (await timeSlot.count() > 0) {
      await timeSlot.click();
      
      // Should be redirected to booking page, not open AuthModal
      await expect(page).toHaveURL(/\/book\?doctorId=1&slot=.*&price=.*/);
      
      // AuthModal should not be visible
      await expect(page.getByText('Welcome to Doktu')).not.toBeVisible();
    }
  });

  test('No regression in existing booking flow with redirect pages', async ({ page }) => {
    // Navigate to booking page directly
    await page.goto('/book?doctorId=1&slot=2025-01-02T10:00:00&price=35');
    
    // Should see the booking page, not a modal
    await expect(page.getByText('Book Your Appointment')).toBeVisible();
    
    // Click "New Patient" button
    await page.getByRole('button', { name: /new patient/i }).first().click();
    
    // Should be redirected to register page with redirect parameter
    await expect(page).toHaveURL(/\/register\?redirect=.*checkout/);
    
    // Should see registration form, not a modal
    await expect(page.getByText('Create your account')).toBeVisible();
    
    // Navigate to login page with redirect
    await page.goto('/login?redirect=/checkout&doctorId=1&slot=2025-01-02T10:00:00&price=35');
    
    // Should see login page, not a modal
    await expect(page.getByText('Patient Portal')).toBeVisible();
  });
});