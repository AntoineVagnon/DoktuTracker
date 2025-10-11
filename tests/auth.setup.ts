/**
 * Authentication setup for E2E tests
 * Creates a logged-in admin state that can be reused across tests
 * Uses test-only endpoint for persistent sessions
 */
import { test as setup, expect } from '@playwright/test';

const ADMIN_AUTH_FILE = './playwright/.auth/admin.json';
const BASE_URL = process.env.VITE_APP_URL || 'https://doktu-tracker.vercel.app';
const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'antoine.vagnon@gmail.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Spl@ncnopleure49';

setup('authenticate as admin', async ({ page }) => {
  // Use test-only authentication endpoint for persistent session (Railway backend)
  const response = await page.request.post(`${API_URL}/api/test/auth`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Test auth failed: ${response.status()} - ${body}`);
  }

  const result = await response.json();

  if (!result.success || result.user.role !== 'admin') {
    throw new Error(`Authentication failed or user is not admin: ${JSON.stringify(result)}`);
  }

  console.log(`✓ Authenticated as ${result.user.email} (${result.user.role})`);

  // Navigate to admin page to verify session works
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Verify we're on admin page
  const currentUrl = page.url();
  if (!currentUrl.includes('/admin')) {
    throw new Error(`Session not working - redirected to ${currentUrl}`);
  }

  // Wait for admin dashboard to load
  await page.waitForSelector('button:has-text("Doctors")', { timeout: 10000 });

  console.log('✓ Admin dashboard accessible');

  // Save signed-in state
  await page.context().storageState({ path: ADMIN_AUTH_FILE });

  console.log('✓ Admin authentication state saved');
});
