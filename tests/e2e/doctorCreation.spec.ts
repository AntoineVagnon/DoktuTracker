/**
 * E2E Tests for Doctor Creation Feature
 *
 * Test Level: System/Acceptance (Black-Box)
 * Framework: Playwright
 * Format: BDD Gherkin scenarios
 * Priority: P0 and P1 tests
 *
 * Following: TESTING_PROTOCOL.md Section 4.3
 */

import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@doktu.co';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || ''; // From secure vault

// Helper Functions
async function dismissCookieBanner(page: Page) {
  // Try to dismiss cookie banner if present
  try {
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("I understand"), button:has-text("OK")').first();
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Cookie banner not present or already dismissed
  }
}

async function loginAsAdmin(page: Page) {
  // Navigate directly to admin page (auth state loaded from storage)
  await page.goto(`${BASE_URL}/admin`);

  // Wait for page load with timeout
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Give time for React to render

  // Dismiss cookie banner if present
  await dismissCookieBanner(page);

  // Check if we landed on admin page (if not, login failed)
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || !currentUrl.includes('/admin')) {
    throw new Error('Not authenticated - admin dashboard not accessible');
  }
}

async function navigateToDoctorsTab(page: Page) {
  // Wait for admin dashboard sidebar to load
  await page.waitForSelector('button:has-text("Doctors")', { timeout: 10000 });
  // Click the Doctors button in the admin sidebar (not the nav link)
  await page.click('button:has-text("Doctors")');
  // Wait for the Doctors section to load
  await page.waitForSelector('button:has-text("Create New Doctor")', { timeout: 10000 });
}

async function openCreateDoctorForm(page: Page) {
  await page.click('button:has-text("Create New Doctor")');
  await page.waitForSelector('text=Create New Doctor Account');
  // Dismiss cookie banner again in case it reappears
  await dismissCookieBanner(page);
}

async function fillDoctorForm(page: Page, data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  title?: string;
  specialization: string;
  consultationFee?: number;
  languages?: string;
  bio?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
}) {
  // Clear existing values and fill new ones
  await page.locator('input[name="firstName"], input[placeholder*="First"], input[placeholder*="John"]').first().clear();
  await page.locator('input[name="firstName"], input[placeholder*="First"], input[placeholder*="John"]').first().fill(data.firstName);

  await page.locator('input[name="lastName"], input[placeholder*="Last"], input[placeholder*="Smith"]').first().clear();
  await page.locator('input[name="lastName"], input[placeholder*="Last"], input[placeholder*="Smith"]').first().fill(data.lastName);

  await page.locator('input[name="email"], input[type="email"], input[placeholder*="doctor"]').first().clear();
  await page.locator('input[name="email"], input[type="email"], input[placeholder*="doctor"]').first().fill(data.email);

  await page.locator('input[name="password"], input[type="password"]').first().clear();
  await page.locator('input[name="password"], input[type="password"]').first().fill(data.password);

  if (data.title) {
    await page.selectOption('select:has-text("Title")', data.title);
  }

  await page.fill('input[placeholder*="General Medicine"]', data.specialization);

  if (data.consultationFee !== undefined) {
    await page.fill('input[type="number"]:near(:text("Consultation Fee"))', data.consultationFee.toString());
  }

  if (data.languages) {
    await page.fill('input[placeholder*="English, French"]', data.languages);
  }

  if (data.bio) {
    await page.fill('input[placeholder*="Brief description"]', data.bio);
  }

  if (data.licenseNumber) {
    await page.fill('input[placeholder*="Auto-generated"]', data.licenseNumber);
  }

  if (data.yearsOfExperience !== undefined) {
    await page.fill('input[type="number"]:near(:text("Years of Experience"))', data.yearsOfExperience.toString());
  }
}

