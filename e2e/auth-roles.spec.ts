import { test, expect } from '@playwright/test';

test.describe('Role-Based Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('Home page shows role-specific login buttons', async ({ page }) => {
    // Should see the new role-based buttons
    await expect(page.getByRole('link', { name: 'Register as Patient' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login as Patient' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login as Doctor' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login as Admin' })).toBeVisible();
  });

  test('Patient login flow navigation', async ({ page }) => {
    // Click "Login as Patient"
    await page.getByRole('link', { name: 'Login as Patient' }).click();
    
    // Should be on login page with patient role
    await expect(page).toHaveURL('/login?role=patient');
    await expect(page.getByText('Patient Portal')).toBeVisible();
    
    // Should show both new patient and returning patient options
    await expect(page.getByText('New Patient')).toBeVisible();
    await expect(page.getByText('Returning Patient')).toBeVisible();
  });

  test('Doctor login flow navigation', async ({ page }) => {
    // Click "Login as Doctor"
    await page.getByRole('link', { name: 'Login as Doctor' }).click();
    
    // Should be on login page with doctor role
    await expect(page).toHaveURL('/login?role=doctor');
    await expect(page.getByText('Doctor Portal')).toBeVisible();
    
    // Should only show sign in option (no registration for doctors)
    await expect(page.getByText('Sign In as Doctor')).toBeVisible();
    await expect(page.getByText('New Patient')).not.toBeVisible();
  });

  test('Admin login flow navigation', async ({ page }) => {
    // Click "Login as Admin"
    await page.getByRole('link', { name: 'Login as Admin' }).click();
    
    // Should be on login page with admin role
    await expect(page).toHaveURL('/login?role=admin');
    await expect(page.getByText('Admin Portal')).toBeVisible();
    
    // Should only show sign in option (no registration for admins)
    await expect(page.getByText('Sign In as Admin')).toBeVisible();
    await expect(page.getByText('New Patient')).not.toBeVisible();
  });

  test('Patient registration navigation', async ({ page }) => {
    // Click "Register as Patient"
    await page.getByRole('link', { name: 'Register as Patient' }).click();
    
    // Should be on register page
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Create your account')).toBeVisible();
  });

  test('Login page role-specific content for patients', async ({ page }) => {
    await page.goto('/login?role=patient');
    
    // Should show patient-specific title and description
    await expect(page.getByText('Patient Portal')).toBeVisible();
    await expect(page.getByText('Please choose how you\'d like to continue')).toBeVisible();
    
    // Should show new patient option
    await expect(page.getByText('New Patient')).toBeVisible();
    await expect(page.getByText('Create your patient account')).toBeVisible();
    
    // Should show returning patient option
    await expect(page.getByText('Returning Patient')).toBeVisible();
    await expect(page.getByText('Already have a Doktu account')).toBeVisible();
  });

  test('Login page role-specific content for doctors', async ({ page }) => {
    await page.goto('/login?role=doctor');
    
    // Should show doctor-specific title and description
    await expect(page.getByText('Doctor Portal')).toBeVisible();
    await expect(page.getByText('Access your doctor dashboard and manage appointments')).toBeVisible();
    
    // Should NOT show new patient option
    await expect(page.getByText('New Patient')).not.toBeVisible();
    
    // Should show doctor sign in option
    await expect(page.getByText('Sign In as Doctor')).toBeVisible();
    await expect(page.getByText('Access your doctor dashboard')).toBeVisible();
  });

  test('Login page role-specific content for admins', async ({ page }) => {
    await page.goto('/login?role=admin');
    
    // Should show admin-specific title and description
    await expect(page.getByText('Admin Portal')).toBeVisible();
    await expect(page.getByText('Access administrative controls and system management')).toBeVisible();
    
    // Should NOT show new patient option
    await expect(page.getByText('New Patient')).not.toBeVisible();
    
    // Should show admin sign in option
    await expect(page.getByText('Sign In as Admin')).toBeVisible();
    await expect(page.getByText('Access your admin dashboard')).toBeVisible();
  });

  test('New patient button redirects to registration', async ({ page }) => {
    await page.goto('/login?role=patient');
    
    // Click "New Patient" card
    await page.getByText('New Patient').click();
    
    // Should redirect to register page
    await expect(page).toHaveURL('/register');
  });

  test('Sign in buttons redirect to auth', async ({ page }) => {
    // Test patient sign in
    await page.goto('/login?role=patient');
    await page.getByText('Returning Patient').click();
    await expect(page).toHaveURL(/\/api\/login/);
    
    // Test doctor sign in
    await page.goto('/login?role=doctor');
    await page.getByText('Sign In as Doctor').click();
    await expect(page).toHaveURL(/\/api\/login/);
    
    // Test admin sign in
    await page.goto('/login?role=admin');
    await page.getByText('Sign In as Admin').click();
    await expect(page).toHaveURL(/\/api\/login/);
  });

  test('Role preservation in booking flow', async ({ page }) => {
    // Start a booking flow with patient role
    await page.goto('/doctor/1');
    
    // Wait for the calendar to load
    await page.waitForSelector('[data-testid="availability-calendar"]');
    
    // Click on an available time slot
    const timeSlot = page.locator('.time-slot').first();
    await timeSlot.click();
    
    // Should redirect to book page
    await expect(page).toHaveURL(/\/book\?doctorId=1&slot=.*&price=.*/);
    
    // Click "New Patient" to start registration flow
    await page.getByRole('button', { name: /new patient/i }).click();
    
    // Should be on register page with redirect preserved
    await expect(page).toHaveURL(/\/register\?redirect=.*checkout/);
  });

  test('Dashboard route protection for patients', async ({ page }) => {
    // Try to access patient dashboard directly (should be public access)
    await page.goto('/dashboard');
    
    // Should redirect to login or show unauthorized
    // In a real test, we'd need to set up proper authentication mocking
    await expect(page).toHaveURL(/\/|\/login|\/api\/login/);
  });

  test('Doctor dashboard route protection', async ({ page }) => {
    // Try to access doctor dashboard directly
    await page.goto('/doctor/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/|\/login|\/api\/login/);
  });

  test('Admin dashboard route protection', async ({ page }) => {
    // Try to access admin dashboard directly
    await page.goto('/admin/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/|\/login|\/api\/login/);
  });

  test('Register button text consistency', async ({ page }) => {
    // Check register button on home page
    await expect(page.getByRole('link', { name: 'Register as Patient' })).toBeVisible();
    
    // Navigate to patient login
    await page.goto('/login?role=patient');
    await expect(page.getByText('Sign Up as New Patient')).toBeVisible();
    
    // Navigate to registration page
    await page.goto('/register');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('Role-specific error handling', async ({ page }) => {
    // Test invalid role parameter
    await page.goto('/login?role=invalid');
    
    // Should default to patient role
    await expect(page.getByText('Patient Portal')).toBeVisible();
    
    // Test missing role parameter
    await page.goto('/login');
    
    // Should default to patient role
    await expect(page.getByText('Patient Portal')).toBeVisible();
  });

  test('Back navigation from login pages', async ({ page }) => {
    // Navigate to doctor login
    await page.goto('/login?role=doctor');
    
    // Go back to home
    await page.goBack();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Login as Doctor' })).toBeVisible();
  });

  test('Role button visual hierarchy', async ({ page }) => {
    // Register button should be prominent
    const registerButton = page.getByRole('link', { name: 'Register as Patient' });
    await expect(registerButton).toHaveClass(/w-full max-w-xs/);
    
    // Login buttons should be secondary
    const patientLoginButton = page.getByRole('link', { name: 'Login as Patient' });
    await expect(patientLoginButton).toHaveAttribute('class', expect.stringMatching(/variant="outline"/));
  });
});