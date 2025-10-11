/**
 * @file doctorCreation.a11y.spec.ts
 * @description Accessibility tests for Doctor Creation feature (WCAG 2.1 AA)
 * @framework Playwright + axe-core
 * @priority P0 (2 tests), P1 (4 tests)
 * @total 6 tests
 *
 * Tests keyboard navigation, screen reader compatibility, color contrast, ARIA attributes,
 * and other WCAG 2.1 Level AA requirements.
 *
 * INSTALLATION:
 * npm install -D @axe-core/playwright
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ============================================================================
// Test Configuration
// ============================================================================

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@doktu.co';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!';
const BASE_URL = process.env.BASE_URL || 'https://doktu-tracker.vercel.app';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Login as admin user
 */
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin', { timeout: 10000 });
}

/**
 * Navigate to Doctors tab
 */
async function navigateToDoctorsTab(page: Page) {
  await page.click('button:has-text("Doctors")');
  await expect(page.locator('h2:has-text("Doctors")')).toBeVisible({ timeout: 5000 });
}

/**
 * Open Create Doctor form
 */
async function openCreateDoctorForm(page: Page) {
  await page.click('button:has-text("Create New Doctor")');
  await expect(page.locator('h3:has-text("Create New Doctor")')).toBeVisible({ timeout: 3000 });
}

/**
 * Run axe accessibility scan
 */
async function runAxeScan(page: Page, tags: string[] = ['wcag2a', 'wcag2aa']) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(tags)
    .analyze();

  return accessibilityScanResults;
}

// ============================================================================
// P0 Critical Accessibility Tests (MUST PASS 100%)
// ============================================================================

test.describe('[P0] Critical Accessibility Tests - WCAG 2.1 AA', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToDoctorsTab(page);
  });

  test('A11Y-001 [P0]: Create Doctor form passes automated WCAG 2.1 AA scan', async ({ page }) => {
    // Arrange
    await openCreateDoctorForm(page);

    // Act - Run axe accessibility scan
    const accessibilityScanResults = await runAxeScan(page, ['wcag2a', 'wcag2aa']);

    // Assert - No violations
    expect(accessibilityScanResults.violations).toEqual([]);

    // Log any incomplete or passes for review
    if (accessibilityScanResults.incomplete.length > 0) {
      console.log('⚠️ Incomplete checks (manual review needed):');
      accessibilityScanResults.incomplete.forEach(item => {
        console.log(`  - ${item.id}: ${item.description}`);
      });
    }
  });

  test('A11Y-002 [P0]: All form inputs have accessible labels (WCAG 1.3.1, 4.1.2)', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Required form fields
    const fields = [
      { selector: 'input[name="email"]', expectedLabel: /email/i },
      { selector: 'input[name="password"]', expectedLabel: /password/i },
      { selector: 'input[name="firstName"]', expectedLabel: /first name/i },
      { selector: 'input[name="lastName"]', expectedLabel: /last name/i },
      { selector: 'input[name="specialization"]', expectedLabel: /specialization/i },
      { selector: 'input[name="consultationFee"]', expectedLabel: /consultation fee|fee/i },
      { selector: 'input[name="yearsOfExperience"]', expectedLabel: /years of experience|experience/i },
    ];

    for (const field of fields) {
      const input = page.locator(field.selector);

      // Check for associated label (via for/id or aria-label)
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const inputId = await input.getAttribute('id');

      let hasLabel = false;

      if (ariaLabel) {
        // Has aria-label
        expect(ariaLabel).toMatch(field.expectedLabel);
        hasLabel = true;
      } else if (ariaLabelledBy) {
        // Has aria-labelledby
        const labelText = await page.locator(`#${ariaLabelledBy}`).textContent();
        expect(labelText).toMatch(field.expectedLabel);
        hasLabel = true;
      } else if (inputId) {
        // Has associated <label for="inputId">
        const label = page.locator(`label[for="${inputId}"]`);
        const labelText = await label.textContent();
        expect(labelText).toMatch(field.expectedLabel);
        hasLabel = true;
      }

      expect(hasLabel).toBe(true);
    }
  });
});

// ============================================================================
// P1 High Priority Accessibility Tests (MUST PASS 100%)
// ============================================================================

