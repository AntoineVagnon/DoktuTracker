
import { test, expect } from '@playwright/test';

test('doctors grid always visible', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('[data-testid="doctors-grid"]');
  await expect(grid).toBeVisible({ timeout: 4000 });
  // must contain either card or skeleton nodes
  await expect(
    grid.locator('.doctor-card, .skeleton-card')
  ).toHaveCount(10);
});
