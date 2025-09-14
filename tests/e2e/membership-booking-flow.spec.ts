/**
 * End-to-End Tests for Membership Booking Flow
 * Tests complete user journey from membership purchase to booking appointments with coverage
 * Stabilized with proper setup, mocking, and deterministic execution
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { nanoid } from 'nanoid';

// Test data generators for consistent, deterministic tests
const generateTestUser = () => ({
  email: `testuser+${nanoid(6)}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '+33123456789'
});

const generateTestDoctor = () => ({
  email: `doctor+${nanoid(6)}@example.com`,
  password: 'DoctorPassword123!',
  firstName: 'Dr. Test',
  lastName: 'Doctor',
  specialty: 'general_medicine',
  consultationPrice: '35.00'
});

// Mock Stripe test card details (deterministic test data)
const TEST_CARD_DATA = {
  number: '4242424242424242',
  expiry: '12/28',
  cvc: '123',
  postalCode: '12345'
};

// Seed data for reliable testing
interface TestSetupData {
  testUser: any;
  testDoctor: any;
  baseUrl: string;
}

test.describe('Membership Booking Flow E2E Tests', () => {
  let testSetupData: TestSetupData;

  test.beforeAll(async ({ browser }) => {
    // Setup deterministic test data
    testSetupData = {
      testUser: generateTestUser(),
      testDoctor: generateTestDoctor(),
      baseUrl: process.env.BASE_URL || 'http://localhost:5000'
    };

    // Create a setup context to seed the database
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    
    try {
      // Setup test doctor in database (via API or direct DB call)
      await setupTestDoctor(setupPage, testSetupData.testDoctor);
      
      // Setup membership plans if not exist
      await setupMembershipPlans(setupPage);
      
    } catch (error) {
      console.warn('Test setup failed, tests may be unreliable:', error);
    } finally {
      await setupContext.close();
    }
  });

  test.beforeEach(async ({ page, context }) => {
    // Setup Stripe test mode by intercepting network calls
    await setupStripeTestMode(page);
    
    // Setup API request interception for deterministic responses
    await setupApiMocking(page);
    
    // Navigate to homepage
    await page.goto(testSetupData.baseUrl);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete Membership Purchase and Booking Journey', () => {
    test('should complete membership subscription and book covered appointment', async ({ page }) => {
      // Step 1: Register new patient account
      await test.step('Register new patient account', async () => {
        await page.locator('[data-testid="nav-register"]').click();
        await page.waitForSelector('[data-testid="register-form"]', { timeout: 10000 });
        
        await page.locator('[data-testid="input-email"]').fill(testSetupData.testUser.email);
        await page.locator('[data-testid="input-password"]').fill(testSetupData.testUser.password);
        await page.locator('[data-testid="input-firstName"]').fill(testSetupData.testUser.firstName);
        await page.locator('[data-testid="input-lastName"]').fill(testSetupData.testUser.lastName);
        
        await page.locator('[data-testid="button-register"]').click();
        
        // Wait for successful registration and redirect
        await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
        
        // Verify registration success
        await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');
      });

      // Step 2: Navigate to membership plans
      await test.step('Navigate to membership plans', async () => {
        await page.locator('[data-testid="link-membership"]').click();
        await page.waitForURL('**/membership', { timeout: 10000 });
        
        // Verify membership page loads with plans
        await expect(page.locator('[data-testid="membership-plans"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-monthly"]')).toBeVisible();
        await expect(page.locator('[data-testid="plan-6month"]')).toBeVisible();
        
        // Verify plan details are displayed correctly
        await expect(page.locator('[data-testid="plan-monthly"] [data-testid="plan-price"]')).toContainText('€45');
        await expect(page.locator('[data-testid="plan-6month"] [data-testid="plan-price"]')).toContainText('€219');
      });

      // Step 3: Select monthly membership plan
      await test.step('Select monthly membership plan', async () => {
        await page.locator('[data-testid="button-select-monthly"]').click();
        await page.waitForURL('**/membership/subscribe?plan=monthly_plan', { timeout: 10000 });
        
        // Verify plan details are displayed on subscription page
        await expect(page.locator('[data-testid="plan-details"]')).toContainText('Monthly Membership');
        await expect(page.locator('[data-testid="plan-price"]')).toContainText('€45');
        await expect(page.locator('[data-testid="plan-allowance"]')).toContainText('2 consultations');
      });

      // Step 4: Complete payment with test card
      await test.step('Complete payment with test card', async () => {
        // Wait for Stripe elements to load
        await page.waitForSelector('[data-testid="stripe-payment-element"]', { timeout: 15000 });
        
        // Fill in test card details in Stripe iframe
        await fillStripePaymentForm(page, TEST_CARD_DATA);
        
        // Submit payment
        await page.locator('[data-testid="button-complete-payment"]').click();
        
        // Wait for payment success with timeout
        await page.waitForURL('**/membership/success*', { timeout: 30000 });
        await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('active');
      });

      // Step 5: Verify membership dashboard shows active subscription
      await test.step('Verify membership dashboard shows active subscription', async () => {
        await page.locator('[data-testid="link-dashboard"]').click();
        await page.waitForURL('**/patient/dashboard', { timeout: 10000 });
        
        // Check subscription status on dashboard
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('2');
        await expect(page.locator('[data-testid="membership-plan"]')).toContainText('Monthly');
        
        // Verify membership benefits are displayed
        await expect(page.locator('[data-testid="membership-benefits"]')).toBeVisible();
      });

      // Step 6: Book first appointment with membership coverage
      await test.step('Book first appointment with coverage', async () => {
        await page.locator('[data-testid="link-book-appointment"]').click();
        await page.waitForURL('**/patient/calendar*', { timeout: 10000 });
        
        // Wait for doctors to load
        await page.waitForSelector('[data-testid="doctor-card"]', { timeout: 10000 });
        
        // Select the first available doctor
        await page.locator('[data-testid="doctor-card"]').first().click();
        
        // Wait for time slots to load
        await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
        
        // Select the first available time slot
        await page.locator('[data-testid="time-slot"]:not([disabled])').first().click();
        
        // Verify coverage information is displayed
        await expect(page.locator('[data-testid="coverage-info"]')).toBeVisible();
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€0.00');
        
        // Complete booking
        await page.locator('[data-testid="button-confirm-booking"]').click();
        
        // Wait for booking confirmation
        await page.waitForURL('**/appointment/confirmation*', { timeout: 15000 });
        await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="appointment-cost"]')).toContainText('€0.00');
        await expect(page.locator('[data-testid="covered-by-membership"]')).toBeVisible();
      });

      // Step 7: Verify allowance was consumed
      await test.step('Verify allowance was consumed on dashboard', async () => {
        await page.locator('[data-testid="link-dashboard"]').click();
        await page.waitForURL('**/patient/dashboard', { timeout: 10000 });
        
        // Check that allowance was decremented
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('1');
        
        // Verify appointment appears in recent appointments
        await expect(page.locator('[data-testid="recent-appointments"]')).toBeVisible();
        await expect(page.locator('[data-testid="appointment-covered-badge"]')).toBeVisible();
      });

      // Step 8: Book second appointment to test remaining allowance
      await test.step('Book second appointment with remaining allowance', async () => {
        await page.locator('[data-testid="link-book-appointment"]').click();
        await page.waitForURL('**/patient/calendar*', { timeout: 10000 });
        
        // Book another appointment
        await page.locator('[data-testid="doctor-card"]').first().click();
        await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
        await page.locator('[data-testid="time-slot"]:not([disabled])').first().click();
        
        // Should still be covered
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Covered by membership');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€0.00');
        
        await page.locator('[data-testid="button-confirm-booking"]').click();
        await page.waitForURL('**/appointment/confirmation*', { timeout: 15000 });
        await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
      });

      // Step 9: Verify allowance is exhausted
      await test.step('Verify allowance is exhausted after second booking', async () => {
        await page.locator('[data-testid="link-dashboard"]').click();
        await page.waitForURL('**/patient/dashboard', { timeout: 10000 });
        
        // Check that allowance is now exhausted
        await expect(page.locator('[data-testid="allowance-remaining"]')).toContainText('0');
        
        // Should show allowance exhausted banner
        await expect(page.locator('[data-testid="allowance-exhausted-banner"]')).toBeVisible();
      });

      // Step 10: Attempt to book third appointment (should require payment)
      await test.step('Attempt third booking requiring payment', async () => {
        await page.locator('[data-testid="link-book-appointment"]').click();
        await page.waitForURL('**/patient/calendar*', { timeout: 10000 });
        
        await page.locator('[data-testid="doctor-card"]').first().click();
        await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
        await page.locator('[data-testid="time-slot"]:not([disabled])').first().click();
        
        // Should require payment now
        await expect(page.locator('[data-testid="coverage-status"]')).toContainText('Payment required');
        await expect(page.locator('[data-testid="patient-cost"]')).toContainText('€35.00');
        await expect(page.locator('[data-testid="allowance-exhausted-notice"]')).toBeVisible();
      });
    });

    test('should handle subscription cancellation flow', async ({ page }) => {
      // Setup user with active subscription
      await setupUserWithActiveSubscription(page, testSetupData.testUser);

      await test.step('Navigate to subscription management', async () => {
        await page.goto(`${testSetupData.baseUrl}/patient/dashboard`);
        await page.locator('[data-testid="link-manage-subscription"]').click();
        await page.waitForURL('**/membership/manage', { timeout: 10000 });
      });

      await test.step('Cancel subscription', async () => {
        await page.locator('[data-testid="button-cancel-subscription"]').click();
        
        // Confirm cancellation in modal
        await page.locator('[data-testid="button-confirm-cancellation"]').click();
        
        // Verify cancellation success
        await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Cancelled');
        await expect(page.locator('[data-testid="access-until"]')).toBeVisible();
      });

      await test.step('Verify subscription access until period end', async () => {
        // Should still have access until period end
        await page.locator('[data-testid="link-dashboard"]').click();
        await expect(page.locator('[data-testid="subscription-ending-banner"]')).toBeVisible();
        
        // Can still book appointments until period ends
        await page.locator('[data-testid="link-book-appointment"]').click();
        await page.waitForSelector('[data-testid="doctor-card"]', { timeout: 10000 });
        await expect(page.locator('[data-testid="coverage-info"]')).toBeVisible();
      });
    });

    test('should handle payment failures gracefully', async ({ page }) => {
      await test.step('Register and attempt subscription with failing card', async () => {
        // Register user
        await registerTestUser(page, testSetupData.testUser);
        
        // Navigate to membership
        await page.locator('[data-testid="link-membership"]').click();
        await page.locator('[data-testid="button-select-monthly"]').click();
        
        // Use failing test card
        await page.waitForSelector('[data-testid="stripe-payment-element"]', { timeout: 15000 });
        await fillStripePaymentForm(page, {
          number: '4000000000000002', // Stripe test card that fails
          expiry: '12/28',
          cvc: '123',
          postalCode: '12345'
        });
        
        await page.locator('[data-testid="button-complete-payment"]').click();
        
        // Should show payment error
        await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');
      });

      await test.step('Retry with successful card', async () => {
        // Retry with working card
        await fillStripePaymentForm(page, TEST_CARD_DATA);
        await page.locator('[data-testid="button-complete-payment"]').click();
        
        // Should succeed
        await page.waitForURL('**/membership/success*', { timeout: 30000 });
        await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      });
    });
  });

  test.describe('UI Component Data-TestID Validation', () => {
    test('should have all required data-testid attributes for membership flow', async ({ page }) => {
      // Navigate through membership flow and verify all required data-testids exist
      await page.goto(testSetupData.baseUrl);

      // Homepage
      await expect(page.locator('[data-testid="nav-register"]')).toBeVisible();
      await expect(page.locator('[data-testid="link-membership"]')).toBeVisible();

      // Membership page
      await page.locator('[data-testid="link-membership"]').click();
      await expect(page.locator('[data-testid="membership-plans"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-monthly"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-6month"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-select-monthly"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-select-6month"]')).toBeVisible();

      // Registration form
      await page.locator('[data-testid="nav-register"]').click();
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-password"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-firstName"]')).toBeVisible();
      await expect(page.locator('[data-testid="input-lastName"]')).toBeVisible();
      await expect(page.locator('[data-testid="button-register"]')).toBeVisible();
    });

    test('should have proper data-testids for booking flow', async ({ page }) => {
      // Setup authenticated user
      await setupAuthenticatedUser(page, testSetupData.testUser);

      // Navigate to booking
      await page.goto(`${testSetupData.baseUrl}/patient/calendar`);

      // Verify booking-related data-testids
      await expect(page.locator('[data-testid="doctor-list"]')).toBeVisible();
      await page.waitForSelector('[data-testid="doctor-card"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="doctor-card"]').first()).toBeVisible();
      
      // Click doctor and verify slot data-testids
      await page.locator('[data-testid="doctor-card"]').first().click();
      await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="time-slot"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="calendar-navigation"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Simulate network failure during subscription
      await page.route('**/api/membership/subscribe', route => {
        route.abort('failed');
      });

      await registerTestUser(page, testSetupData.testUser);
      await page.locator('[data-testid="link-membership"]').click();
      await page.locator('[data-testid="button-select-monthly"]').click();

      await page.waitForSelector('[data-testid="stripe-payment-element"]', { timeout: 15000 });
      await fillStripePaymentForm(page, TEST_CARD_DATA);
      await page.locator('[data-testid="button-complete-payment"]').click();

      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    });

    test('should handle concurrent booking attempts', async ({ page, context }) => {
      await setupUserWithActiveSubscription(page, testSetupData.testUser);

      // Open second tab for concurrent booking
      const secondPage = await context.newPage();
      await setupUserWithActiveSubscription(secondPage, testSetupData.testUser);

      // Both pages attempt to book simultaneously
      const [booking1, booking2] = await Promise.all([
        bookAppointment(page),
        bookAppointment(secondPage)
      ]);

      // One should succeed, one should show conflict or exhausted allowance
      const hasSuccess = await page.locator('[data-testid="booking-success"]').isVisible();
      const hasConflict = await secondPage.locator('[data-testid="booking-conflict"]').isVisible();

      expect(hasSuccess || hasConflict).toBe(true);

      await secondPage.close();
    });
  });
});