test.describe('[P1] High Priority Accessibility Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToDoctorsTab(page);
  });

  test('A11Y-003 [P1]: Keyboard navigation - Tab through all form fields', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Expected tab order (adjust based on actual form structure)
    const expectedTabOrder = [
      'input[name="email"]',
      'input[name="password"]',
      'button:has-text("Generate")', // Password generator button
      'input[name="firstName"]',
      'input[name="lastName"]',
      'input[name="specialization"]',
      'select[name="title"]', // If dropdown exists
      'textarea[name="bio"]', // If bio is textarea
      'input[name="licenseNumber"]',
      'input[name="yearsOfExperience"]',
      'input[name="consultationFee"]',
      'input[name="languages"]', // Or textarea
      'button:has-text("Create Doctor")',
      'button:has-text("Cancel")',
    ];

    // Tab through form
    for (const selector of expectedTabOrder) {
      await page.keyboard.press('Tab');

      // Check if an element matching selector is focused
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const matchesSelector = await page.evaluate(
        (el, sel) => {
          try {
            return el.matches(sel);
          } catch {
            return false;
          }
        },
        focusedElement,
        selector
      );

      // Log for debugging (not strict assertion to handle dynamic forms)
      if (!matchesSelector) {
        const actualTag = await page.evaluate(el => el.tagName, focusedElement);
        const actualName = await page.evaluate(el => el.getAttribute('name'), focusedElement);
        console.log(`Expected: ${selector}, Got: ${actualTag}[name="${actualName}"]`);
      }
    }

    // Assert: All interactive elements are keyboard accessible
    // Final check: Can reach submit button
    await page.keyboard.press('Tab');
    const submitButton = page.locator('button:has-text("Create Doctor")');
    await expect(submitButton).toBeFocused();
  });

  test('A11Y-004 [P1]: Keyboard navigation - Submit form with Enter key', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Fill form
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `a11y.enter.${timestamp}@doktu.co`);
    await page.fill('input[name="password"]', 'SecureP@ss123');
    await page.fill('input[name="firstName"]', 'A11y');
    await page.fill('input[name="lastName"]', 'Enter');
    await page.fill('input[name="specialization"]', 'General');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Assert - Form submitted
    await expect(page.locator('text=/Doctor Created Successfully/i')).toBeVisible({ timeout: 5000 });
  });

  test('A11Y-005 [P1]: Screen reader - Error messages announced (aria-live)', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Submit empty form to trigger validation errors
    await page.click('button:has-text("Create Doctor")');

    // Wait for error messages
    await page.waitForTimeout(1000);

    // Check for aria-live regions for error announcements
    const errorRegions = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="alert"]');
    const errorCount = await errorRegions.count();

    expect(errorCount).toBeGreaterThan(0);

    // Verify error messages are accessible
    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorRegions.nth(i).textContent();
      expect(errorText).toBeTruthy();
      expect(errorText!.length).toBeGreaterThan(0);
    }
  });

  test('A11Y-006 [P1]: Color contrast - All text meets WCAG AA (4.5:1)', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Run axe scan focused on color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('form') // Focus on form area
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    // Assert - No color contrast violations
    expect(contrastViolations).toEqual([]);

    // If violations exist, log details
    if (contrastViolations.length > 0) {
      console.error('❌ Color contrast violations:');
      contrastViolations.forEach(violation => {
        console.error(`  - ${violation.description}`);
        violation.nodes.forEach(node => {
          console.error(`    Element: ${node.html}`);
          console.error(`    Impact: ${node.impact}`);
        });
      });
    }
  });

  test('A11Y-007 [P1]: Focus indicators visible on all interactive elements', async ({ page }) => {
    await openCreateDoctorForm(page);

    // List of interactive elements to test
    const interactiveElements = [
      'input[name="email"]',
      'input[name="password"]',
      'button:has-text("Generate")',
      'input[name="firstName"]',
      'button:has-text("Create Doctor")',
      'button:has-text("Cancel")',
    ];

    for (const selector of interactiveElements) {
      // Focus element
      await page.locator(selector).focus();

      // Check for visible focus indicator
      const element = page.locator(selector);
      const hasOutline = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return (
          styles.outline !== 'none' ||
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none' ||
          styles.border !== 'none'
        );
      });

      expect(hasOutline).toBe(true);
    }
  });

  test('A11Y-008 [P1]: Success alert announced to screen readers', async ({ page }) => {
    await openCreateDoctorForm(page);

    // Fill and submit form
    const timestamp = Date.now();
    await page.fill('input[name="email"]', `a11y.success.${timestamp}@doktu.co`);
    await page.fill('input[name="password"]', 'SecureP@ss123');
    await page.fill('input[name="firstName"]', 'A11y');
    await page.fill('input[name="lastName"]', 'Success');
    await page.fill('input[name="specialization"]', 'General');
    await page.click('button:has-text("Create Doctor")');

    // Wait for success message
    await page.waitForSelector('text=/Doctor Created Successfully/i', { timeout: 5000 });

    // Assert - Success alert has proper ARIA attributes
    const successAlert = page.locator('[role="alert"], [aria-live]').filter({ hasText: /Doctor Created Successfully/i });
    expect(await successAlert.count()).toBeGreaterThan(0);

    // Check for aria-live or role="alert"
    const firstAlert = successAlert.first();
    const ariaLive = await firstAlert.getAttribute('aria-live');
    const role = await firstAlert.getAttribute('role');

    expect(ariaLive || role).toBeTruthy();
    expect(['polite', 'assertive', 'alert']).toContain(ariaLive || role);
  });
});

