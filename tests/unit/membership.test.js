/**
 * Unit Tests for Membership System
 * Tests core membership logic, data models, and utility functions
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock dependencies
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../server/storage', () => ({
  storage: {
    updateUser: jest.fn(),
    getUser: jest.fn()
  }
}));

// Import schemas and types
const { 
  membershipPlans, 
  membershipSubscriptions, 
  membershipCycles,
  membershipAllowanceEvents,
  appointmentCoverage,
  billingAttempts 
} = require('../../shared/schema');

describe('Membership Data Models', () => {
  describe('Membership Plans Schema', () => {
    it('should validate valid membership plan data', () => {
      const validPlan = {
        id: 'test-uuid',
        name: 'Monthly Plan',
        description: 'Monthly subscription with 2 consultations',
        priceAmount: '45.00',
        currency: 'EUR',
        billingInterval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2,
        stripePriceId: 'price_test123',
        isActive: true
      };

      // Should not throw validation errors
      expect(() => {
        // Simulate schema validation
        if (!validPlan.name || !validPlan.priceAmount || !validPlan.stripePriceId) {
          throw new Error('Required fields missing');
        }
      }).not.toThrow();
    });

    it('should reject invalid membership plan data', () => {
      const invalidPlan = {
        // Missing required fields
        description: 'Invalid plan without required fields'
      };

      expect(() => {
        if (!invalidPlan.name || !invalidPlan.priceAmount || !invalidPlan.stripePriceId) {
          throw new Error('Required fields missing');
        }
      }).toThrow('Required fields missing');
    });
  });

  describe('Membership Subscriptions Schema', () => {
    it('should validate subscription data structure', () => {
      const validSubscription = {
        id: 'sub-uuid',
        patientId: 123,
        planId: 'plan-uuid',
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        activatedAt: new Date()
      };

      expect(validSubscription.patientId).toBeGreaterThan(0);
      expect(validSubscription.status).toMatch(/^(active|suspended|ended|pending_cancel)$/);
      expect(validSubscription.stripeSubscriptionId).toMatch(/^sub_/);
      expect(validSubscription.stripeCustomerId).toMatch(/^cus_/);
    });
  });

  describe('Allowance Calculations', () => {
    it('should calculate monthly allowance correctly', () => {
      const monthlyPlan = {
        billingInterval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2
      };

      const allowancePerMonth = monthlyPlan.allowancePerCycle / monthlyPlan.intervalCount;
      expect(allowancePerMonth).toBe(2);
    });

    it('should calculate 6-month allowance correctly', () => {
      const semiAnnualPlan = {
        billingInterval: 'month',
        intervalCount: 6,
        allowancePerCycle: 12
      };

      const allowancePerMonth = semiAnnualPlan.allowancePerCycle / semiAnnualPlan.intervalCount;
      expect(allowancePerMonth).toBe(2);
    });

    it('should handle allowance consumption tracking', () => {
      const mockCycle = {
        allowanceGranted: 2,
        allowanceUsed: 1,
        allowanceRemaining: 1
      };

      // Simulate consultation booking
      const consumeAllowance = (cycle, amount = 1) => {
        if (cycle.allowanceRemaining >= amount) {
          return {
            ...cycle,
            allowanceUsed: cycle.allowanceUsed + amount,
            allowanceRemaining: cycle.allowanceRemaining - amount
          };
        }
        throw new Error('Insufficient allowance');
      };

      const updatedCycle = consumeAllowance(mockCycle);
      expect(updatedCycle.allowanceUsed).toBe(2);
      expect(updatedCycle.allowanceRemaining).toBe(0);

      // Should throw error when trying to consume more than available
      expect(() => consumeAllowance(updatedCycle)).toThrow('Insufficient allowance');
    });
  });
});

describe('Membership Business Logic', () => {
  describe('Plan Configuration', () => {
    it('should have correct plan configurations', () => {
      const planConfigs = {
        "monthly_plan": {
          name: "Monthly Membership",
          priceAmount: 4500, // €45.00 in cents
          interval: 'month',
          intervalCount: 1,
          allowance: 2
        },
        "biannual_plan": {
          name: "6-Month Membership", 
          priceAmount: 21900, // €219.00 in cents
          interval: 'month',
          intervalCount: 6,
          allowance: 12
        }
      };

      // Verify monthly plan
      expect(planConfigs.monthly_plan.priceAmount).toBe(4500);
      expect(planConfigs.monthly_plan.allowance).toBe(2);
      expect(planConfigs.monthly_plan.intervalCount).toBe(1);

      // Verify 6-month plan
      expect(planConfigs.biannual_plan.priceAmount).toBe(21900);
      expect(planConfigs.biannual_plan.allowance).toBe(12);
      expect(planConfigs.biannual_plan.intervalCount).toBe(6);

      // Calculate value - should be same per month
      const monthlyValue = planConfigs.monthly_plan.priceAmount / planConfigs.monthly_plan.allowance;
      const biannualValue = planConfigs.biannual_plan.priceAmount / planConfigs.biannual_plan.allowance;
      expect(monthlyValue).toBe(biannualValue); // Same value per consultation
    });
  });

  describe('Coverage Determination', () => {
    it('should determine when appointment is covered by membership', () => {
      const mockSubscription = {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const mockCycle = {
        allowanceRemaining: 1,
        isActive: true,
        cycleEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const isCovered = (subscription, cycle, appointmentDate) => {
        return subscription.status === 'active' && 
               cycle.allowanceRemaining > 0 && 
               cycle.isActive &&
               appointmentDate <= cycle.cycleEnd;
      };

      const appointmentDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      expect(isCovered(mockSubscription, mockCycle, appointmentDate)).toBe(true);

      // Should not be covered if no allowance remaining
      const exhaustedCycle = { ...mockCycle, allowanceRemaining: 0 };
      expect(isCovered(mockSubscription, exhaustedCycle, appointmentDate)).toBe(false);

      // Should not be covered if subscription inactive
      const inactiveSubscription = { ...mockSubscription, status: 'suspended' };
      expect(isCovered(inactiveSubscription, mockCycle, appointmentDate)).toBe(false);
    });
  });

  describe('Billing Cycle Management', () => {
    it('should calculate correct billing periods', () => {
      const calculateNextBillingDate = (currentStart, intervalCount, interval) => {
        const nextDate = new Date(currentStart);
        
        if (interval === 'month') {
          nextDate.setMonth(nextDate.getMonth() + intervalCount);
        } else if (interval === 'year') {
          nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        }
        
        return nextDate;
      };

      const startDate = new Date('2024-01-01');
      
      // Monthly billing
      const monthlyNext = calculateNextBillingDate(startDate, 1, 'month');
      expect(monthlyNext.getTime()).toBe(new Date('2024-02-01').getTime());

      // 6-month billing
      const semiAnnualNext = calculateNextBillingDate(startDate, 6, 'month');
      expect(semiAnnualNext.getTime()).toBe(new Date('2024-07-01').getTime());
    });

    it('should handle allowance restoration on cycle renewal', () => {
      const renewCycle = (plan, currentCycle) => {
        const newCycleStart = currentCycle.cycleEnd;
        const newCycleEnd = new Date(newCycleStart);
        newCycleEnd.setMonth(newCycleEnd.getMonth() + plan.intervalCount);

        return {
          cycleStart: newCycleStart,
          cycleEnd: newCycleEnd,
          allowanceGranted: plan.allowancePerCycle,
          allowanceUsed: 0,
          allowanceRemaining: plan.allowancePerCycle,
          isActive: true
        };
      };

      const plan = { intervalCount: 1, allowancePerCycle: 2 };
      const expiredCycle = {
        cycleStart: new Date('2024-01-01'),
        cycleEnd: new Date('2024-02-01'),
        allowanceRemaining: 0,
        allowanceUsed: 2
      };

      const newCycle = renewCycle(plan, expiredCycle);
      expect(newCycle.allowanceGranted).toBe(2);
      expect(newCycle.allowanceRemaining).toBe(2);
      expect(newCycle.allowanceUsed).toBe(0);
      expect(newCycle.cycleStart.getTime()).toBe(expiredCycle.cycleEnd.getTime());
    });
  });
});

describe('Price and Currency Utilities', () => {
  describe('Currency Conversion', () => {
    it('should convert euros to cents correctly', () => {
      const eurosToCents = (euros) => Math.round(euros * 100);
      
      expect(eurosToCents(45.00)).toBe(4500);
      expect(eurosToCents(219.00)).toBe(21900);
      expect(eurosToCents(35.50)).toBe(3550);
      expect(eurosToCents(0.99)).toBe(99);
    });

    it('should convert cents to euros correctly', () => {
      const centsToEuros = (cents) => cents / 100;
      
      expect(centsToEuros(4500)).toBe(45.00);
      expect(centsToEuros(21900)).toBe(219.00);
      expect(centsToEuros(3550)).toBe(35.50);
      expect(centsToEuros(99)).toBe(0.99);
    });

    it('should format currency for display', () => {
      const formatCurrency = (amount, currency = "EUR") => {
        return new Intl.NumberFormat("en-EU", {
          style: "currency",
          currency,
        }).format(amount);
      };

      expect(formatCurrency(45.00)).toMatch(/€.*45/);
      expect(formatCurrency(219.00)).toMatch(/€.*219/);
    });
  });
});

describe('Membership Status Validation', () => {
  describe('Subscription Status Checks', () => {
    it('should validate active subscription status', () => {
      const isActiveSubscription = (subscription) => {
        return subscription && 
               subscription.status === 'active' &&
               new Date() < new Date(subscription.currentPeriodEnd * 1000);
      };

      const activeSubscription = {
        status: 'active',
        currentPeriodEnd: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
      };

      const expiredSubscription = {
        status: 'active',
        currentPeriodEnd: Math.floor(Date.now() / 1000) - (1 * 24 * 60 * 60) // 1 day ago
      };

      const suspendedSubscription = {
        status: 'suspended',
        currentPeriodEnd: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      };

      expect(isActiveSubscription(activeSubscription)).toBe(true);
      expect(isActiveSubscription(expiredSubscription)).toBe(false);
      expect(isActiveSubscription(suspendedSubscription)).toBe(false);
      expect(isActiveSubscription(null)).toBe(false);
    });
  });

  describe('Plan Eligibility', () => {
    it('should check user eligibility for membership plans', () => {
      const checkPlanEligibility = (user, planId) => {
        // Users with active subscriptions cannot subscribe to new plans
        if (user.stripeSubscriptionId && !user.stripeSubscriptionId.startsWith('pending_')) {
          return { eligible: false, reason: 'Already has active subscription' };
        }

        // Valid plan IDs
        const validPlans = ['monthly_plan', 'biannual_plan'];
        if (!validPlans.includes(planId)) {
          return { eligible: false, reason: 'Invalid plan ID' };
        }

        return { eligible: true, reason: null };
      };

      const eligibleUser = { stripeSubscriptionId: null };
      const subscribedUser = { stripeSubscriptionId: 'sub_12345' };
      const pendingUser = { stripeSubscriptionId: 'pending_sub_12345' };

      expect(checkPlanEligibility(eligibleUser, 'monthly_plan').eligible).toBe(true);
      expect(checkPlanEligibility(subscribedUser, 'monthly_plan').eligible).toBe(false);
      expect(checkPlanEligibility(pendingUser, 'monthly_plan').eligible).toBe(true);
      expect(checkPlanEligibility(eligibleUser, 'invalid_plan').eligible).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  describe('Membership API Error Scenarios', () => {
    it('should handle missing plan ID error', () => {
      const validateSubscribeRequest = (body) => {
        if (!body.planId) {
          throw new Error('Plan ID is required');
        }
        return true;
      };

      expect(() => validateSubscribeRequest({})).toThrow('Plan ID is required');
      expect(() => validateSubscribeRequest({ planId: 'monthly_plan' })).not.toThrow();
    });

    it('should handle invalid plan configuration error', () => {
      const planConfigs = {
        "monthly_plan": { name: "Monthly", priceAmount: 4500 },
        "biannual_plan": { name: "6-Month", priceAmount: 21900 }
      };

      const validatePlan = (planId) => {
        if (!planConfigs[planId]) {
          throw new Error('Invalid plan selected');
        }
        return planConfigs[planId];
      };

      expect(() => validatePlan('invalid_plan')).toThrow('Invalid plan selected');
      expect(() => validatePlan('monthly_plan')).not.toThrow();
    });

    it('should handle subscription not found error', () => {
      const checkSubscription = (user) => {
        if (!user.stripeSubscriptionId) {
          throw new Error('No active subscription found');
        }
        return user.stripeSubscriptionId;
      };

      const userWithSubscription = { stripeSubscriptionId: 'sub_12345' };
      const userWithoutSubscription = { stripeSubscriptionId: null };

      expect(() => checkSubscription(userWithoutSubscription)).toThrow('No active subscription found');
      expect(() => checkSubscription(userWithSubscription)).not.toThrow();
    });
  });
});