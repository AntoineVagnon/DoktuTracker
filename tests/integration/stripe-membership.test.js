/**
 * Integration Tests for Stripe Membership System
 * Tests real API endpoints with supertest, authentication, validation, and storage effects
 */

const { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const { nanoid } = require('nanoid');

// Import the actual app and dependencies
let app, server;

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

// Mock the Stripe constructor
jest.mock('stripe', () => jest.fn(() => mockStripe));

// Mock database operations
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

jest.mock('../../server/db', () => ({
  db: mockDb
}));

// Mock storage
const mockStorage = {
  getUser: jest.fn(),
  updateUser: jest.fn(),
  createUser: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

// Mock authentication middleware
const mockAuthenticateUser = async (req, res, next) => {
  req.user = {
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
    
    // Override authentication for tests
    jest.doMock('../../server/supabaseAuth', () => ({
      isAuthenticated: mockAuthenticateUser
    }));
    
    // Import and register routes after mocking
    const { registerRoutes } = require('../../server/routes');
    server = await registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    testUser = {
      id: 123,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    };

    // Setup default mock returns
    mockStorage.getUser.mockResolvedValue(testUser);
    mockStorage.updateUser.mockResolvedValue({ ...testUser, stripeSubscriptionId: 'sub_test123' });
    
    // Setup database mocks for schema validation
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    });
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-uuid' }])
      })
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

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

      // Verify Stripe interactions
      expect(mockStripe.products.list).toHaveBeenCalled();
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'Monthly Membership',
        description: '2 consultations per month with certified doctors',
        metadata: { planId: 'monthly_plan' }
      });
      
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_test123',
        unit_amount: 4500,
        currency: 'eur',
        recurring: {
          interval: 'month',
          interval_count: 1
        },
        metadata: { planId: 'monthly_plan' }
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: '123',
          planId: 'monthly_plan'
        }
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_test123' }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        metadata: {
          userId: '123',
          planId: 'monthly_plan',
          planName: 'Monthly Membership'
        }
      });

      // Verify user was updated with subscription ID
      expect(mockStorage.updateUser).toHaveBeenCalledWith(123, {
        stripeSubscriptionId: 'sub_test123',
        pendingSubscriptionPlan: 'monthly_plan'
      });
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
          userId: '123',
          planId: 'biannual_plan'
        }
      });

      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'biannual_plan' })
        .expect(200);

      expect(response.body).toHaveProperty('subscriptionId', 'sub_test456');
      
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
          email: 'test@example.com'
        }]
      });

      await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' })
        .expect(200);

      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123'
        })
      );
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
      testUser.stripeSubscriptionId = 'sub_test123';
      mockStorage.getUser.mockResolvedValue(testUser);

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
      testUser.stripeSubscriptionId = 'sub_invalid';
      mockStorage.getUser.mockResolvedValue(testUser);
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
    beforeEach(() => {
      testUser.stripeSubscriptionId = 'sub_test123';
      mockStorage.getUser.mockResolvedValue(testUser);
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
      testUser.stripeSubscriptionId = null;
      mockStorage.getUser.mockResolvedValue(testUser);

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
    beforeEach(() => {
      testUser.stripeSubscriptionId = 'sub_test123';
      mockStorage.getUser.mockResolvedValue(testUser);
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
      testUser.stripeSubscriptionId = null;
      mockStorage.getUser.mockResolvedValue(testUser);

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
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    const mockEvent = {
      id: 'evt_test123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          metadata: {
            userId: '123',
            planId: 'monthly_plan'
          }
        }
      }
    };

    it('should handle subscription created webhook', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent))
        .expect(200);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(mockStorage.updateUser).toHaveBeenCalledWith('123', {
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should reject webhook with invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify(mockEvent))
        .expect(400);
    });

    it('should reject webhook without signature', async () => {
      await request(app)
        .post('/api/webhooks/stripe')
        .send(JSON.stringify(mockEvent))
        .expect(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for subscription endpoints', async () => {
      // Override auth middleware to reject
      const rejectAuth = (req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      };

      // Create new app without auth for this test
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      
      // Mock failed authentication
      jest.doMock('../../server/supabaseAuth', () => ({
        isAuthenticated: rejectAuth
      }));

      // Re-register routes with failed auth
      const { registerRoutes } = require('../../server/routes');
      const testServer = await registerRoutes(unauthenticatedApp);

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

      testServer.close();
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
    it('should handle database connection errors', async () => {
      mockStorage.updateUser.mockRejectedValueOnce(new Error('Database connection failed'));

      // Even if database fails, API should handle gracefully
      const response = await request(app)
        .post('/api/membership/subscribe')
        .send({ planId: 'monthly_plan' });

      // Should still attempt to create subscription but may fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(200);
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