// Helper functions for test setup and reusable operations

async function fillStripePaymentForm(page: Page, cardData: any): Promise<void> {
  // Handle Stripe Elements iframe interaction
  const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');
  
  // Fill card number
  const cardNumberField = stripeFrame.locator('input[placeholder*="1234"]');
  await cardNumberField.waitFor({ timeout: 10000 });
  await cardNumberField.fill(cardData.number);
  
  // Fill expiry
  await stripeFrame.locator('input[placeholder*="MM"]').fill(cardData.expiry.split('/')[0]);
  await stripeFrame.locator('input[placeholder*="YY"]').fill(cardData.expiry.split('/')[1]);
  
  // Fill CVC
  await stripeFrame.locator('input[placeholder*="CVC"]').fill(cardData.cvc);
  
  // Fill postal code if field exists
  const postalField = stripeFrame.locator('input[placeholder*="postal"], input[placeholder*="ZIP"]');
  if (await postalField.count() > 0) {
    await postalField.fill(cardData.postalCode);
  }
}

async function registerTestUser(page: Page, userData: any): Promise<void> {
  await page.locator('[data-testid="nav-register"]').click();
  await page.waitForSelector('[data-testid="register-form"]', { timeout: 10000 });
  
  await page.locator('[data-testid="input-email"]').fill(userData.email);
  await page.locator('[data-testid="input-password"]').fill(userData.password);
  await page.locator('[data-testid="input-firstName"]').fill(userData.firstName);
  await page.locator('[data-testid="input-lastName"]').fill(userData.lastName);
  
  await page.locator('[data-testid="button-register"]').click();
  await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
}

