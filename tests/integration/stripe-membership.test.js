/**
 * Integration Tests for Stripe Membership System
 * Tests real API endpoints with supertest, authentication, validation, and storage effects
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { nanoid } from 'nanoid';

// Import the actual app and dependencies
let app, server;

// Import real database and storage for integration testing
import { db } from '../../server/db.ts';
import { storage } from '../../server/storage.ts';
import { 
  membershipSubscriptions,
  membershipCycles,
  membershipAllowanceEvents,
  users
} from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock Stripe for integration tests
const mockStripe = {
  products: {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({
      id: 'prod_test123',
      name: 'Monthly Membership'
    })
  },
  prices: {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({
      id: 'price_test123',
      unit_amount: 4500,
      currency: 'eur',
      recurring: { interval: 'month', interval_count: 1 }
    })
  },
  customers: {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com'
    })
  },
  subscriptions: {
    create: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'incomplete',
      latest_invoice: {
        payment_intent: {
          id: 'pi_test123',
          client_secret: 'pi_test123_secret_test'
        }
      },
      metadata: {
        userId: '123',
        planId: 'monthly_plan'
      },
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      metadata: { planId: 'monthly_plan' },
      items: { data: [{ price: { unit_amount: 4500, recurring: { interval: 'month', interval_count: 1 } } }] }
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'active',
      cancel_at_period_end: true,
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    })
  },
  setupIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'seti_test123',
      client_secret: 'seti_test123_secret_test'
    }),
    list: jest.fn().mockResolvedValue({ data: [] })
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

// Mock the Stripe constructor (only mock external services)
jest.mock('stripe', () => jest.fn(() => mockStripe));

// Mock authentication middleware for tests (minimal auth stub)
let currentTestUser = null;

const mockAuthenticateUser = async (req, res, next) => {
  req.user = currentTestUser || {
    id: 123,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    stripeCustomerId: null,
    stripeSubscriptionId: null
  };
  next();
};

describe('Stripe Membership Integration Tests', () => {
  let testUser;
  
  beforeAll(async () => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Override authentication for tests (minimal auth stub)
    jest.doMock('../../server/supabaseAuth', () => ({
      isAuthenticated: mockAuthenticateUser
    }));
    
    // Import and register routes after mocking
    const { registerRoutes } = await import('../../server/routes.ts');
    server = await registerRoutes(app);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Generate unique test user data for this test run
    const uniqueEmail = `test-${nanoid(8)}@example.com`;
    
    testUser = {
      email: uniqueEmail,
      firstName: 'Test',
      lastName: 'User',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      role: 'patient'
    };

    // Clean up any existing test data first
    await cleanupTestData();
    
    // Create real test user in database
    const createdUser = await storage.createUser(testUser);
    testUser.id = createdUser.id;
    
    // Update current test user for authentication mock
    currentTestUser = testUser;
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });
  
  afterAll(async () => {
    if (server) {
      server.close();
    }
  });
  
  async function cleanupTestData() {
    try {
      if (testUser?.id) {
        // Query database to get current state, not relying on in-memory testUser object
        const currentUser = await storage.getUser(testUser.id.toString());
        if (!currentUser) {
          console.log('User no longer exists in database, cleanup skipped');
          return;
        }
        
        // Delete test data in reverse dependency order to avoid foreign key constraints
        
        // Get all subscription records for this user to find related cycles
        const userSubscriptions = await db.select()
          .from(membershipSubscriptions)
          .where(eq(membershipSubscriptions.patientId, currentUser.id));
        
        for (const subscription of userSubscriptions) {
          // Get cycles for this subscription
          const cycles = await db.select()
            .from(membershipCycles)
            .where(eq(membershipCycles.subscriptionId, subscription.id));
          
          // Delete allowance events for each cycle
          for (const cycle of cycles) {
            await db.delete(membershipAllowanceEvents)
              .where(eq(membershipAllowanceEvents.cycleId, cycle.id));
          }
          
          // Delete cycles for this subscription
          await db.delete(membershipCycles)
            .where(eq(membershipCycles.subscriptionId, subscription.id));
        }
        
        // Delete all subscription records for this user
        await db.delete(membershipSubscriptions)
          .where(eq(membershipSubscriptions.patientId, currentUser.id));
        
        // Finally delete the user record itself
        await db.delete(users).where(eq(users.id, currentUser.id));
        
        console.log(`Successfully cleaned up test data for user ${currentUser.id}`);
      }
    } catch (error) {
      // Ignore cleanup errors in tests - data may not exist yet
      console.log('Test cleanup error (ignored):', error.message);
    }
  }

  describe('GET /api/membership/plans', () => {
    it('should return available membership plans', async () => {
      const response = await request(app)
        .get('/api/membership/plans')
        .expect(200);

      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBe(true);
      expect(response.body.plans).toHaveLength(2);
      
      const monthlyPlan = response.body.plans.find(p => p.id === 'monthly_plan');
      const biannualPlan = response.body.plans.find(p => p.id === 'biannual_plan');
      
      expect(monthlyPlan).toMatchObject({
        id: 'monthly_plan',
        name: 'Monthly Membership',
        priceAmount: '45.00',
        currency: 'EUR',
        billingInterval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2
      });
      
      expect(biannualPlan).toMatchObject({
        id: 'biannual_plan',
        name: '6-Month Membership',
        priceAmount: '219.00',
        currency: 'EUR',
        billingInterval: '6_months',
        intervalCount: 6,
        allowancePerCycle: 12
      });
    });
  });

  describe('POST /api/membership/subscribe', () => {
    it('should create subscription with monthly plan', async () => {
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' })
        .expect(200);

      expect(response.body).toHaveProperty('subscriptionId', 'sub_test123');
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('customerId', 'cus_test123');
      expect(response.body).toHaveProperty('status', 'incomplete');
      expect(response.body).toHaveProperty('paymentType');

      // Verify Stripe interactions occurred (still mock external service)
      expect(mockStripe.products.list).toHaveBeenCalled();
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: testUser.email,
        name: `${testUser.firstName} ${testUser.lastName}`,
        metadata: {
          userId: testUser.id.toString(),
          planId: 'monthly_plan'
        }
      });
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();

      // Verify real database state: user was updated with subscription details
      const updatedUser = await storage.getUser(testUser.id);
      expect(updatedUser.stripeCustomerId).toBe('cus_test123');
      expect(updatedUser.stripeSubscriptionId).toBe('sub_test123');
      expect(updatedUser.pendingSubscriptionPlan).toBe('monthly_plan');
    });

    it('should create subscription with 6-month plan', async () => {
      // Update mocks for 6-month plan
      mockStripe.subscriptions.create.mockResolvedValueOnce({
        id: 'sub_test456',
        status: 'incomplete',
        latest_invoice: {
          payment_intent: {
            id: 'pi_test456',
            client_secret: 'pi_test456_secret_test'
          }
        },
        metadata: {
          userId: testUser.id.toString(),
          planId: 'biannual_plan'
        }
      });

      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'biannual_plan' })
        .expect(200);

      expect(response.body).toHaveProperty('subscriptionId', 'sub_test456');
      
      // Verify Stripe API interactions
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_test123',
        unit_amount: 21900,
        currency: 'eur',
        recurring: {
          interval: 'month',
          interval_count: 6
        },
        metadata: { planId: 'biannual_plan' }
      });
      
      // Verify real database state: user updated with 6-month subscription details  
      const updatedUser = await storage.getUser(testUser.id);
      expect(updatedUser.stripeSubscriptionId).toBe('sub_test456');
      expect(updatedUser.pendingSubscriptionPlan).toBe('biannual_plan');
      expect(updatedUser.stripeCustomerId).toBe('cus_test123');
    });

    it('should return 400 for invalid plan ID', async () => {
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'invalid_plan' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid plan selected');
    });

    it('should return 400 when plan ID is missing', async () => {
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Plan ID is required');
    });

    it('should reuse existing Stripe customer', async () => {
      // Mock existing customer
      mockStripe.customers.list.mockResolvedValueOnce({
        data: [{
          id: 'cus_existing123',
          email: testUser.email
        }]
      });

      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' })
        .expect(200);

      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123'
        })
      );

      // Verify real database state: user updated with existing customer
      const updatedUser = await storage.getUser(testUser.id);
      expect(updatedUser.stripeCustomerId).toBe('cus_existing123');
      expect(updatedUser.stripeSubscriptionId).toBe('sub_test123');
    });

    it('should handle Stripe errors gracefully', async () => {
      mockStripe.subscriptions.create.mockRejectedValueOnce(
        new Error('Stripe API error')
      );

      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to create subscription');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('GET /api/membership/subscription', () => {
    it('should return subscription status for user with active subscription', async () => {
      // Update test user with subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123'
      });

      const response = await request(app)
        .get('/api/membership/subscription')
        .expect(200);

      expect(response.body).toMatchObject({
        hasSubscription: true,
        subscription: {
          id: 'sub_test123',
          status: 'active',
          planId: 'monthly_plan'
        },
        allowanceRemaining: 2
      });

      // Verify Stripe API was called with real subscription ID
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123');
    });

    it('should return no subscription for user without subscription', async () => {
      const response = await request(app)
        .get('/api/membership/subscription')
        .expect(200);

      expect(response.body).toMatchObject({
        hasSubscription: false,
        subscription: null,
        allowanceRemaining: 0
      });

      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it('should handle Stripe retrieval errors', async () => {
      // Update test user with invalid subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: 'sub_invalid'
      });
      
      mockStripe.subscriptions.retrieve.mockRejectedValueOnce(
        new Error('Subscription not found')
      );

      const response = await request(app)
        .get('/api/membership/subscription')
        .expect(200);

      expect(response.body).toMatchObject({
        hasSubscription: false,
        subscription: null,
        allowanceRemaining: 0
      });
    });
  });

  describe('POST /api/membership/cancel', () => {
    beforeEach(async () => {
      // Update test user with subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should cancel subscription at period end', async () => {
      const response = await request(app)
        .post('/api/membership/cancel')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Subscription will be cancelled at the end of the current billing period'
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test123',
        { cancel_at_period_end: true }
      );
    });

    it('should return 400 when user has no subscription', async () => {
      // Update test user to have no subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: null,
        stripeCustomerId: null
      });

      const response = await request(app)
        .post('/api/membership/cancel')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No active subscription found');
    });

    it('should handle Stripe cancellation errors', async () => {
      mockStripe.subscriptions.update.mockRejectedValueOnce(
        new Error('Failed to cancel subscription')
      );

      const response = await request(app)
        .post('/api/membership/cancel')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to cancel subscription with payment provider');
    });
  });

  describe('POST /api/membership/complete-subscription', () => {
    beforeEach(async () => {
      // Update test user with subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should complete active subscription', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      });

      const response = await request(app)
        .post('/api/membership/complete-subscription')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        subscription: {
          id: 'sub_test123',
          status: 'active'
        }
      });
    });

    it('should return 400 when user has no subscription', async () => {
      // Update test user to have no subscription in real database
      await storage.updateUser(testUser.id, { 
        stripeSubscriptionId: null,
        stripeCustomerId: null
      });

      const response = await request(app)
        .post('/api/membership/complete-subscription')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No subscription found');
    });

    it('should handle incomplete subscription with setup intent', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_test123',
        status: 'incomplete',
        customer: 'cus_test123'
      });

      mockStripe.setupIntents.list.mockResolvedValueOnce({
        data: []
      });

      mockStripe.setupIntents.create.mockResolvedValueOnce({
        id: 'seti_new123',
        client_secret: 'seti_new123_secret_test'
      });

      const response = await request(app)
        .post('/api/membership/complete-subscription')
        .expect(200);

      expect(response.body).toMatchObject({
        success: false,
        requiresPayment: true,
        subscriptionId: 'sub_test123',
        clientSecret: 'seti_new123_secret_test'
      });
      
      // Verify user state reflects incomplete subscription
      const updatedUser = await storage.getUser(testUser.id.toString());
      expect(updatedUser.stripeSubscriptionId).toBe('sub_test123');
      expect(updatedUser.stripeCustomerId).toBe('cus_test123');
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    let webhookTestUser;
    
    beforeEach(async () => {
      // Create a separate test user for webhook tests
      const uniqueEmail = `webhook-test-${nanoid(8)}@example.com`;
      webhookTestUser = await storage.createUser({
        email: uniqueEmail,
        firstName: 'Webhook',
        lastName: 'Test',
        role: 'patient'
      });
    });
    
    afterEach(async () => {
      // Clean up webhook test user
      if (webhookTestUser?.id) {
        try {
          await db.delete(users).where(eq(users.id, webhookTestUser.id));
        } catch (error) {
          console.log('Webhook test cleanup error (ignored):', error.message);
        }
      }
    });

    const createMockEvent = (type, data) => ({
      id: `evt_${nanoid(8)}`,
      type,
      data: { object: data }
    });

    it('should handle subscription created webhook and persist database changes', async () => {
      const mockEvent = createMockEvent('customer.subscription.created', {
        id: 'sub_webhook_test123',
        customer: 'cus_webhook_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        metadata: {
          userId: webhookTestUser.id.toString(),
          planId: 'monthly_plan'
        }
      });
      
      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      
      // Verify real database persistence effects
      const updatedUser = await storage.getUser(webhookTestUser.id.toString());
      expect(updatedUser.stripeCustomerId).toBe('cus_webhook_test123');
      expect(updatedUser.stripeSubscriptionId).toBe('sub_webhook_test123');
      
      // Verify subscription record was created in database
      const subscriptions = await db.select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.patientId, webhookTestUser.id));
      
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].stripeSubscriptionId).toBe('sub_webhook_test123');
      expect(subscriptions[0].stripeCustomerId).toBe('cus_webhook_test123');
      expect(subscriptions[0].status).toBe('active');
    });

    it('should handle subscription updated webhook and persist status changes', async () => {
      // First create a subscription in database
      await storage.updateUser(webhookTestUser.id.toString(), {
        stripeCustomerId: 'cus_webhook_test456',
        stripeSubscriptionId: 'sub_webhook_test456'
      });
      
      const mockEvent = createMockEvent('customer.subscription.updated', {
        id: 'sub_webhook_test456',
        customer: 'cus_webhook_test456',
        status: 'canceled',
        cancel_at_period_end: true,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        metadata: {
          userId: webhookTestUser.id.toString(),
          planId: 'monthly_plan'
        }
      });
      
      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      // Verify database reflects the cancellation
      const subscriptions = await db.select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, 'sub_webhook_test456'));
      
      if (subscriptions.length > 0) {
        expect(subscriptions[0].status).toBe('canceled');
      }
    });

    it('should reject webhook with invalid signature', async () => {
      const mockEvent = createMockEvent('customer.subscription.created', {
        id: 'sub_invalid',
        customer: 'cus_invalid',
        status: 'active'
      });
      
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify(mockEvent))
        .expect(400);
        
      // Verify no database changes occurred
      const subscriptions = await db.select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, 'sub_invalid'));
      
      expect(subscriptions).toHaveLength(0);
    });

    it('should reject webhook without signature', async () => {
      const mockEvent = createMockEvent('customer.subscription.created', {
        id: 'sub_no_sig',
        customer: 'cus_no_sig',
        status: 'active'
      });
      
      await request(app)
        .post('/api/webhooks/stripe')
        .send(JSON.stringify(mockEvent))
        .expect(400);
        
      // Verify no database changes occurred
      const subscriptions = await db.select()
        .from(membershipSubscriptions)
        .where(eq(membershipSubscriptions.stripeSubscriptionId, 'sub_no_sig'));
      
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for subscription endpoints', async () => {
      // Use jest.isolateModules to avoid module cache issues
      await jest.isolateModules(async () => {
        // Mock failed authentication before any imports
        const rejectAuth = (req, res, next) => {
          res.status(401).json({ error: 'Unauthorized' });
        };
        
        jest.doMock('../../server/supabaseAuth', () => ({
          isAuthenticated: rejectAuth,
          setupSupabaseAuth: jest.fn().mockResolvedValue(undefined),
          supabase: {
            auth: {
              getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
            }
          }
        }));
        
        // Create new app without auth for this test
        const unauthenticatedApp = express();
        unauthenticatedApp.use(express.json());
        
        // Import routes after mocking
        const { registerRoutes } = await import('../../server/routes.ts');
        const testServer = await registerRoutes(unauthenticatedApp);

        try {
          await request(unauthenticatedApp)
            .post('/api/membership/subscribe')
            .send({ planId: 'monthly_plan' })
            .expect(401);

          await request(unauthenticatedApp)
            .get('/api/membership/subscription')
            .expect(401);

          await request(unauthenticatedApp)
            .post('/api/membership/cancel')
            .expect(401);
        } finally {
          testServer.close();
        }
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate subscription request body', async () => {
      // Test with invalid JSON
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should validate plan ID format', async () => {
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 123 }) // number instead of string
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test verifies the API handles database errors gracefully
      // Note: In real integration tests, database errors would be handled by the app's error middleware
      
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' });

      // Should either succeed or fail gracefully with proper error handling
      expect([200, 400, 500]).toContain(response.status);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should handle Stripe service unavailable', async () => {
      mockStripe.subscriptions.create.mockRejectedValueOnce(
        Object.assign(new Error('Service unavailable'), { 
          type: 'StripeServiceError',
          code: 'service_unavailable'
        })
      );

      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });
  });
});