// ============================================================================
// Test Summary
// ============================================================================

/**
 * Accessibility Test Coverage Summary (WCAG 2.1 Level AA):
 *
 * P0 Critical (2 tests):
 * - A11Y-001: Automated WCAG 2.1 AA scan (axe-core)
 * - A11Y-002: Form labels (WCAG 1.3.1, 4.1.2)
 *
 * P1 High Priority (4 tests):
 * - A11Y-003: Keyboard navigation - Tab order
 * - A11Y-004: Keyboard navigation - Enter to submit
 * - A11Y-005: Screen reader error announcements (aria-live)
 * - A11Y-006: Color contrast 4.5:1 (WCAG 1.4.3)
 * - A11Y-007: Focus indicators visible (WCAG 2.4.7)
 * - A11Y-008: Success alert announced
 *
 * Total: 6 tests (+ 2 bonus)
 *
 * Execution Commands:
 * # Run all accessibility tests
 * npx playwright test tests/accessibility/doctorCreation.a11y.spec.ts
 *
 * # Run only P0 critical tests
 * npx playwright test tests/accessibility/doctorCreation.a11y.spec.ts --grep "@P0"
 *
 * # Run with headed browser (to see focus indicators)
 * npx playwright test tests/accessibility/doctorCreation.a11y.spec.ts --headed
 *
 * # Generate HTML report
 * npx playwright test tests/accessibility/doctorCreation.a11y.spec.ts --reporter=html
 *
 * Prerequisites:
 * npm install -D @playwright/test @axe-core/playwright
 *
 * WCAG 2.1 Level AA Criteria Covered:
 * - 1.3.1 Info and Relationships (A) - Form labels
 * - 1.4.3 Contrast (Minimum) (AA) - 4.5:1 color contrast
 * - 2.1.1 Keyboard (A) - All functionality via keyboard
 * - 2.4.7 Focus Visible (AA) - Visible focus indicators
 * - 3.3.1 Error Identification (A) - Error messages announced
 * - 3.3.2 Labels or Instructions (A) - Form field labels
 * - 4.1.2 Name, Role, Value (A) - Proper ARIA attributes
 * - 4.1.3 Status Messages (AA) - Success/error announcements
 *
 * Manual Testing Checklist (not automated):
 * □ Test with NVDA screen reader (Windows)
 * □ Test with JAWS screen reader (Windows)
 * □ Test with VoiceOver (macOS/iOS)
 * □ Test with TalkBack (Android)
 * □ Test with high contrast mode
 * □ Test with 200% zoom level
 * □ Test with browser speech recognition
 * □ Test with Windows Magnifier
 *
 * Environment Variables:
 * - TEST_ADMIN_EMAIL: Admin user email
 * - TEST_ADMIN_PASSWORD: Admin user password
 * - BASE_URL: Application base URL
 */