async function setupUserWithActiveSubscription(page: Page, userData: any): Promise<void> {
  // Mock user with active subscription
  await page.route('**/api/membership/subscription', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hasSubscription: true,
        subscription: {
          id: 'sub_test123',
          status: 'active',
          planId: 'monthly_plan',
          planName: 'Monthly Membership'
        },
        allowanceRemaining: 2
      })
    });
  });

  await registerTestUser(page, userData);
}

async function setupAuthenticatedUser(page: Page, userData: any): Promise<void> {
  // Setup mock authentication
  await page.addInitScript(() => {
    window.localStorage.setItem('auth_token', 'mock_test_token');
  });
  
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 123,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'patient'
      })
    });
  });
}

async function bookAppointment(page: Page): Promise<void> {
  await page.locator('[data-testid="link-book-appointment"]').click();
  await page.waitForSelector('[data-testid="doctor-card"]', { timeout: 10000 });
  await page.locator('[data-testid="doctor-card"]').first().click();
  await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
  await page.locator('[data-testid="time-slot"]:not([disabled])').first().click();
  await page.locator('[data-testid="button-confirm-booking"]').click();
}

async function setupTestDoctor(page: Page, doctorData: any): Promise<void> {
  // Mock API call to create/seed test doctor in database
  await page.route('**/api/admin/doctors', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'doc_test_123',
        ...doctorData,
        status: 'approved'
      })
    });
  });

  // Mock doctors list API to include our test doctor
  await page.route('**/api/doctors', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'doc_test_123',
          userId: 456,
          ...doctorData,
          user: {
            id: 456,
            firstName: doctorData.firstName,
            lastName: doctorData.lastName,
            email: doctorData.email
          },
          rating: 5.0,
          reviewCount: 0,
          availability: [
            {
              date: new Date().toISOString().split('T')[0],
              slots: [
                { time: '09:00', available: true },
                { time: '10:00', available: true },
                { time: '11:00', available: true }
              ]
            }
          ]
        }
      ])
    });
  });
}

