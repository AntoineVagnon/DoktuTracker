/**
 * Quick test to discover admin login routing
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://doktu-tracker.vercel.app';
const ADMIN_EMAIL = 'antoine.vagnon@gmail.com';
const ADMIN_PASSWORD = 'Spl@ncnopleure49';

test('Try direct admin login', async ({ page }) => {
  console.log('Attempting direct navigation to /admin');
  await page.goto(`${BASE_URL}/admin`);

  await page.waitForTimeout(3000);

  console.log('Current URL after /admin:', page.url());

  // Check if redirected to login
  if (page.url().includes('/login')) {
    console.log('Redirected to login, filling credentials...');

    // Check if we need to click "Sign In to Account" first
    const signInButton = await page.locator('button:has-text("Sign In to Account")').count();
    if (signInButton > 0) {
      await page.click('button:has-text("Sign In to Account")');
    }

    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);
  }

  console.log('Final URL:', page.url());
  console.log('Page title:', await page.title());

  await page.screenshot({ path: 'admin-direct-result.png', fullPage: true });

  const pageContent = await page.content();
  console.log('Contains "Admin":', pageContent.includes('Admin'));
  console.log('Contains "Doctor Management":', pageContent.includes('Doctor Management'));
  console.log('Contains "Create New Doctor":', pageContent.includes('Create New Doctor'));
});
