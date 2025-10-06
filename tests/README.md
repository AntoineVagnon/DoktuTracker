# Doktu E2E Testing Suite

Comprehensive end-to-end testing for the Doktu telehealth platform using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install Playwright and browsers
npm install --save-dev @playwright/test
npx playwright install
```

### Running Tests

```bash
# Run all tests in headless mode
npx playwright test

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/patient-booking-flow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests in debug mode
npx playwright test --debug
```

### Viewing Test Reports

```bash
# Open HTML report
npx playwright show-report

# Open last test run in trace viewer
npx playwright show-trace trace.zip
```

---

## 📁 Test Structure

```
tests/
├── e2e/
│   ├── patient-booking-flow.spec.ts    # Complete patient journey
│   ├── membership-flow.spec.ts         # Membership subscription & usage
│   ├── critical-bugs.spec.ts           # Recently fixed bugs verification
│   └── (add more test files here)
├── MANUAL_TESTING_CHECKLIST.md         # Manual QA checklist
└── README.md                            # This file
```

---

## 🧪 Test Files Overview

### 1. `patient-booking-flow.spec.ts`
**What it tests:**
- User registration
- Doctor browsing
- Appointment booking
- Payment processing (Stripe)
- Appointment rescheduling
- Appointment cancellation

**Run it:**
```bash
npx playwright test patient-booking-flow
```

### 2. `membership-flow.spec.ts`
**What it tests:**
- Monthly membership subscription
- 6-month membership subscription
- Booking with membership credits
- Credit deduction and tracking
- Allowance history
- Membership cancellation
- Membership reactivation

**Run it:**
```bash
npx playwright test membership-flow
```

### 3. `critical-bugs.spec.ts`
**What it tests:**
- **Bug Fix:** Booked slots appearing in reschedule modal
- **Bug Fix:** Welcome email delay (should be <2 minutes)
- **Bug Fix:** Membership allowance auto-initialization
- **Bug Fix:** Payment webhook slot marking

**Run it:**
```bash
npx playwright test critical-bugs
```

---

## 🔧 Configuration

Edit `playwright.config.ts` to customize:

### Change Target URL
```typescript
// Test against production (default)
use: {
  baseURL: 'https://doktu-tracker.vercel.app',
}

// Or test against staging
use: {
  baseURL: 'https://doktu-tracker-staging.vercel.app',
}

// Or test against local dev
use: {
  baseURL: 'http://localhost:5000',
}
```

### Change Browsers to Test
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
],
```

### Enable Video Recording
```typescript
use: {
  video: 'on', // Record video for all tests
  // OR
  video: 'retain-on-failure', // Only failed tests
}
```

---

## 📊 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 🎯 Writing New Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {

  test.beforeEach(async ({ page }) => {
    // Setup code that runs before each test
    await page.goto('/');
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    await page.fill('input[name="email"]', 'test@example.com');

    // Act
    await page.click('button[type="submit"]');

    // Assert
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test error scenarios
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid email');
  });
});
```

### Best Practices

1. **Use test.step()** for clarity:
```typescript
await test.step('Login', async () => {
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button:has-text("Login")');
});
```

2. **Use data-testid** attributes for stable selectors:
```typescript
// In your component:
<button data-testid="submit-button">Submit</button>

// In your test:
await page.click('[data-testid="submit-button"]');
```

3. **Wait for network idle** when needed:
```typescript
await page.waitForLoadState('networkidle');
```

4. **Handle async operations**:
```typescript
await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
```

---

## 🐛 Debugging Tests

### 1. Run in Debug Mode
```bash
npx playwright test --debug
```
This opens the Playwright Inspector where you can:
- Step through tests
- Pause execution
- Inspect elements
- View console logs

### 2. Use Trace Viewer
```bash
# Record trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### 3. Add console logs
```typescript
test('debug test', async ({ page }) => {
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  const element = page.locator('h1');
  console.log('Element text:', await element.textContent());
});
```

### 4. Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 5. Slow Down Test
```typescript
test.use({ slowMo: 1000 }); // 1 second delay between actions
```

---

## 📈 Test Coverage Goals

| Area | Coverage | Priority |
|------|----------|----------|
| Authentication | 100% | Critical |
| Appointment Booking | 100% | Critical |
| Payment Processing | 100% | Critical |
| Membership System | 100% | Critical |
| Video Consultation | 90% | High |
| Calendar Views | 80% | High |
| Settings & Profile | 70% | Medium |
| Document Upload | 70% | Medium |
| Admin Features | 50% | Low |

---

## 🔍 Known Limitations

1. **Email Verification**: Cannot fully automate email checking without email API integration
2. **Real Payments**: Use Stripe test cards only (4242 4242 4242 4242)
3. **Zoom Meetings**: Can verify link generation but not actual video functionality
4. **SMS Notifications**: Cannot test SMS delivery without phone API
5. **File Downloads**: May behave differently in headless mode

---

## 📞 Support

- **Issues**: Report bugs in GitHub Issues
- **Questions**: Contact development team
- **Documentation**: See `/docs` folder for more details

---

## 📝 Manual Testing

For comprehensive manual testing, see:
- **[MANUAL_TESTING_CHECKLIST.md](./MANUAL_TESTING_CHECKLIST.md)** - Complete QA checklist

---

## 🎓 Learning Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Reliable Tests](https://playwright.dev/docs/test-annotations)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

**Last Updated:** 2025-10-05
**Maintained By:** Doktu Development Team
