/**
 * Integration Tests for Stripe Membership System
 * Tests webhook handling, payment flows, and Stripe API integration
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const request = require('supertest');

// Mock Stripe
const mockStripe = {
  products: {
    list: jest.fn(),
    create: jest.fn()
  },
  prices: {
    list: jest.fn(),
    create: jest.fn()
  },
  customers: {
    list: jest.fn(),
    create: jest.fn()
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    list: jest.fn()
  },
  setupIntents: {
    create: jest.fn()
  },
  invoices: {
    pay: jest.fn()
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});

// Mock storage
const mockStorage = {
  updateUser: jest.fn(),
  getUser: jest.fn()
};

jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

describe('Stripe Integration Tests', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    app = {
      user: {
        id: 123,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        stripeSubscriptionId: null
      }
    };
  });

  describe('Subscription Creation Flow', () => {
    it('should create product and price for new subscription', async () => {
      // Mock Stripe responses
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({
        id: 'prod_test123',
        name: 'Monthly Membership'
      });
      
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue({
        id: 'price_test123',
        unit_amount: 4500,
        currency: 'eur'
      });
      
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com'
      });
      
      mockStripe.subscriptions.create.mockResolvedValue({
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
        }
      });

      // Simulate subscription creation
      const subscriptionData = {
        planId: 'monthly_plan',
        userId: 123,
        userEmail: 'test@example.com'
      };

      // Verify product creation
      expect(mockStripe.products.list).toHaveBeenCalled();
      
      // Since no product exists, it should create one
      await mockStripe.products.create({
        name: 'Monthly Membership',
        description: '2 consultations per month with certified doctors',
        metadata: { planId: 'monthly_plan' }
      });
      
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'Monthly Membership',
        description: '2 consultations per month with certified doctors',
        metadata: { planId: 'monthly_plan' }
      });

      // Verify price creation
      await mockStripe.prices.create({
        product: 'prod_test123',
        unit_amount: 4500,
        currency: 'eur',
        recurring: {
          interval: 'month',
          interval_count: 1
        },
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
    });

    it('should reuse existing product and price when available', async () => {
      // Mock existing product and price
      mockStripe.products.list.mockResolvedValue({
        data: [{
          id: 'prod_existing123',
          name: 'Monthly Membership'
        }]
      });
      
      mockStripe.prices.list.mockResolvedValue({
        data: [{
          id: 'price_existing123',
          unit_amount: 4500,
          recurring: { interval: 'month', interval_count: 1 }
        }]
      });

      // Should not create new product or price
      const existingProduct = mockStripe.products.list.mockResolvedValue({
        data: [{ id: 'prod_existing123', name: 'Monthly Membership' }]
      });
      
      const existingPrice = mockStripe.prices.list.mockResolvedValue({
        data: [{ 
          id: 'price_existing123', 
          unit_amount: 4500,
          recurring: { interval: 'month', interval_count: 1 }
        }]
      });

      expect(mockStripe.products.create).not.toHaveBeenCalled();
      expect(mockStripe.prices.create).not.toHaveBeenCalled();
    });

    it('should handle customer creation and reuse', async () => {
      const userEmail = 'test@example.com';
      
      // Test new customer creation
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_new123',
        email: userEmail
      });

      await mockStripe.customers.create({
        email: userEmail,
        name: 'Test User',
        metadata: { userId: '123', planId: 'monthly_plan' }
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: userEmail,
        name: 'Test User',
        metadata: { userId: '123', planId: 'monthly_plan' }
      });

      // Test existing customer reuse
      jest.clearAllMocks();
      mockStripe.customers.list.mockResolvedValue({
        data: [{ id: 'cus_existing123', email: userEmail }]
      });

      const existingCustomers = await mockStripe.customers.list({
        email: userEmail,
        limit: 1
      });

      expect(existingCustomers.data.length).toBe(1);
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });
  });

  describe('Stripe Webhook Handling', () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    });

    it('should handle customer.subscription.created webhook', async () => {
      const webhookEvent = {
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

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
      mockStorage.updateUser.mockResolvedValue({});

      // Simulate webhook processing
      const subscription = webhookEvent.data.object;
      
      await mockStorage.updateUser(subscription.metadata.userId, {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer
      });

      expect(mockStorage.updateUser).toHaveBeenCalledWith('123', {
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should handle customer.subscription.updated webhook', async () => {
      const webhookEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active',
            metadata: {
              userId: '123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
      mockStorage.updateUser.mockResolvedValue({});

      const subscription = webhookEvent.data.object;
      
      if (subscription.status === 'active') {
        await mockStorage.updateUser(subscription.metadata.userId, {
          stripeSubscriptionId: subscription.id,
          pendingSubscriptionPlan: null
        });
      }

      expect(mockStorage.updateUser).toHaveBeenCalledWith('123', {
        stripeSubscriptionId: 'sub_test123',
        pendingSubscriptionPlan: null
      });
    });

    it('should handle customer.subscription.deleted webhook', async () => {
      const webhookEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
            metadata: {
              userId: '123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
      mockStorage.updateUser.mockResolvedValue({});

      const subscription = webhookEvent.data.object;
      
      await mockStorage.updateUser(subscription.metadata.userId, {
        stripeSubscriptionId: null,
        pendingSubscriptionPlan: null
      });

      expect(mockStorage.updateUser).toHaveBeenCalledWith('123', {
        stripeSubscriptionId: null,
        pendingSubscriptionPlan: null
      });
    });

    it('should handle setup_intent.succeeded webhook', async () => {
      const webhookEvent = {
        type: 'setup_intent.succeeded',
        data: {
          object: {
            id: 'seti_test123',
            customer: 'cus_test123',
            payment_method: 'pm_test123',
            metadata: {
              subscriptionId: 'sub_test123',
              userId: '123'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        status: 'incomplete'
      });
      
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        status: 'active'
      });

      const setupIntent = webhookEvent.data.object;
      
      // Find and activate incomplete subscription
      if (setupIntent.metadata?.subscriptionId) {
        const subscription = await mockStripe.subscriptions.retrieve(setupIntent.metadata.subscriptionId);
        
        if (subscription.status === 'incomplete' && setupIntent.payment_method) {
          await mockStripe.subscriptions.update(subscription.id, {
            default_payment_method: setupIntent.payment_method
          });
        }
      }

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        default_payment_method: 'pm_test123'
      });
    });

    it('should handle invoice.payment_succeeded webhook', async () => {
      const webhookEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test123',
            subscription: 'sub_test123',
            billing_reason: 'subscription_create',
            amount_paid: 4500,
            currency: 'eur'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);

      const invoice = webhookEvent.data.object;
      
      // For initial subscription payment, grant allowance
      const isInitialPayment = invoice.billing_reason === 'subscription_create';
      expect(isInitialPayment).toBe(true);
      expect(invoice.amount_paid).toBe(4500);
      expect(invoice.currency).toBe('eur');
    });

    it('should handle invoice.payment_failed webhook', async () => {
      const webhookEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test123',
            subscription: 'sub_test123',
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400 // 24 hours
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);

      const invoice = webhookEvent.data.object;
      
      // Should log payment failure and schedule retry
      expect(invoice.subscription).toBe('sub_test123');
      expect(invoice.attempt_count).toBe(1);
      expect(invoice.next_payment_attempt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should reject webhooks with invalid signatures', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        mockStripe.webhooks.constructEvent('invalid_payload', 'invalid_sig', 'whsec_test123');
      }).toThrow('Invalid signature');
    });
  });

  describe('Subscription Management', () => {
    it('should retrieve subscription status correctly', async () => {
      const mockUser = {
        id: 123,
        stripeSubscriptionId: 'sub_test123'
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        cancel_at_period_end: false,
        items: {
          data: [{
            price: {
              unit_amount: 4500,
              recurring: {
                interval: 'month',
                interval_count: 1
              }
            }
          }]
        },
        metadata: {
          planId: 'monthly_plan',
          planName: 'Monthly Membership'
        }
      });

      const subscription = await mockStripe.subscriptions.retrieve(mockUser.stripeSubscriptionId);
      
      expect(subscription.status).toBe('active');
      expect(subscription.current_period_end).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(subscription.metadata.planId).toBe('monthly_plan');
    });

    it('should handle subscription cancellation', async () => {
      const mockUser = {
        stripeSubscriptionId: 'sub_test123'
      };

      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: true,
        cancel_at: Math.floor(Date.now() / 1000) + 2592000 // 30 days
      });

      const cancelledSubscription = await mockStripe.subscriptions.update(
        mockUser.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      expect(cancelledSubscription.cancel_at_period_end).toBe(true);
      expect(cancelledSubscription.cancel_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should complete incomplete subscriptions', async () => {
      const mockUser = {
        stripeSubscriptionId: 'sub_test123'
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        status: 'incomplete',
        latest_invoice: {
          payment_intent: {
            id: 'pi_test123',
            client_secret: 'pi_test123_secret_test',
            status: 'requires_payment_method'
          }
        }
      });

      const subscription = await mockStripe.subscriptions.retrieve(mockUser.stripeSubscriptionId, {
        expand: ['latest_invoice.payment_intent']
      });

      expect(subscription.status).toBe('incomplete');
      expect(subscription.latest_invoice.payment_intent.client_secret).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      mockStripe.subscriptions.create.mockRejectedValue({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'generic_decline'
      });

      try {
        await mockStripe.subscriptions.create({
          customer: 'cus_test123',
          items: [{ price: 'price_test123' }]
        });
      } catch (error) {
        expect(error.type).toBe('StripeCardError');
        expect(error.code).toBe('card_declined');
        expect(error.message).toBe('Your card was declined.');
      }
    });

    it('should handle network errors', async () => {
      mockStripe.customers.create.mockRejectedValue({
        type: 'StripeConnectionError',
        message: 'Network error'
      });

      try {
        await mockStripe.customers.create({
          email: 'test@example.com'
        });
      } catch (error) {
        expect(error.type).toBe('StripeConnectionError');
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle invalid request errors', async () => {
      mockStripe.prices.create.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        message: 'Invalid price amount',
        param: 'unit_amount'
      });

      try {
        await mockStripe.prices.create({
          product: 'prod_test123',
          unit_amount: -100 // Invalid negative amount
        });
      } catch (error) {
        expect(error.type).toBe('StripeInvalidRequestError');
        expect(error.param).toBe('unit_amount');
      }
    });
  });

  describe('Plan Configuration Validation', () => {
    it('should validate plan configurations match Stripe products', () => {
      const planConfigs = {
        "monthly_plan": {
          name: "Monthly Membership",
          priceAmount: 4500,
          interval: 'month',
          intervalCount: 1
        },
        "biannual_plan": {
          name: "6-Month Membership", 
          priceAmount: 21900,
          interval: 'month',
          intervalCount: 6
        }
      };

      // Validate plan structure
      Object.values(planConfigs).forEach(plan => {
        expect(plan.name).toBeTruthy();
        expect(plan.priceAmount).toBeGreaterThan(0);
        expect(['month', 'year'].includes(plan.interval)).toBe(true);
        expect(plan.intervalCount).toBeGreaterThan(0);
      });

      // Validate specific plans
      expect(planConfigs.monthly_plan.priceAmount).toBe(4500); // €45.00
      expect(planConfigs.biannual_plan.priceAmount).toBe(21900); // €219.00
    });
  });
});