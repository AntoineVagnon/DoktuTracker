/**
 * End-to-End Tests for Membership Booking Flow
 * Tests complete user journey from membership purchase to booking appointments with coverage
 */

import { test, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

// Test data generators
const generateTestUser = () => ({
  email: `testuser+${nanoid(6)}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
});

const generateTestDoctor = () => ({
  email: `doctor+${nanoid(6)}@example.com`,
  password: 'DoctorPassword123!',
  firstName: 'Dr. Test',
  lastName: 'Doctor',
  specialties: ['general_medicine']
});

test.describe('Membership Booking Flow', () => {
  let testUser: any;
  let testDoctor: any;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser();
    testDoctor = generateTestDoctor();
    
    // Start each test on the homepage
    await page.goto('/');
  });

  test.describe('Complete Membership Purchase and Booking Journey', () => {
    test('should complete membership subscription and book covered appointment', async ({ page }) => {
      // Step 1: Register new patient account
      await test.step('Register new patient account', async () => {
        await page.click('[data-testid="nav-register"]');
        await page.waitForSelector('[data-testid="register-form"]');
        
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.fill('[data-testid="input-firstName"]', testUser.firstName);
        await page.fill('[data-testid="input-lastName"]', testUser.lastName);
        
        await page.click('[data-testid="button-register"]');
        await page.waitForURL('/patient/dashboard');
        
        // Verify registration success
        await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');
      });

      // Step 2: Navigate to membership plans
      await test.step('Navigate to membership plans', async () => {
        await page.click('[data-testid="link-membership"]');
        await page.waitForURL('/membership');
        
        // Verify membership page loads
        await expect(page.locator('[data-testid="membership-plans"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-monthly"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-6month"]')).toBeVisible();
      });

      // Step 3: Select monthly membership plan
      await test.step('Select monthly membership plan', async () => {
        await page.click('[data-testid="button-select-monthly"]');
        await page.waitForURL('/membership/subscribe?plan=monthly_plan');
        
        // Verify plan details displayed
        await expect(page.locator('[data-testid="plan-details"]')).toContainText('Monthly Membership');
        await expect(page.locator('[data-testid="plan-price"]')).toContainText('€45');
        await expect(page.locator('[data-testid="plan-allowance"]')).toContainText('2 consultations');
      });

      // Step 4: Complete payment with test card
      await test.step('Complete payment with test card', async () => {
        // Wait for Stripe elements to load
        await page.waitForSelector('[data-testid="stripe-payment-element"]');
        
        // Fill in test card details
        const cardFrame = page.frameLocator('iframe[name*="card"]');
        await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
        await cardFrame.locator('[placeholder*="MM"]').fill('12');
        await cardFrame.locator('[placeholder*="YY"]').fill('28');
        await cardFrame.locator('[placeholder*="CVC"]').fill('123');
        
        // Submit payment
        await page.click('[data-testid="button-complete-payment"]');
        
        // Wait for payment success
        await page.waitForURL('/membership/success*');
        await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('active');
      });

      // Step 5: Verify membership dashboard shows active subscription
      await test.step('Verify membership dashboard', async () => {
        await page.click('[data-testid="link-dashboard"]');
        await page.waitForURL('/patient/dashboard');
        
        // Check subscription status
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('2');
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('Monthly');
      });

      // Step 6: Book first appointment with membership coverage
      await test.step('Book first appointment with coverage', async () => {
        await page.click('[data-testid="link-book-appointment"]');
        await page.waitForURL('/patient/calendar*');
        
        // Select a doctor
        await page.click('[data-testid="doctor-card"]:first-child');
        
        // Select available time slot
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Verify coverage information
        await expect(page.locator('[data-testid="coverage-info"]')).toBeVisible();
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€0.00');
        
        // Confirm booking
        await page.click('[data-testid="button-confirm-booking"]');
        
        // Verify booking success
        await expect(page.locator('[data-testid="booking-confirmed"]')).toBeVisible();
        await expect(page.locator('[data-testid="allowance-consumed"]')).toContainText('1 consultation used');
      });

      // Step 7: Verify updated allowance
      await test.step('Verify updated allowance', async () => {
        await page.goto('/patient/dashboard');
        
        // Check remaining allowance
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('1');
        await expect(page.locator('[data-testid="allowance-used"]')).toContainText('1');
        
        // Check appointment history
        await page.click('[data-testid="tab-appointments"]');
        await expect(page.locator('[data-testid="appointment-row"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="appointment-coverage"]')).toContainText('Covered');
      });

      // Step 8: Book second appointment (exhaust allowance)
      await test.step('Book second appointment', async () => {
        await page.click('[data-testid="link-book-appointment"]');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Verify still covered
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        
        await page.click('[data-testid="button-confirm-booking"]');
        await expect(page.locator('[data-testid="booking-confirmed"]')).toBeVisible();
      });

      // Step 9: Try to book third appointment (should require payment)
      await test.step('Try to book third appointment without allowance', async () => {
        await page.click('[data-testid="link-book-appointment"]');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Verify no coverage
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Pay per visit');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€35.00');
        
        // Should show allowance exhausted message
        await expect(page.locator('[data-testid="allowance-exhausted"]')).toBeVisible();
        await expect(page.locator('[data-testid="allowance-exhausted"]')).toContainText('Monthly allowance used');
      });
    });

    test('should handle appointment cancellation and allowance restoration', async ({ page }) => {
      // Prerequisites: User with active membership and one booked appointment
      await test.step('Setup: Register user and subscribe to membership', async () => {
        // Register and login
        await page.goto('/register');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.fill('[data-testid="input-firstName"]', testUser.firstName);
        await page.fill('[data-testid="input-lastName"]', testUser.lastName);
        await page.click('[data-testid="button-register"]');
        
        // Quick membership setup (using API to speed up test)
        await page.evaluate(async (email) => {
          await fetch('/api/test/setup-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, plan: 'monthly_plan' })
          });
        }, testUser.email);
      });

      await test.step('Book appointment to be cancelled', async () => {
        await page.goto('/patient/calendar');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        await page.click('[data-testid="button-confirm-booking"]');
        
        // Verify allowance consumed
        await page.goto('/patient/dashboard');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('1');
      });

      await test.step('Cancel appointment and verify allowance restoration', async () => {
        // Navigate to appointments
        await page.click('[data-testid="tab-appointments"]');
        await page.click('[data-testid="appointment-cancel"]:first-child');
        
        // Confirm cancellation
        await page.click('[data-testid="button-confirm-cancel"]');
        await page.fill('[data-testid="input-cancel-reason"]', 'Test cancellation');
        await page.click('[data-testid="button-submit-cancel"]');
        
        // Verify cancellation success
        await expect(page.locator('[data-testid="cancel-success"]')).toBeVisible();
        
        // Check allowance restored
        await page.goto('/patient/dashboard');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('2');
        await expect(page.locator('[data-testid="allowance-used"]')).toContainText('0');
      });
    });

    test('should handle 6-month membership plan correctly', async ({ page }) => {
      await test.step('Register and select 6-month plan', async () => {
        // Register user
        await page.goto('/register');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.fill('[data-testid="input-firstName"]', testUser.firstName);
        await page.fill('[data-testid="input-lastName"]', testUser.lastName);
        await page.click('[data-testid="button-register"]');
        
        // Select 6-month plan
        await page.goto('/membership');
        await page.click('[data-testid="button-select-6month"]');
        
        // Verify plan details
        await expect(page.locator('[data-testid="plan-details"]')).toContainText('6-Month Membership');
        await expect(page.locator('[data-testid="plan-price"]')).toContainText('€219');
        await expect(page.locator('[data-testid="plan-allowance"]')).toContainText('12 consultations');
      });

      await test.step('Complete payment for 6-month plan', async () => {
        // Complete payment flow
        await page.waitForSelector('[data-testid="stripe-payment-element"]');
        const cardFrame = page.frameLocator('iframe[name*="card"]');
        await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
        await cardFrame.locator('[placeholder*="MM"]').fill('12');
        await cardFrame.locator('[placeholder*="YY"]').fill('28');
        await cardFrame.locator('[placeholder*="CVC"]').fill('123');
        
        await page.click('[data-testid="button-complete-payment"]');
        await page.waitForURL('/membership/success*');
      });

      await test.step('Verify 6-month allowance allocation', async () => {
        await page.goto('/patient/dashboard');
        
        // Check subscription details
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('6-Month');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('12');
        
        // Check billing cycle info
        await expect(page.locator('[data-testid="cycle-end"]')).toBeVisible();
        await expect(page.locator('[data-testid="renewal-date"]')).toContainText('6 months');
      });

      await test.step('Book multiple appointments within allowance', async () => {
        // Book 3 appointments to test allowance tracking
        for (let i = 0; i < 3; i++) {
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click(`[data-testid="time-slot"]:nth-child(${i + 1})`);
          
          // Verify coverage
          await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
          
          await page.click('[data-testid="button-confirm-booking"]');
          await expect(page.locator('[data-testid="booking-confirmed"]')).toBeVisible();
        }
        
        // Verify allowance tracking
        await page.goto('/patient/dashboard');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('9');
        await expect(page.locator('[data-testid="allowance-used"]')).toContainText('3');
      });
    });
  });

  test.describe('Membership Coverage Edge Cases', () => {
    test('should handle appointment booking at cycle boundaries', async ({ page }) => {
      await test.step('Setup user with membership ending soon', async () => {
        // Use API to create user with membership ending in 2 days
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/setup-expiring-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: testUser.email,
              cycleEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
            })
          });
        }, testUser);
        
        // Login
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('Book appointment within cycle period', async () => {
        await page.goto('/patient/calendar');
        
        // Book appointment for tomorrow (within cycle)
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await page.click(`[data-testid="date-${tomorrow.toISOString().split('T')[0]}"]`);
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Should be covered
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        
        await page.click('[data-testid="button-confirm-booking"]');
        await expect(page.locator('[data-testid="booking-confirmed"]')).toBeVisible();
      });

      await test.step('Try to book appointment outside cycle period', async () => {
        // Try to book appointment for 3 days from now (outside cycle)
        const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await page.click(`[data-testid="date-${futureDate.toISOString().split('T')[0]}"]`);
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Should not be covered
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Pay per visit');
        await expect(page.locator('[data-testid="cycle-boundary-warning"]')).toBeVisible();
        await expect(page.locator('[data-testid="cycle-boundary-warning"]')).toContainText('outside current billing cycle');
      });
    });

    test('should handle suspended subscription booking attempts', async ({ page }) => {
      await test.step('Setup user with suspended subscription', async () => {
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/setup-suspended-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email })
          });
        }, testUser);
        
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('Verify suspended status in dashboard', async () => {
        await page.goto('/patient/dashboard');
        
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Suspended');
        await expect(page.locator('[data-testid="suspension-notice"]')).toBeVisible();
        await expect(page.locator('[data-testid="suspension-notice"]')).toContainText('payment failed');
      });

      await test.step('Try to book appointment with suspended membership', async () => {
        await page.goto('/patient/calendar');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Should not be covered
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Pay per visit');
        await expect(page.locator('[data-testid="suspension-notice"]')).toBeVisible();
        await expect(page.locator('[data-testid="suspension-notice"]')).toContainText('suspended');
      });
    });

    test('should handle concurrent booking attempts with limited allowance', async ({ page, context }) => {
      await test.step('Setup user with 1 remaining allowance', async () => {
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/setup-limited-allowance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: testUser.email,
              allowanceRemaining: 1 
            })
          });
        }, testUser);
        
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('Attempt concurrent bookings', async () => {
        // Open second tab/page
        const page2 = await context.newPage();
        await page2.goto('/patient/calendar');
        
        // Attempt to book from both tabs simultaneously
        const bookingPromise1 = async () => {
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click('[data-testid="time-slot"]:first-child');
          await page.click('[data-testid="button-confirm-booking"]');
        };
        
        const bookingPromise2 = async () => {
          await page2.click('[data-testid="doctor-card"]:first-child');
          await page2.click('[data-testid="time-slot"]:nth-child(2)');
          await page2.click('[data-testid="button-confirm-booking"]');
        };
        
        // Execute both simultaneously
        await Promise.allSettled([bookingPromise1(), bookingPromise2()]);
        
        // Only one should succeed
        const successCount = await page.evaluate(() => {
          return document.querySelectorAll('[data-testid="booking-confirmed"]').length;
        });
        
        expect(successCount).toBeLessThanOrEqual(1);
        
        // Check for allowance exhausted message on failed booking
        if (await page.locator('[data-testid="booking-failed"]').isVisible()) {
          await expect(page.locator('[data-testid="error-message"]')).toContainText('allowance');
        }
      });
    });
  });

  test.describe('Membership Error Scenarios', () => {
    test('should handle payment failures gracefully', async ({ page }) => {
      await test.step('Register and attempt membership with failing card', async () => {
        await page.goto('/register');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.fill('[data-testid="input-firstName"]', testUser.firstName);
        await page.fill('[data-testid="input-lastName"]', testUser.lastName);
        await page.click('[data-testid="button-register"]');
        
        await page.goto('/membership');
        await page.click('[data-testid="button-select-monthly"]');
      });

      await test.step('Use declined test card', async () => {
        await page.waitForSelector('[data-testid="stripe-payment-element"]');
        
        // Use card that will be declined
        const cardFrame = page.frameLocator('iframe[name*="card"]');
        await cardFrame.locator('[placeholder*="1234"]').fill('4000000000000002');
        await cardFrame.locator('[placeholder*="MM"]').fill('12');
        await cardFrame.locator('[placeholder*="YY"]').fill('28');
        await cardFrame.locator('[placeholder*="CVC"]').fill('123');
        
        await page.click('[data-testid="button-complete-payment"]');
        
        // Should show payment error
        await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');
      });

      await test.step('Verify no subscription created on payment failure', async () => {
        await page.goto('/patient/dashboard');
        
        // Should not have active subscription
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('No active subscription');
        await expect(page.locator('[data-testid="membership-cta"]')).toBeVisible();
      });
    });

    test('should handle network errors during booking', async ({ page }) => {
      await test.step('Setup user with active membership', async () => {
        // Setup via API
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/setup-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, plan: 'monthly_plan' })
          });
        }, testUser);
        
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('Simulate network error during booking', async () => {
        // Intercept and fail the booking API call
        await page.route('/api/appointments', route => {
          route.abort('failed');
        });
        
        await page.goto('/patient/calendar');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        await page.click('[data-testid="button-confirm-booking"]');
        
        // Should show network error
        await expect(page.locator('[data-testid="booking-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="booking-error"]')).toContainText('network');
        
        // Should offer retry option
        await expect(page.locator('[data-testid="button-retry-booking"]')).toBeVisible();
      });
    });
  });

  test.describe('Membership Lifecycle Tests', () => {
    test.describe('Logged In User - Full Membership Lifecycle', () => {
      test('should complete full membership lifecycle: subscribe -> use -> cancel', async ({ page }) => {
        await test.step('Setup: Register and login user', async () => {
          await page.goto('/register');
          await page.fill('[data-testid="input-email"]', testUser.email);
          await page.fill('[data-testid="input-password"]', testUser.password);
          await page.fill('[data-testid="input-firstName"]', testUser.firstName);
          await page.fill('[data-testid="input-lastName"]', testUser.lastName);
          await page.click('[data-testid="button-register"]');
          await page.waitForURL('/patient/dashboard');
        });

        await test.step('Subscribe to monthly membership', async () => {
          await page.goto('/membership');
          await page.click('[data-testid="button-select-monthly"]');
          
          // Complete payment
          await page.waitForSelector('[data-testid="stripe-payment-element"]');
          const cardFrame = page.frameLocator('iframe[name*="card"]');
          await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
          await cardFrame.locator('[placeholder*="MM"]').fill('12');
          await cardFrame.locator('[placeholder*="YY"]').fill('28');
          await cardFrame.locator('[placeholder*="CVC"]').fill('123');
          
          await page.click('[data-testid="button-complete-payment"]');
          await page.waitForURL('/membership/success*');
          
          // Verify subscription active
          await page.goto('/patient/dashboard');
          await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
          await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('2');
        });

        await test.step('Use membership allowance', async () => {
          // Book first appointment
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click('[data-testid="time-slot"]:first-child');
          await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
          await page.click('[data-testid="button-confirm-booking"]');
          
          // Book second appointment
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click('[data-testid="time-slot"]:nth-child(2)');
          await page.click('[data-testid="button-confirm-booking"]');
          
          // Verify allowance exhausted
          await page.goto('/patient/dashboard');
          await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('0');
          await expect(page.locator('[data-testid="allowance-used"]')).toContainText('2');
        });

        await test.step('Cancel membership', async () => {
          // Navigate to membership management
          await page.goto('/patient/dashboard');
          await page.click('[data-testid="tab-membership"]');
          await page.click('[data-testid="button-cancel-membership"]');
          
          // Confirm cancellation
          await page.click('[data-testid="button-confirm-cancel"]');
          await page.fill('[data-testid="input-cancel-reason"]', 'Testing cancellation flow');
          await page.click('[data-testid="button-submit-cancel"]');
          
          // Verify cancellation
          await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
          await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Cancelled');
          await expect(page.locator('[data-testid="cancel-at-period-end"]')).toBeVisible();
        });

        await test.step('Verify no coverage after cancellation period', async () => {
          // Simulate time passage (via API)
          await page.evaluate(async (email) => {
            await fetch('/api/test/simulate-period-end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
          }, testUser.email);
          
          // Try to book appointment
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click('[data-testid="time-slot"]:first-child');
          
          // Should not be covered
          await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Pay per visit');
          await expect(page.locator('[data-testid="subscription-expired"]')).toBeVisible();
        });
      });
    });

    test.describe('Unlogged User with Existing Account - Membership Lifecycle', () => {
      test('should handle membership lifecycle for existing user', async ({ page }) => {
        await test.step('Setup: Create existing user account', async () => {
          // Create user via API (simulate existing account)
          await page.evaluate(async (testUser) => {
            await fetch('/api/test/create-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testUser)
            });
          }, testUser);
        });

        await test.step('Navigate to membership page while unlogged', async () => {
          await page.goto('/membership');
          
          // Should be redirected to login or shown login modal
          await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
          await expect(page.locator('[data-testid="login-to-continue"]')).toContainText('login to continue');
        });

        await test.step('Login with existing account', async () => {
          await page.click('[data-testid="button-login"]');
          await page.fill('[data-testid="input-email"]', testUser.email);
          await page.fill('[data-testid="input-password"]', testUser.password);
          await page.click('[data-testid="button-submit-login"]');
          
          // Should return to membership page
          await page.waitForURL('/membership');
          await expect(page.locator('[data-testid="membership-plans"]')).toBeVisible();
        });

        await test.step('Complete membership subscription', async () => {
          await page.click('[data-testid="button-select-monthly"]');
          
          // Complete payment
          await page.waitForSelector('[data-testid="stripe-payment-element"]');
          const cardFrame = page.frameLocator('iframe[name*="card"]');
          await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
          await cardFrame.locator('[placeholder*="MM"]').fill('12');
          await cardFrame.locator('[placeholder*="YY"]').fill('28');
          await cardFrame.locator('[placeholder*="CVC"]').fill('123');
          
          await page.click('[data-testid="button-complete-payment"]');
          await page.waitForURL('/membership/success*');
        });

        await test.step('Use and cancel membership', async () => {
          // Use one appointment
          await page.goto('/patient/calendar');
          await page.click('[data-testid="doctor-card"]:first-child');
          await page.click('[data-testid="time-slot"]:first-child');
          await page.click('[data-testid="button-confirm-booking"]');
          
          // Cancel membership
          await page.goto('/patient/dashboard');
          await page.click('[data-testid="tab-membership"]');
          await page.click('[data-testid="button-cancel-membership"]');
          await page.click('[data-testid="button-confirm-cancel"]');
          await page.fill('[data-testid="input-cancel-reason"]', 'Testing existing user flow');
          await page.click('[data-testid="button-submit-cancel"]');
          
          await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
        });
      });
    });

    test.describe('Unlogged User - Create Account and Membership Lifecycle', () => {
      test('should handle membership lifecycle for new user account creation', async ({ page }) => {
        await test.step('Navigate to membership as unlogged user', async () => {
          await page.goto('/membership');
          
          // Should prompt for account creation
          await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
          await expect(page.locator('[data-testid="create-account-cta"]')).toBeVisible();
        });

        await test.step('Create new account from membership page', async () => {
          await page.click('[data-testid="button-create-account"]');
          
          // Fill registration form
          await page.fill('[data-testid="input-email"]', testUser.email);
          await page.fill('[data-testid="input-password"]', testUser.password);
          await page.fill('[data-testid="input-firstName"]', testUser.firstName);
          await page.fill('[data-testid="input-lastName"]', testUser.lastName);
          await page.click('[data-testid="button-register"]');
          
          // Should return to membership page after registration
          await page.waitForURL('/membership');
          await expect(page.locator('[data-testid="membership-plans"]')).toBeVisible();
        });

        await test.step('Complete full membership lifecycle', async () => {
          // Subscribe
          await page.click('[data-testid="button-select-6month"]');
          
          await page.waitForSelector('[data-testid="stripe-payment-element"]');
          const cardFrame = page.frameLocator('iframe[name*="card"]');
          await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
          await cardFrame.locator('[placeholder*="MM"]').fill('12');
          await cardFrame.locator('[placeholder*="YY"]').fill('28');
          await cardFrame.locator('[placeholder*="CVC"]').fill('123');
          
          await page.click('[data-testid="button-complete-payment"]');
          await page.waitForURL('/membership/success*');
          
          // Use multiple appointments
          for (let i = 0; i < 3; i++) {
            await page.goto('/patient/calendar');
            await page.click('[data-testid="doctor-card"]:first-child');
            await page.click(`[data-testid="time-slot"]:nth-child(${i + 1})`);
            await page.click('[data-testid="button-confirm-booking"]');
          }
          
          // Verify usage
          await page.goto('/patient/dashboard');
          await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('9');
          await expect(page.locator('[data-testid="allowance-used"]')).toContainText('3');
          
          // Cancel membership
          await page.click('[data-testid="tab-membership"]');
          await page.click('[data-testid="button-cancel-membership"]');
          await page.click('[data-testid="button-confirm-cancel"]');
          await page.fill('[data-testid="input-cancel-reason"]', 'Testing new user flow');
          await page.click('[data-testid="button-submit-cancel"]');
          
          await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
        });
      });
    });
  });

  test.describe('Membership Upgrade Scenarios', () => {
    test('should handle upgrade from existing credit to 6-month membership', async ({ page }) => {
      await test.step('Setup user with existing credit balance', async () => {
        // Create user with credit via API
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/create-user-with-credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ...testUser,
              creditBalance: 70.00 // €70 credit (2 appointments worth)
            })
          });
        }, testUser);
        
        // Login
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('Verify existing credit balance', async () => {
        await page.goto('/patient/dashboard');
        
        // Check credit balance
        await expect(page.locator('[data-testid="credit-balance"]')).toContainText('€70.00');
        await expect(page.locator('[data-testid="credit-note"]')).toContainText('available for appointments');
        
        // Should not have active membership
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('No active subscription');
      });

      await test.step('Use some existing credit for appointments', async () => {
        // Book appointment using credit
        await page.goto('/patient/calendar');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Should show credit coverage
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by credit');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€0.00');
        await expect(page.locator('[data-testid="credit-deduction"]')).toContainText('€35.00 will be deducted');
        
        await page.click('[data-testid="button-confirm-booking"]');
        
        // Verify credit deduction
        await page.goto('/patient/dashboard');
        await expect(page.locator('[data-testid="credit-balance"]')).toContainText('€35.00');
      });

      await test.step('Navigate to membership upgrade', async () => {
        await page.goto('/membership');
        
        // Should show upgrade options with credit information
        await expect(page.locator('[data-testid="existing-credit-notice"]')).toBeVisible();
        await expect(page.locator('[data-testid="existing-credit-notice"]')).toContainText('€35.00 credit');
        await expect(page.locator('[data-testid="credit-conversion-info"]')).toBeVisible();
      });

      await test.step('Select 6-month membership upgrade', async () => {
        await page.click('[data-testid="button-select-6month"]');
        
        // Should show upgrade confirmation with credit handling
        await expect(page.locator('[data-testid="upgrade-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-cost"]')).toContainText('€219.00');
        await expect(page.locator('[data-testid="existing-credit"]')).toContainText('€35.00');
        await expect(page.locator('[data-testid="credit-application"]')).toContainText('Applied to first month');
        await expect(page.locator('[data-testid="net-amount"]')).toContainText('€184.00');
      });

      await test.step('Complete upgrade payment', async () => {
        await page.waitForSelector('[data-testid="stripe-payment-element"]');
        const cardFrame = page.frameLocator('iframe[name*="card"]');
        await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
        await cardFrame.locator('[placeholder*="MM"]').fill('12');
        await cardFrame.locator('[placeholder*="YY"]').fill('28');
        await cardFrame.locator('[placeholder*="CVC"]').fill('123');
        
        await page.click('[data-testid="button-complete-upgrade"]');
        await page.waitForURL('/membership/success*');
        
        // Verify upgrade success
        await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="credit-applied"]')).toContainText('€35.00 credit applied');
      });

      await test.step('Verify upgraded membership and credit handling', async () => {
        await page.goto('/patient/dashboard');
        
        // Check new subscription
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('6-Month');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('12');
        
        // Credit should be converted/applied
        await expect(page.locator('[data-testid="credit-balance"]')).toContainText('€0.00');
        
        // Should show credit conversion details
        await page.click('[data-testid="tab-billing"]');
        await expect(page.locator('[data-testid="credit-conversion-record"]')).toBeVisible();
        await expect(page.locator('[data-testid="credit-conversion-record"]')).toContainText('€35.00 credit applied to membership');
      });

      await test.step('Verify booking uses membership allowance', async () => {
        await page.goto('/patient/calendar');
        await page.click('[data-testid="doctor-card"]:first-child');
        await page.click('[data-testid="time-slot"]:first-child');
        
        // Should now use membership allowance, not credit
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        await expect(page.locator('[data-testid="allowance-note"]')).toContainText('1 of 12 consultations');
        
        await page.click('[data-testid="button-confirm-booking"]');
        
        // Verify allowance consumption
        await page.goto('/patient/dashboard');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('11');
        await expect(page.locator('[data-testid="allowance-used"]')).toContainText('1');
      });
    });

    test('should handle upgrade from monthly to 6-month membership', async ({ page }) => {
      await test.step('Setup user with active monthly membership', async () => {
        await page.evaluate(async (testUser) => {
          await fetch('/api/test/setup-monthly-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: testUser.email,
              allowanceUsed: 1 // Used 1 of 2 monthly consultations
            })
          });
        }, testUser);
        
        await page.goto('/login');
        await page.fill('[data-testid="input-email"]', testUser.email);
        await page.fill('[data-testid="input-password"]', testUser.password);
        await page.click('[data-testid="button-login"]');
      });

      await test.step('View current monthly membership', async () => {
        await page.goto('/patient/dashboard');
        
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('Monthly');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('1');
        await expect(page.locator('[data-testid="allowance-used"]')).toContainText('1');
      });

      await test.step('Navigate to upgrade options', async () => {
        await page.click('[data-testid="button-upgrade-membership"]');
        await page.waitForURL('/membership/upgrade*');
        
        // Should show current plan and upgrade options
        await expect(page.locator('[data-testid="current-plan"]')).toContainText('Monthly Membership');
        await expect(page.locator('[data-testid="upgrade-to-6month"]')).toBeVisible();
        await expect(page.locator('[data-testid="upgrade-benefits"]')).toContainText('Save €51 per year');
      });

      await test.step('Process upgrade to 6-month plan', async () => {
        await page.click('[data-testid="button-upgrade-to-6month"]');
        
        // Should show upgrade calculation
        await expect(page.locator('[data-testid="upgrade-calculation"]')).toBeVisible();
        await expect(page.locator('[data-testid="prorated-credit"]')).toContainText('Remaining monthly value');
        await expect(page.locator('[data-testid="upgrade-cost"]')).toContainText('Additional payment');
        
        // Complete upgrade payment
        await page.waitForSelector('[data-testid="stripe-payment-element"]');
        const cardFrame = page.frameLocator('iframe[name*="card"]');
        await cardFrame.locator('[placeholder*="1234"]').fill('4242424242424242');
        await cardFrame.locator('[placeholder*="MM"]').fill('12');
        await cardFrame.locator('[placeholder*="YY"]').fill('28');
        await cardFrame.locator('[placeholder*="CVC"]').fill('123');
        
        await page.click('[data-testid="button-complete-upgrade"]');
        await page.waitForURL('/membership/success*');
      });

      await test.step('Verify successful upgrade', async () => {
        await page.goto('/patient/dashboard');
        
        // Should now show 6-month membership
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('6-Month');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('11'); // Previous usage + new allowance
        
        // Check billing shows the upgrade
        await page.click('[data-testid="tab-billing"]');
        await expect(page.locator('[data-testid="upgrade-transaction"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-change"]')).toContainText('Monthly → 6-Month');
      });
    });
  });
});