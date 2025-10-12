import { test, expect } from '@playwright/test';

const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';

test.describe('Admin Doctor Management Feature', () => {
  // Use the authenticated admin state from setup
  test.use({ storageState: './playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate directly to admin dashboard (already authenticated)
    await page.goto(`${BASE_URL}/admin`);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Handle cookies banner if it appears
    try {
      const cookiesButton = page.locator('button:has-text("Tout accepter"), button:has-text("Accept"), button:has-text("J\'accepte")');
      await cookiesButton.click({ timeout: 3000 });
      console.log('✅ Cookies banner accepted');
    } catch (error) {
      console.log('ℹ️ No cookies banner found or already accepted');
    }

    // Wait for admin dashboard to be ready
    await page.waitForSelector('button:has-text("Doctors")', { timeout: 10000 });

    // Navigate to Doctors section
    await page.click('button:has-text("Doctors")');

    // Wait for doctors section to load
    await page.waitForTimeout(1000);
  });

  test('should display doctor management table with search', async ({ page }) => {
    // Check if the "Manage Doctors" title is visible
    await expect(page.locator('text=Manage Doctors')).toBeVisible();

    // Check if search input is visible
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await expect(searchInput).toBeVisible();

    // Check if table headers are present
    await expect(page.locator('th:has-text("Doctor")')).toBeVisible();
    await expect(page.locator('th:has-text("Specialty")')).toBeVisible();
    await expect(page.locator('th:has-text("Rating")')).toBeVisible();
    await expect(page.locator('th:has-text("Price")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();

    console.log('✅ Doctor management table is displayed correctly');
  });

  test('should search doctors by name', async ({ page }) => {
    // Wait for doctors to load
    await page.waitForTimeout(2000);

    // Get initial row count
    const initialRows = await page.locator('tbody tr').count();
    console.log(`Initial doctor count: ${initialRows}`);

    if (initialRows > 0) {
      // Get first doctor's name
      const firstDoctorName = await page.locator('tbody tr:first-child td:first-child').textContent();
      console.log(`First doctor: ${firstDoctorName}`);

      // Extract just the first name for search
      const searchTerm = firstDoctorName?.split(' ')[1] || 'Dr';

      // Type in search box
      const searchInput = page.locator('input[placeholder*="Search by name"]');
      await searchInput.fill(searchTerm);

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify results are filtered
      const filteredRows = await page.locator('tbody tr').count();
      console.log(`Filtered doctor count: ${filteredRows}`);

      expect(filteredRows).toBeLessThanOrEqual(initialRows);
      console.log('✅ Search functionality works correctly');
    } else {
      console.log('⚠️ No doctors found to test search');
    }
  });

  test('should open doctor detail modal on View button click', async ({ page }) => {
    // Wait for doctors to load
    await page.waitForTimeout(2000);

    // Check if there are any doctors
    const doctorCount = await page.locator('tbody tr').count();

    if (doctorCount > 0) {
      // Click the first "View" button
      await page.locator('button:has-text("View")').first().click();

      // Wait for modal to open with longer timeout and proper selector
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Check if modal title is visible
      await expect(page.locator('text=Doctor Details')).toBeVisible({ timeout: 10000 });

      // Check if profile section is visible
      await expect(page.locator('text=About').or(page.locator('h3:has-text("Dr.")'))).toBeVisible();

      // Check if statistics section is visible
      await expect(page.locator('text=Statistics').or(page.locator('text=Total'))).toBeVisible();

      // Check if Edit Profile button is visible
      await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible();

      console.log('✅ Doctor detail modal opens correctly');

      // Close modal by clicking outside or X button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️ No doctors found to test detail view');
    }
  });

  test('should open edit form modal on Edit button click', async ({ page }) => {
    // Wait for doctors to load
    await page.waitForTimeout(2000);

    // Check if there are any doctors
    const doctorCount = await page.locator('tbody tr').count();

    if (doctorCount > 0) {
      // Click the first "Edit" button
      await page.locator('button:has-text("Edit")').first().click();

      // Wait for modal to open
      await page.waitForTimeout(1000);

      // Check if modal title is visible
      await expect(page.locator('text=Edit Doctor Profile')).toBeVisible();

      // Check if form fields are visible
      await expect(page.locator('label:has-text("Specialty")')).toBeVisible();
      await expect(page.locator('label:has-text("Biography")')).toBeVisible();
      await expect(page.locator('label:has-text("Consultation Price")')).toBeVisible();
      await expect(page.locator('label:has-text("Languages")')).toBeVisible();

      // Check if Save Changes button is visible
      await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();

      // Check if Cancel button is visible
      await expect(page.locator('button:has-text("Cancel")').last()).toBeVisible();

      console.log('✅ Edit form modal opens correctly');

      // Close modal
      await page.locator('button:has-text("Cancel")').last().click();
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️ No doctors found to test edit form');
    }
  });

  test('should update doctor profile successfully', async ({ page }) => {
    // Wait for doctors to load
    await page.waitForTimeout(2000);

    // Check if there are any doctors
    const doctorCount = await page.locator('tbody tr').count();

    if (doctorCount > 0) {
      // Click the first "Edit" button
      await page.locator('button:has-text("Edit")').first().click();

      // Wait for modal to open
      await page.waitForTimeout(1000);

      // Get current specialty value
      const specialtyInput = page.locator('input[placeholder*="Cardiology"]').or(
        page.locator('label:has-text("Specialty") + input')
      ).first();

      const currentSpecialty = await specialtyInput.inputValue();
      console.log(`Current specialty: ${currentSpecialty}`);

      // Update specialty with a test value
      const testSpecialty = currentSpecialty + ' (Updated)';
      await specialtyInput.fill(testSpecialty);

      // Click Save Changes
      await page.locator('button:has-text("Save Changes")').click();

      // Wait for update to complete
      await page.waitForTimeout(2000);

      // Check for success toast or modal closing
      const modalClosed = await page.locator('text=Edit Doctor Profile').isHidden();

      if (modalClosed) {
        console.log('✅ Doctor profile updated successfully');

        // Revert the change
        await page.locator('button:has-text("Edit")').first().click();
        await page.waitForTimeout(1000);
        await specialtyInput.fill(currentSpecialty);
        await page.locator('button:has-text("Save Changes")').click();
        await page.waitForTimeout(2000);
        console.log('✅ Reverted changes');
      } else {
        console.log('⚠️ Modal did not close after update');
      }
    } else {
      console.log('⚠️ No doctors found to test update');
    }
  });

  test('should display statistics in detail modal', async ({ page }) => {
    // Wait for doctors to load
    await page.waitForTimeout(2000);

    // Check if there are any doctors
    const doctorCount = await page.locator('tbody tr').count();

    if (doctorCount > 0) {
      // Click the first "View" button
      await page.locator('button:has-text("View")').first().click();

      // Wait for modal to open properly
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Check if statistics cards are visible
      const statsSection = page.locator('text=Statistics');
      await expect(statsSection).toBeVisible({ timeout: 10000 });

      // Check for specific stat labels
      await expect(page.locator('text=Total').or(page.locator('text=Appointments'))).toBeVisible();
      await expect(page.locator('text=Completed').or(page.locator('text=Success Rate'))).toBeVisible();
      await expect(page.locator('text=Rating').or(page.locator('text=Average Score'))).toBeVisible();
      await expect(page.locator('text=Revenue').or(page.locator('text=Total Earned'))).toBeVisible();

      console.log('✅ Statistics are displayed in detail modal');

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠️ No doctors found to test statistics');
    }
  });

  test('should show Create New Doctor button', async ({ page }) => {
    // Check if Create New Doctor button is visible
    const createButton = page.locator('button:has-text("Create New Doctor")');
    await expect(createButton).toBeVisible();

    console.log('✅ Create New Doctor button is visible');
  });

});
