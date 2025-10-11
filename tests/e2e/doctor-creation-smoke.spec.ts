/**
 * Smoke test for doctor creation feature
 * Quick validation that the basic functionality works
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';
const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';

test.use({
  storageState: './playwright/.auth/admin.json'
});

test.describe('Doctor Creation - Smoke Test', () => {
  test('Admin can access doctor creation form', async ({ page }) => {
    // Navigate to admin page
    await page.goto(`${BASE_URL}/admin`);

    // Wait for page load
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

    // Verify "Create New Doctor" button exists
    const createButton = page.locator('button:has-text("Create New Doctor")');
    await expect(createButton).toBeVisible({ timeout: 10000 });

    // Click to open form
    await createButton.click();

    // Verify form opened
    await expect(page.locator('text=Create New Doctor Account')).toBeVisible();

    // Verify key form fields exist (use more specific selectors)
    await expect(page.locator('label:has-text("First Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Last Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
    await expect(page.locator('label:has-text("Specialization")')).toBeVisible();

    console.log('✅ Smoke test passed: Doctor creation form is accessible');
  });

  test('Backend endpoint is available', async ({ request }) => {
    // Test that the endpoint exists (should return 401 without auth)
    const response = await request.post(`${API_URL}/api/admin/create-doctor`, {
      data: {
        email: 'test@test.com',
        password: 'Test1234!',
        firstName: 'Test',
        lastName: 'Doctor',
        specialties: ['General']
      }
    });

    // Expect 401 Unauthorized (endpoint exists but needs auth)
    // or 400/500 (endpoint exists but validation failed)
    // NOT 404 or 405 (endpoint missing)
    expect([400, 401, 403, 500]).toContain(response.status());

    console.log(`✅ Backend endpoint exists (status: ${response.status()})`);
  });
});
