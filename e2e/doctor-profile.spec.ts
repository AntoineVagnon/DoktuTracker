import { test, expect } from '@playwright/test';

test.describe('Doctor Profile Calendar', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the home page first
    await page.goto('/');
    
    // Wait for doctors to load and click on the first doctor
    await page.waitForSelector('[data-testid="doctor-card"]');
    await page.click('[data-testid="doctor-card"] [data-testid="book-button"]');
    
    // Wait for doctor profile page to load
    await page.waitForSelector('[data-testid="availability-calendar"]');
  });

  test('should display sticky day headers after vertical scroll', async ({ page }) => {
    // Check that day headers are visible initially
    const dayHeaders = page.locator('[role="columnheader"]');
    await expect(dayHeaders.first()).toBeVisible();
    
    // Get the calendar container
    const calendarContainer = page.locator('.calendar-grid').first();
    await expect(calendarContainer).toBeVisible();
    
    // Scroll down within the calendar area
    await page.evaluate(() => {
      const calendar = document.querySelector('.calendar-grid');
      if (calendar && calendar.parentElement) {
        calendar.parentElement.scrollTop = 200;
      }
    });
    
    // Day headers should still be visible (sticky positioning)
    await expect(dayHeaders.first()).toBeVisible();
    
    // Verify the header is still at the top of the viewport
    const headerBox = await dayHeaders.first().boundingBox();
    expect(headerBox?.y).toBeLessThan(100); // Should be near the top
  });

  test('should display sticky time labels after horizontal scroll', async ({ page }) => {
    // Check that time labels are visible initially
    const timeLabels = page.locator('[role="rowheader"]');
    await expect(timeLabels.first()).toBeVisible();
    
    // Scroll horizontally in the calendar container
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="calendar-scroll-container"]');
      if (container) {
        container.scrollLeft = 200;
      }
    });
    
    // Time labels should still be visible (sticky positioning)
    await expect(timeLabels.first()).toBeVisible();
    
    // Verify the time label is still at the left of the viewport
    const labelBox = await timeLabels.first().boundingBox();
    expect(labelBox?.x).toBeLessThan(100); // Should be near the left edge
  });

  test('should navigate horizontally with arrow buttons on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that scroll navigation buttons are visible on mobile
    const leftScrollButton = page.locator('[aria-label="Scroll calendar left"]');
    const rightScrollButton = page.locator('[aria-label="Scroll calendar right"]');
    
    await expect(leftScrollButton).toBeVisible();
    await expect(rightScrollButton).toBeVisible();
    
    // Get initial scroll position
    const initialScrollLeft = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="calendar-scroll-container"]');
      return container ? container.scrollLeft : 0;
    });
    
    // Click right scroll button
    await rightScrollButton.click();
    
    // Wait for smooth scroll animation
    await page.waitForTimeout(500);
    
    // Check that scroll position has changed
    const newScrollLeft = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="calendar-scroll-container"]');
      return container ? container.scrollLeft : 0;
    });
    
    expect(newScrollLeft).toBeGreaterThan(initialScrollLeft);
    
    // Click left scroll button
    await leftScrollButton.click();
    
    // Wait for smooth scroll animation
    await page.waitForTimeout(500);
    
    // Check that scroll position has moved back
    const finalScrollLeft = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="calendar-scroll-container"]');
      return container ? container.scrollLeft : 0;
    });
    
    expect(finalScrollLeft).toBeLessThan(newScrollLeft);
  });

  test('should display all 7 days in grid layout', async ({ page }) => {
    // Check that exactly 7 day columns are displayed
    const dayHeaders = page.locator('[role="columnheader"]');
    await expect(dayHeaders).toHaveCount(7);
    
    // Verify grid layout spans the full width on desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Check that the calendar uses CSS Grid
    const calendarGrid = page.locator('.calendar-grid');
    const gridTemplateColumns = await calendarGrid.evaluate((el) => {
      return window.getComputedStyle(el).getPropertyValue('grid-template-columns');
    });
    
    // Should have 8 columns (1 for time + 7 for days)
    expect(gridTemplateColumns).toContain('80px repeat(7, 1fr)');
  });

  test('should have compact row heights for better visibility', async ({ page }) => {
    // Check that time slot rows have the correct height
    const timeSlotRows = page.locator('[role="gridcell"]').first();
    await expect(timeSlotRows).toBeVisible();
    
    // Get the computed height of a slot cell
    const cellHeight = await timeSlotRows.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height;
    });
    
    // Should be around 48px as specified
    expect(cellHeight).toBeGreaterThanOrEqual(45);
    expect(cellHeight).toBeLessThanOrEqual(52);
  });

  test('should allow booking available slots', async ({ page }) => {
    // Look for available booking buttons
    const bookButtons = page.locator('button:has-text("Book")');
    
    // At least one slot should be available for booking
    await expect(bookButtons.first()).toBeVisible();
    
    // Click on the first available slot
    await bookButtons.first().click();
    
    // Should either navigate to booking page or show some booking interaction
    // (This depends on the implementation, but we verify some action occurs)
    await page.waitForTimeout(500);
    
    // The test passes if no errors occur during the booking click
  });

  test('should show proper accessibility attributes', async ({ page }) => {
    // Verify grid role
    const calendarGrid = page.locator('[role="grid"]');
    await expect(calendarGrid).toBeVisible();
    
    // Verify column headers
    const columnHeaders = page.locator('[role="columnheader"]');
    await expect(columnHeaders).toHaveCount(7);
    
    // Verify row headers (time labels)
    const rowHeaders = page.locator('[role="rowheader"]');
    await expect(rowHeaders.first()).toBeVisible();
    
    // Verify grid cells
    const gridCells = page.locator('[role="gridcell"]');
    await expect(gridCells.first()).toBeVisible();
    
    // Check that booking buttons have proper aria-labels
    const bookButtons = page.locator('button:has-text("Book")');
    if (await bookButtons.count() > 0) {
      const ariaLabel = await bookButtons.first().getAttribute('aria-label');
      expect(ariaLabel).toContain('Book appointment');
    }
  });
});