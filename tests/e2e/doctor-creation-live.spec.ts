/**
 * Live test for doctor creation with actual Supabase operation
 * Tests the full flow from form submission to database creation
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';

test.use({
  storageState: './playwright/.auth/admin.json'
});

test.describe('Doctor Creation - Live Test', () => {
  test('Admin can create a doctor account successfully', async ({ page }) => {
    // Navigate to admin page
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('domcontentloaded');

    // Dismiss cookie banner if present
    try {
      const acceptButton = page.locator('button:has-text("Accept"), button:has-text("I understand")').first();
      if (await acceptButton.isVisible({ timeout: 2000 })) {
        await acceptButton.click();
      }
    } catch {
      // No cookie banner
    }

    // Click Doctors tab
    await page.click('button:has-text("Doctors")', { timeout: 10000 });

    // Click "Create New Doctor" button
    const createButton = page.locator('button:has-text("Create New Doctor")');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for form to open
    await expect(page.locator('text=Create New Doctor Account')).toBeVisible();

    // Generate unique email to avoid conflicts
    const timestamp = Date.now();
    const testEmail = `test.doctor.${timestamp}@doktu.co`;

    // Fill out the form
    await page.locator('label:has-text("First Name")').locator('..').locator('input').fill('Test');
    await page.locator('label:has-text("Last Name")').locator('..').locator('input').fill('Doctor');
    await page.locator('label:has-text("Email")').locator('..').locator('input').fill(testEmail);
    await page.locator('label:has-text("Password")').locator('..').locator('input').fill('TestPassword123!');
    await page.locator('label:has-text("Specialization")').locator('..').locator('input').fill('Cardiology');
    await page.locator('label:has-text("Title")').locator('..').locator('input').fill('Dr.');

    // Fill optional fields
    await page.locator('label:has-text("License Number")').locator('..').locator('input').fill('LIC123456');
    await page.locator('label:has-text("Years of Experience")').locator('..').locator('input').fill('5');
    await page.locator('label:has-text("Consultation Fee")').locator('..').locator('input').fill('50');
    await page.locator('label:has-text("Languages")').locator('..').locator('input').fill('English, French');

    // Fill bio
    const bioField = page.locator('label:has-text("Bio")').locator('..').locator('textarea');
    await bioField.fill('Test doctor for automated testing');

    // Listen for console logs to capture any errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Submit the form
    const submitButton = page.locator('button:has-text("Create Doctor Account")');
    await submitButton.click();

    // Wait for response (either success or error)
    await page.waitForTimeout(3000);

    // Check for success message or error
    const successMessage = page.locator('text=Doctor account created successfully');
    const errorMessage = page.locator('text=Failed to create doctor account');

    const isSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
    const isError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

    // Log results
    console.log('\n=== Test Results ===');
    console.log(`Test Email: ${testEmail}`);
    console.log(`Success Message Visible: ${isSuccess}`);
    console.log(`Error Message Visible: ${isError}`);
    console.log('\nConsole Logs:');
    consoleLogs.forEach(log => console.log(log));

    // Assert success
    if (isError) {
      const errorText = await page.textContent('[role="alert"]').catch(() => 'Unknown error');
      console.log(`Error Details: ${errorText}`);
    }

    expect(isSuccess).toBe(true);
    expect(isError).toBe(false);

    console.log('\n✅ Doctor account created successfully!');
  });
});