test.describe('Feature: Doctor Account Creation in Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Background: Login as admin and navigate to Doctors tab
    await loginAsAdmin(page);
    await navigateToDoctorsTab(page);
  });

  test.describe('[P0] Critical Tests', () => {
    test('ST-001 [P0]: Successfully create doctor with all required fields', async ({ page }) => {
      // Given I click the "Create New Doctor" button
      await openCreateDoctorForm(page);

      // When I fill in all required fields
      const timestamp = Date.now();
      const doctorEmail = `jane.smith.${timestamp}@doktu.co`;

      await fillDoctorForm(page, {
        firstName: 'Jane',
        lastName: 'Smith',
        email: doctorEmail,
        password: 'SecureP@ss123',
        title: 'Dr.',
        specialization: 'Cardiology',
        consultationFee: 60.00,
        languages: 'English, French, Spanish',
      });

      // And I click "Create Doctor"
      await page.click('button:has-text("Create Doctor")');

      // Then I should see a success message
      await expect(page.locator('text=Doctor Created Successfully')).toBeVisible({ timeout: 10000 });

      // And the success alert should display credentials
      await expect(page.locator(`text=${doctorEmail}`)).toBeVisible();
      await expect(page.locator('text=SecureP@ss123')).toBeVisible();
      await expect(page.locator('text=⚠️ Make sure to save these credentials securely')).toBeVisible();

      // And credentials should remain visible for at least 5 seconds
      await page.waitForTimeout(5000);
      await expect(page.locator(`text=${doctorEmail}`)).toBeVisible();

      // Cleanup: Dismiss alert
      await page.click('button:has-text("Dismiss")');
    });

    test('ST-004 [P0]: Unauthenticated user cannot access endpoint', async ({ page, request }) => {
      // Given I am NOT logged in (logout)
      await page.goto(BASE_URL);
      await page.click('text=Logout', { timeout: 5000 }).catch(() => {
        // Already logged out
      });

      // When I send a POST request to the endpoint
      const response = await request.post(`${BASE_URL}/api/admin/create-doctor`, {
        data: {
          email: 'unauthorized@test.com',
          password: 'SecurePass123',
          firstName: 'Test',
          lastName: 'User',
          specialization: 'General Medicine',
        },
      });

      // Then I should receive a 401 Unauthorized response
      expect(response.status()).toBe(401);
    });

    test('ST-005 [P0]: Doctor-role user cannot create doctors', async ({ page }) => {
      // Given I am logged in as a doctor user
      await page.goto(BASE_URL);
      await page.click('text=Sign In');
      await page.fill('[name="email"]', 'test.doctor@doktu.co');
      await page.fill('[name="password"]', 'TestDoctor123!');
      await page.click('button:has-text("Sign In")');

      // When I attempt to navigate to admin dashboard
      await page.goto(`${BASE_URL}/admin/dashboard`);

      // Then I should be redirected to home page
      await page.waitForURL(BASE_URL);
      await expect(page).toHaveURL(BASE_URL);
    });

    test('ST-016 [P0]: Doctor appears in doctor list after creation', async ({ page }) => {
      // Create a doctor first
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      const doctorEmail = `listtest.${timestamp}@doktu.co`;

      await fillDoctorForm(page, {
        firstName: 'ListTest',
        lastName: 'Doctor',
        email: doctorEmail,
        password: 'SecurePass123',
        specialization: 'Neurology',
        consultationFee: 75,
      });

      await page.click('button:has-text("Create Doctor")');
      await expect(page.locator('text=Doctor Created Successfully')).toBeVisible();

      // Navigate to public doctor list
      await page.goto(`${BASE_URL}`);
      await page.click('text=Find a Doctor');

      // Verify doctor appears in list
      await expect(page.locator('text=ListTest Doctor')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Neurology')).toBeVisible();
    });
  });

  test.describe('[P1] High Priority Tests', () => {
    test('ST-002 [P1]: Fail to create doctor with duplicate email', async ({ page }) => {
      // Given a doctor already exists
      const existingEmail = 'test.doctor@doktu.co';

      // And I click the "Create New Doctor" button
      await openCreateDoctorForm(page);

      // When I enter the existing email
      await fillDoctorForm(page, {
        firstName: 'Duplicate',
        lastName: 'Test',
        email: existingEmail,
        password: 'SecurePass123',
        specialization: 'General Medicine',
      });

      await page.click('button:has-text("Create Doctor")');

      // Then I should see an error message
      await expect(page.locator('text=User already registered')).toBeVisible({ timeout: 10000 });

      // And the form should remain visible
      await expect(page.locator('text=Create New Doctor Account')).toBeVisible();
    });

    test('ST-007 [P1]: Empty required fields rejected', async ({ page }) => {
      // Given I click the "Create New Doctor" button
      await openCreateDoctorForm(page);

      // When I leave the Email field empty and try to submit
      await page.fill('[name="firstName"]', 'John');
      await page.fill('[name="lastName"]', 'Doe');
      // Leave email empty
      await page.fill('[name="password"]', 'SecurePass123');
      await page.fill('input[placeholder*="General Medicine"]', 'Cardiology');

      await page.click('button:has-text("Create Doctor")');

      // Then browser validation should block submission
      const emailInput = page.locator('[name="email"]');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toContain('fill');
    });

    test('ST-008 [P1]: Invalid email format rejected', async ({ page }) => {
      // Given I click the "Create New Doctor" button
      await openCreateDoctorForm(page);

      // When I enter invalid email format
      await page.fill('[name="email"]', 'notanemail');
      await page.fill('[name="firstName"]', 'John');
      await page.fill('[name="lastName"]', 'Doe');
      await page.fill('[name="password"]', 'SecurePass123');
      await page.fill('input[placeholder*="General Medicine"]', 'Cardiology');

      await page.click('button:has-text("Create Doctor")');

      // Then browser validation should show error
      const emailInput = page.locator('[name="email"]');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toContain('@');
    });

    test('ST-011 [P1]: Password generator creates secure password', async ({ page }) => {
      // Given I click the "Create New Doctor" button
      await openCreateDoctorForm(page);

      // When I click the "Generate" button
      await page.click('button:has-text("Generate")');

      // Then a password should be auto-filled
      const password = await page.inputValue('[name="password"]');

      expect(password.length).toBe(12);
      expect(password).toMatch(/[A-Z]/); // At least one uppercase
      expect(password).toMatch(/[a-z]/); // At least one lowercase
      expect(password).toMatch(/[0-9]/); // At least one number
      expect(password).toMatch(/[!@#$%^&*]/); // At least one special char
    });

    test('ST-012 [P1]: Success message displays credentials prominently', async ({ page }) => {
      // Create a doctor
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      const doctorEmail = `credentials.${timestamp}@doktu.co`;

      await fillDoctorForm(page, {
        firstName: 'Credentials',
        lastName: 'Test',
        email: doctorEmail,
        password: 'TestP@ss123',
        specialization: 'General Medicine',
      });

      await page.click('button:has-text("Create Doctor")');

      // Verify success alert is prominent
      const alert = page.locator('[role="alert"]').filter({ hasText: 'Doctor account created successfully' });
      await expect(alert).toBeVisible();

      // Verify green background (success indicator)
      const alertClasses = await alert.getAttribute('class');
      expect(alertClasses).toContain('green');

      // Verify credentials displayed with labels
      await expect(page.locator('text=Email:')).toBeVisible();
      await expect(page.locator('text=Password:')).toBeVisible();
      await expect(page.locator(`text=${doctorEmail}`)).toBeVisible();
      await expect(page.locator('text=TestP@ss123')).toBeVisible();

      // Verify warning message
      await expect(page.locator('text=The password won\'t be shown again')).toBeVisible();

      // Verify Dismiss button
      await expect(page.locator('button:has-text("Dismiss")')).toBeVisible();
    });

    test('ST-013 [P1]: Credentials remain visible until manually dismissed', async ({ page }) => {
      // Create a doctor
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      const doctorEmail = `persist.${timestamp}@doktu.co`;

      await fillDoctorForm(page, {
        firstName: 'Persist',
        lastName: 'Test',
        email: doctorEmail,
        password: 'TestP@ss123',
        specialization: 'General Medicine',
      });

      await page.click('button:has-text("Create Doctor")');

      // Wait 10 seconds
      await page.waitForTimeout(10000);

      // Credentials should still be visible
      await expect(page.locator(`text=${doctorEmail}`)).toBeVisible();

      // Click Dismiss
      await page.click('button:has-text("Dismiss")');

      // Credentials should disappear
      await expect(page.locator(`text=${doctorEmail}`)).not.toBeVisible();
    });

    test('ST-014 [P1]: Form resets after successful creation', async ({ page }) => {
      // Create a doctor
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      const doctorEmail = `reset.${timestamp}@doktu.co`;

      await fillDoctorForm(page, {
        firstName: 'Reset',
        lastName: 'Test',
        email: doctorEmail,
        password: 'TestP@ss123',
        specialization: 'General Medicine',
      });

      await page.click('button:has-text("Create Doctor")');
      await expect(page.locator('text=Doctor Created Successfully')).toBeVisible();

      // Dismiss alert
      await page.click('button:has-text("Dismiss")');

      // Open form again
      await page.click('button:has-text("Create New Doctor")');

      // Verify all fields are empty/default
      expect(await page.inputValue('[name="firstName"]')).toBe('');
      expect(await page.inputValue('[name="lastName"]')).toBe('');
      expect(await page.inputValue('[name="email"]')).toBe('');
      expect(await page.inputValue('[name="password"]')).toBe('');

      // Check defaults
      const feeValue = await page.inputValue('input[type="number"]:near(:text("Consultation Fee"))');
      expect(parseFloat(feeValue)).toBe(35);
    });
  });

  test.describe('[P1] Boundary Value Analysis (BVA)', () => {
    const passwordTestCases = [
      { length: 7, password: 'Pass12!', shouldPass: false, description: 'Password 7 chars (rejected)' },
      { length: 8, password: 'Pass123!', shouldPass: true, description: 'Password 8 chars (accepted)' },
      { length: 9, password: 'Pass1234!', shouldPass: true, description: 'Password 9 chars (accepted)' },
      { length: 127, password: 'a'.repeat(127), shouldPass: true, description: 'Password 127 chars (accepted)' },
      { length: 128, password: 'a'.repeat(128), shouldPass: true, description: 'Password 128 chars (accepted)' },
    ];

    passwordTestCases.forEach(({ length, password, shouldPass, description }) => {
      test(`ST-003 [P1]: BVA - ${description}`, async ({ page }) => {
        await openCreateDoctorForm(page);

        const timestamp = Date.now();
        await fillDoctorForm(page, {
          firstName: 'BVA',
          lastName: 'Test',
          email: `bva.${timestamp}@doktu.co`,
          password: password,
          specialization: 'General Medicine',
        });

        await page.click('button:has-text("Create Doctor")');

        if (shouldPass) {
          // Should succeed
          await expect(page.locator('text=Doctor Created Successfully')).toBeVisible({ timeout: 10000 });
        } else {
          // Should fail with validation error
          const passwordInput = page.locator('[name="password"]');
          const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
          expect(validationMessage).toContain('8');
        }
      });
    });

    const feeTestCases = [
      { fee: 0, shouldPass: true },
      { fee: 0.01, shouldPass: true },
      { fee: 999.98, shouldPass: true },
      { fee: 999.99, shouldPass: true },
      { fee: 1000.00, shouldPass: true },
    ];

    feeTestCases.forEach(({ fee, shouldPass }) => {
      test(`ST-009 [P2]: BVA - Consultation fee ${fee} EUR`, async ({ page }) => {
        await openCreateDoctorForm(page);

        const timestamp = Date.now();
        await fillDoctorForm(page, {
          firstName: 'Fee',
          lastName: 'Test',
          email: `fee.${timestamp}@doktu.co`,
          password: 'SecurePass123',
          specialization: 'General Medicine',
          consultationFee: fee,
        });

        await page.click('button:has-text("Create Doctor")');

        if (shouldPass) {
          await expect(page.locator('text=Doctor Created Successfully')).toBeVisible({ timeout: 10000 });
        }
      });
    });

    test('ST-010 [P2]: BVA - Years of experience = 0 (accepted)', async ({ page }) => {
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      await fillDoctorForm(page, {
        firstName: 'Experience',
        lastName: 'Test',
        email: `exp.${timestamp}@doktu.co`,
        password: 'SecurePass123',
        specialization: 'General Medicine',
        yearsOfExperience: 0,
      });

      await page.click('button:has-text("Create Doctor")');
      await expect(page.locator('text=Doctor Created Successfully')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('[P2] Medium Priority Tests', () => {
    test('ST-018 [P2]: Create doctor with minimal required fields only', async ({ page }) => {
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      const doctorEmail = `minimal.${timestamp}@doktu.co`;

      // Fill ONLY required fields
      await page.fill('[name="firstName"]', 'Minimal');
      await page.fill('[name="lastName"]', 'Test');
      await page.fill('[name="email"]', doctorEmail);
      await page.fill('[name="password"]', 'SecurePass123');
      await page.fill('input[placeholder*="General Medicine"]', 'Pediatrics');

      await page.click('button:has-text("Create Doctor")');

      // Should succeed
      await expect(page.locator('text=Doctor Created Successfully')).toBeVisible({ timeout: 10000 });
    });

    test('ST-019 [P2]: Cancel button discards entered data', async ({ page }) => {
      await openCreateDoctorForm(page);

      // Enter some data
      await page.fill('[name="firstName"]', 'Discard');
      await page.fill('[name="lastName"]', 'Test');
      await page.fill('[name="email"]', 'discard@test.com');

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Form should close
      await expect(page.locator('text=Create New Doctor Account')).not.toBeVisible();

      // Open form again
      await page.click('button:has-text("Create New Doctor")');

      // Data should be cleared
      expect(await page.inputValue('[name="firstName"]')).toBe('');
      expect(await page.inputValue('[name="lastName"]')).toBe('');
      expect(await page.inputValue('[name="email"]')).toBe('');
    });

    test('ST-020 [P2]: Form validation prevents submit with partially filled data', async ({ page }) => {
      await openCreateDoctorForm(page);

      // Fill only some fields
      await page.fill('[name="firstName"]', 'Partial');
      await page.fill('[name="lastName"]', 'Test');
      // Leave email and password empty

      await page.click('button:has-text("Create Doctor")');

      // Browser validation should block
      const emailInput = page.locator('[name="email"]');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });
  });

  test.describe('[P3] Low Priority Tests', () => {
    test('ST-021 [P3]: Placeholder text displays correctly', async ({ page }) => {
      await openCreateDoctorForm(page);

      // Check placeholders
      await expect(page.locator('input[placeholder="John"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Smith"]')).toBeVisible();
      await expect(page.locator('input[placeholder="doctor@doktu.co"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Minimum 8 characters"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="General Medicine"]')).toBeVisible();
    });

    test('ST-022 [P3]: Button text changes during submission', async ({ page }) => {
      await openCreateDoctorForm(page);

      const timestamp = Date.now();
      await fillDoctorForm(page, {
        firstName: 'Button',
        lastName: 'Test',
        email: `button.${timestamp}@doktu.co`,
        password: 'SecurePass123',
        specialization: 'General Medicine',
      });

      const submitButton = page.locator('button:has-text("Create Doctor")');

      // Click and immediately check text
      await submitButton.click();
      await expect(page.locator('button:has-text("Creating...")')).toBeVisible();

      // Button should be disabled
      expect(await submitButton.isDisabled()).toBe(true);
    });
  });
});
