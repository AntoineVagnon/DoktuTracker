// Quick test to verify doctor card availability display
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🧪 Testing doctor card availability display...\n');
  
  // Navigate to home page
  await page.goto('https://doktu-tracker.vercel.app/');
  await page.waitForLoadState('domcontentloaded');
  
  // Dismiss cookie banner
  try {
    const acceptButton = page.locator('button:has-text("Accept All")').first();
    if (await acceptButton.isVisible({ timeout: 3000 })) {
      await acceptButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Cookie banner dismissed');
    }
  } catch {}
  
  // Wait for doctor cards to load
  await page.waitForTimeout(3000);
  
  // Check for availability display on doctor cards
  const doctorCards = page.locator('.group').filter({ hasText: /Dr\./i });
  const cardCount = await doctorCards.count();
  console.log(`📋 Found ${cardCount} doctor cards\n`);
  
  for (let i = 0; i < Math.min(cardCount, 5); i++) {
    const card = doctorCards.nth(i);
    const doctorName = await card.locator('h3').textContent();
    
    // Check for availability indicators
    const hasNoAvailability = await card.locator('text=/No availability/i').isVisible().catch(() => false);
    const hasNextAvailable = await card.locator('text=/Next available/i').isVisible().catch(() => false);
    const hasAvailabilityDate = await card.locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i').isVisible().catch(() => false);
    
    console.log(`Doctor: ${doctorName}`);
    console.log(`  - No availability: ${hasNoAvailability}`);
    console.log(`  - Next available shown: ${hasNextAvailable}`);
    console.log(`  - Date shown: ${hasAvailabilityDate}`);
    
    if (hasNextAvailable || hasAvailabilityDate) {
      console.log('  ✅ PASS: Availability IS showing\n');
    } else if (hasNoAvailability) {
      console.log('  ⚠️ Shows "No availability"\n');
    } else {
      console.log('  ❌ FAIL: No availability indicator found\n');
    }
  }
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/doctor-cards-availability-check.png', fullPage: true });
  console.log('\n📸 Screenshot saved to test-results/doctor-cards-availability-check.png');
  
  await browser.close();
})();