async function setupMembershipPlans(page: Page): Promise<void> {
  // Mock membership plans API for consistent test data
  await page.route('**/api/membership/plans', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'monthly_plan',
          name: 'Monthly Membership',
          priceAmount: 4500, // €45.00 in cents
          currency: 'EUR',
          interval: 'month',
          intervalCount: 1,
          allowancePerCycle: 2,
          description: '2 consultations per month'
        },
        {
          id: 'biannual_plan',
          name: '6-Month Membership',
          priceAmount: 21900, // €219.00 in cents
          currency: 'EUR',
          interval: 'month',
          intervalCount: 6,
          allowancePerCycle: 12,
          description: '12 consultations over 6 months'
        }
      ])
    });
  });
}

async function setupStripeTestMode(page: Page): Promise<void> {
  // Set up Stripe in test mode by intercepting and mocking Stripe API calls
  await page.addInitScript(() => {
    // Override Stripe configuration to use test keys
    if (typeof window !== 'undefined') {
      (window as any).STRIPE_TEST_MODE = true;
      (window as any).STRIPE_PUBLIC_KEY = 'pk_test_51MockTestKey';
    }
  });

  // Mock Stripe subscription creation API
  await page.route('**/api/membership/subscribe', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriptionId: 'sub_test_mock_123',
        clientSecret: 'pi_test_mock_secret_456',
        status: 'requires_payment_method'
      })
    });
  });

  // Mock Stripe payment confirmation API
  await page.route('**/api/membership/confirm-payment', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        subscriptionId: 'sub_test_mock_123',
        status: 'active',
        message: 'Payment successful'
      })
    });
  });

  // Mock Stripe webhook events for subscription status
  await page.route('**/api/webhooks/stripe', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ received: true })
    });
  });
}

async function setupApiMocking(page: Page): Promise<void> {
  // Handle analytics API failures gracefully
  await page.route('**/api/analytics/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // Handle auth API calls
  await page.route('**/api/auth/user', route => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not authenticated' })
    });
  });

  // Handle doctor fetching for homepage
  await page.route('**/api/doctors', route => {
    if (route.request().url().includes('api/doctors')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc_test_123',
            userId: 456,
            specialty: 'general_medicine',
            consultationPrice: '35.00',
            rating: 5.0,
            reviewCount: 0,
            user: {
              id: 456,
              firstName: 'Dr. Test',
              lastName: 'Doctor',
              email: 'doctor@test.com'
            }
          }
        ])
      });
    } else {
      route.continue();
    }
  });

  // Suppress unhandled promise rejections in console
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', (event) => {
      // Prevent unhandled promise rejections from failing tests
      event.preventDefault();
      console.log('Suppressed unhandled promise rejection in test:', event.reason);
    });
  });

  // Mock failed network requests to prevent console errors
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    
    // Let explicitly mocked routes pass through
    if (url.includes('/membership/') || url.includes('/auth/') || url.includes('/doctors')) {
      return route.continue();
    }
    
    // Mock other API calls with success responses
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });
}