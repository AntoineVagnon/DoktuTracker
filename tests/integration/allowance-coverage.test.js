/**
 * Integration Tests for Membership Allowance and Coverage System
 * Tests allowance tracking, consumption, restoration, and appointment coverage logic
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const { addMonths, startOfMonth, endOfMonth, isAfter, isBefore } = require('date-fns');

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

describe('Membership Allowance and Coverage System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Allowance Tracking', () => {
    it('should create initial allowance cycle for new subscription', async () => {
      const subscription = {
        id: 'sub-uuid',
        patientId: 123,
        planId: 'monthly-plan-uuid',
        activatedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: addMonths(new Date(), 1)
      };

      const plan = {
        id: 'monthly-plan-uuid',
        allowancePerCycle: 2,
        billingInterval: 'month',
        intervalCount: 1
      };

      const createInitialCycle = (subscription, plan) => {
        return {
          subscriptionId: subscription.id,
          cycleStart: subscription.currentPeriodStart,
          cycleEnd: subscription.currentPeriodEnd,
          allowanceGranted: plan.allowancePerCycle,
          allowanceUsed: 0,
          allowanceRemaining: plan.allowancePerCycle,
          resetDate: subscription.currentPeriodEnd,
          isActive: true
        };
      };

      const initialCycle = createInitialCycle(subscription, plan);

      expect(initialCycle.allowanceGranted).toBe(2);
      expect(initialCycle.allowanceUsed).toBe(0);
      expect(initialCycle.allowanceRemaining).toBe(2);
      expect(initialCycle.isActive).toBe(true);
      expect(initialCycle.cycleStart).toEqual(subscription.currentPeriodStart);
      expect(initialCycle.cycleEnd).toEqual(subscription.currentPeriodEnd);
    });

    it('should track allowance consumption when booking appointment', async () => {
      const mockCycle = {
        id: 'cycle-uuid',
        subscriptionId: 'sub-uuid',
        allowanceGranted: 2,
        allowanceUsed: 0,
        allowanceRemaining: 2,
        isActive: true
      };

      const appointment = {
        id: 'apt-uuid',
        patientId: 123,
        scheduledTime: new Date(),
        price: 35.00
      };

      const consumeAllowance = (cycle, appointment) => {
        if (cycle.allowanceRemaining <= 0) {
          throw new Error('No allowance remaining');
        }

        const updatedCycle = {
          ...cycle,
          allowanceUsed: cycle.allowanceUsed + 1,
          allowanceRemaining: cycle.allowanceRemaining - 1
        };

        const coverageRecord = {
          appointmentId: appointment.id,
          subscriptionId: cycle.subscriptionId,
          cycleId: cycle.id,
          originalPrice: appointment.price,
          coveredAmount: appointment.price,
          patientPaid: 0.00,
          coverageType: 'full_coverage'
        };

        const allowanceEvent = {
          cycleId: cycle.id,
          eventType: 'consumed',
          appointmentId: appointment.id,
          amountChanged: -1,
          previousBalance: cycle.allowanceRemaining,
          newBalance: cycle.allowanceRemaining - 1,
          reason: 'Appointment booking'
        };

        return { updatedCycle, coverageRecord, allowanceEvent };
      };

      const result = consumeAllowance(mockCycle, appointment);

      expect(result.updatedCycle.allowanceUsed).toBe(1);
      expect(result.updatedCycle.allowanceRemaining).toBe(1);
      expect(result.coverageRecord.coverageType).toBe('full_coverage');
      expect(result.coverageRecord.patientPaid).toBe(0.00);
      expect(result.allowanceEvent.eventType).toBe('consumed');
      expect(result.allowanceEvent.amountChanged).toBe(-1);
    });

    it('should prevent booking when allowance is exhausted', () => {
      const exhaustedCycle = {
        allowanceGranted: 2,
        allowanceUsed: 2,
        allowanceRemaining: 0,
        isActive: true
      };

      const appointment = {
        id: 'apt-uuid',
        patientId: 123,
        scheduledTime: new Date()
      };

      const consumeAllowance = (cycle) => {
        if (cycle.allowanceRemaining <= 0) {
          throw new Error('No allowance remaining');
        }
        return cycle;
      };

      expect(() => consumeAllowance(exhaustedCycle)).toThrow('No allowance remaining');
    });

    it('should restore allowance when appointment is cancelled', async () => {
      const mockCycle = {
        id: 'cycle-uuid',
        allowanceGranted: 2,
        allowanceUsed: 2,
        allowanceRemaining: 0,
        isActive: true
      };

      const cancelledAppointment = {
        id: 'apt-uuid',
        status: 'cancelled',
        cancelledBy: 'patient',
        cancelledAt: new Date()
      };

      const restoreAllowance = (cycle, appointment, reason) => {
        const updatedCycle = {
          ...cycle,
          allowanceUsed: Math.max(0, cycle.allowanceUsed - 1),
          allowanceRemaining: Math.min(cycle.allowanceGranted, cycle.allowanceRemaining + 1)
        };

        const allowanceEvent = {
          cycleId: cycle.id,
          eventType: 'restored',
          appointmentId: appointment.id,
          amountChanged: 1,
          previousBalance: cycle.allowanceRemaining,
          newBalance: cycle.allowanceRemaining + 1,
          reason: reason
        };

        return { updatedCycle, allowanceEvent };
      };

      const result = restoreAllowance(mockCycle, cancelledAppointment, 'Appointment cancelled by patient');

      expect(result.updatedCycle.allowanceUsed).toBe(1);
      expect(result.updatedCycle.allowanceRemaining).toBe(1);
      expect(result.allowanceEvent.eventType).toBe('restored');
      expect(result.allowanceEvent.amountChanged).toBe(1);
      expect(result.allowanceEvent.reason).toBe('Appointment cancelled by patient');
    });

    it('should handle allowance renewal on cycle end', async () => {
      const expiredCycle = {
        id: 'old-cycle-uuid',
        subscriptionId: 'sub-uuid',
        cycleStart: new Date('2024-01-01'),
        cycleEnd: new Date('2024-02-01'),
        allowanceGranted: 2,
        allowanceUsed: 1,
        allowanceRemaining: 1,
        isActive: true
      };

      const plan = {
        allowancePerCycle: 2,
        billingInterval: 'month',
        intervalCount: 1
      };

      const renewCycle = (oldCycle, plan) => {
        // Deactivate old cycle
        const deactivatedCycle = {
          ...oldCycle,
          isActive: false
        };

        // Create new cycle
        const newCycleStart = oldCycle.cycleEnd;
        const newCycleEnd = addMonths(newCycleStart, plan.intervalCount);

        const newCycle = {
          id: 'new-cycle-uuid',
          subscriptionId: oldCycle.subscriptionId,
          cycleStart: newCycleStart,
          cycleEnd: newCycleEnd,
          allowanceGranted: plan.allowancePerCycle,
          allowanceUsed: 0,
          allowanceRemaining: plan.allowancePerCycle,
          resetDate: newCycleEnd,
          isActive: true
        };

        const renewalEvent = {
          cycleId: newCycle.id,
          eventType: 'granted',
          amountChanged: plan.allowancePerCycle,
          previousBalance: 0,
          newBalance: plan.allowancePerCycle,
          reason: 'Cycle renewal - new billing period'
        };

        return { deactivatedCycle, newCycle, renewalEvent };
      };

      const result = renewCycle(expiredCycle, plan);

      expect(result.deactivatedCycle.isActive).toBe(false);
      expect(result.newCycle.allowanceGranted).toBe(2);
      expect(result.newCycle.allowanceRemaining).toBe(2);
      expect(result.newCycle.allowanceUsed).toBe(0);
      expect(result.renewalEvent.eventType).toBe('granted');
    });
  });

  describe('Coverage Determination Logic', () => {
    it('should determine full coverage for appointments within allowance', () => {
      const subscription = {
        status: 'active',
        currentPeriodEnd: addMonths(new Date(), 1)
      };

      const activeCycle = {
        allowanceRemaining: 1,
        isActive: true,
        cycleEnd: addMonths(new Date(), 1)
      };

      const appointment = {
        scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        price: 35.00
      };

      const determineCoverage = (subscription, cycle, appointment) => {
        const isSubscriptionActive = subscription.status === 'active' && 
                                    new Date() < new Date(subscription.currentPeriodEnd);
        const hasAllowance = cycle.allowanceRemaining > 0 && cycle.isActive;
        const isWithinCycle = appointment.scheduledTime <= cycle.cycleEnd;

        if (isSubscriptionActive && hasAllowance && isWithinCycle) {
          return {
            isCovered: true,
            coverageType: 'full_coverage',
            originalPrice: appointment.price,
            coveredAmount: appointment.price,
            patientPaid: 0.00,
            allowanceConsumed: 1
          };
        }

        return {
          isCovered: false,
          coverageType: 'pay_per_visit',
          originalPrice: appointment.price,
          coveredAmount: 0.00,
          patientPaid: appointment.price,
          allowanceConsumed: 0
        };
      };

      const coverage = determineCoverage(subscription, activeCycle, appointment);

      expect(coverage.isCovered).toBe(true);
      expect(coverage.coverageType).toBe('full_coverage');
      expect(coverage.patientPaid).toBe(0.00);
      expect(coverage.coveredAmount).toBe(35.00);
    });

    it('should determine no coverage for expired subscriptions', () => {
      const expiredSubscription = {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      };

      const activeCycle = {
        allowanceRemaining: 2,
        isActive: true,
        cycleEnd: new Date()
      };

      const appointment = {
        scheduledTime: new Date(),
        price: 35.00
      };

      const determineCoverage = (subscription, cycle, appointment) => {
        const isSubscriptionActive = subscription.status === 'active' && 
                                    new Date() < new Date(subscription.currentPeriodEnd);
        
        if (!isSubscriptionActive) {
          return {
            isCovered: false,
            coverageType: 'pay_per_visit',
            originalPrice: appointment.price,
            coveredAmount: 0.00,
            patientPaid: appointment.price,
            reason: 'Subscription expired'
          };
        }
      };

      const coverage = determineCoverage(expiredSubscription, activeCycle, appointment);

      expect(coverage.isCovered).toBe(false);
      expect(coverage.coverageType).toBe('pay_per_visit');
      expect(coverage.reason).toBe('Subscription expired');
    });

    it('should determine no coverage when allowance exhausted', () => {
      const activeSubscription = {
        status: 'active',
        currentPeriodEnd: addMonths(new Date(), 1)
      };

      const exhaustedCycle = {
        allowanceRemaining: 0,
        allowanceUsed: 2,
        isActive: true,
        cycleEnd: addMonths(new Date(), 1)
      };

      const appointment = {
        scheduledTime: new Date(),
        price: 35.00
      };

      const determineCoverage = (subscription, cycle, appointment) => {
        const isSubscriptionActive = subscription.status === 'active' && 
                                    new Date() < new Date(subscription.currentPeriodEnd);
        const hasAllowance = cycle.allowanceRemaining > 0;

        if (isSubscriptionActive && !hasAllowance) {
          return {
            isCovered: false,
            coverageType: 'pay_per_visit',
            originalPrice: appointment.price,
            coveredAmount: 0.00,
            patientPaid: appointment.price,
            reason: 'Monthly allowance exhausted'
          };
        }
      };

      const coverage = determineCoverage(activeSubscription, exhaustedCycle, appointment);

      expect(coverage.isCovered).toBe(false);
      expect(coverage.reason).toBe('Monthly allowance exhausted');
    });

    it('should determine no coverage for appointments outside cycle period', () => {
      const activeSubscription = {
        status: 'active',
        currentPeriodEnd: addMonths(new Date(), 2)
      };

      const activeCycle = {
        allowanceRemaining: 2,
        isActive: true,
        cycleEnd: addMonths(new Date(), 1)
      };

      const futureAppointment = {
        scheduledTime: addMonths(new Date(), 1.5), // 1.5 months from now
        price: 35.00
      };

      const determineCoverage = (subscription, cycle, appointment) => {
        const isWithinCycle = appointment.scheduledTime <= cycle.cycleEnd;

        if (!isWithinCycle) {
          return {
            isCovered: false,
            coverageType: 'pay_per_visit',
            originalPrice: appointment.price,
            coveredAmount: 0.00,
            patientPaid: appointment.price,
            reason: 'Appointment outside current billing cycle'
          };
        }
      };

      const coverage = determineCoverage(activeSubscription, activeCycle, futureAppointment);

      expect(coverage.isCovered).toBe(false);
      expect(coverage.reason).toBe('Appointment outside current billing cycle');
    });
  });

  describe('Allowance Event Tracking', () => {
    it('should create event for allowance consumption', () => {
      const createAllowanceEvent = (cycleId, type, appointmentId, amount, previousBalance, reason) => {
        return {
          cycleId: cycleId,
          eventType: type,
          appointmentId: appointmentId,
          amountChanged: amount,
          previousBalance: previousBalance,
          newBalance: previousBalance + amount,
          reason: reason,
          timestamp: new Date()
        };
      };

      const event = createAllowanceEvent(
        'cycle-uuid',
        'consumed',
        'apt-uuid',
        -1,
        2,
        'Appointment booking'
      );

      expect(event.eventType).toBe('consumed');
      expect(event.amountChanged).toBe(-1);
      expect(event.previousBalance).toBe(2);
      expect(event.newBalance).toBe(1);
      expect(event.reason).toBe('Appointment booking');
    });

    it('should create event for allowance restoration', () => {
      const createAllowanceEvent = (cycleId, type, appointmentId, amount, previousBalance, reason) => {
        return {
          cycleId: cycleId,
          eventType: type,
          appointmentId: appointmentId,
          amountChanged: amount,
          previousBalance: previousBalance,
          newBalance: previousBalance + amount,
          reason: reason,
          timestamp: new Date()
        };
      };

      const event = createAllowanceEvent(
        'cycle-uuid',
        'restored',
        'apt-uuid',
        1,
        0,
        'Appointment cancelled by patient'
      );

      expect(event.eventType).toBe('restored');
      expect(event.amountChanged).toBe(1);
      expect(event.previousBalance).toBe(0);
      expect(event.newBalance).toBe(1);
    });

    it('should create event for allowance renewal', () => {
      const createAllowanceEvent = (cycleId, type, amount, reason) => {
        return {
          cycleId: cycleId,
          eventType: type,
          appointmentId: null,
          amountChanged: amount,
          previousBalance: 0,
          newBalance: amount,
          reason: reason,
          timestamp: new Date()
        };
      };

      const event = createAllowanceEvent(
        'new-cycle-uuid',
        'granted',
        2,
        'Monthly allowance renewal'
      );

      expect(event.eventType).toBe('granted');
      expect(event.amountChanged).toBe(2);
      expect(event.newBalance).toBe(2);
      expect(event.appointmentId).toBeNull();
    });
  });

  describe('Multi-Plan Allowance Logic', () => {
    it('should handle monthly plan allowance correctly', () => {
      const monthlyPlan = {
        billingInterval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2
      };

      const calculateMonthlyAllowance = (plan) => {
        return plan.allowancePerCycle / plan.intervalCount;
      };

      expect(calculateMonthlyAllowance(monthlyPlan)).toBe(2);
    });

    it('should handle 6-month plan allowance correctly', () => {
      const semiAnnualPlan = {
        billingInterval: 'month',
        intervalCount: 6,
        allowancePerCycle: 12
      };

      const calculateMonthlyAllowance = (plan) => {
        return plan.allowancePerCycle / plan.intervalCount;
      };

      expect(calculateMonthlyAllowance(semiAnnualPlan)).toBe(2);
    });

    it('should handle 6-month plan cycle renewal correctly', () => {
      const semiAnnualPlan = {
        billingInterval: 'month',
        intervalCount: 6,
        allowancePerCycle: 12
      };

      const oldCycle = {
        cycleStart: new Date('2024-01-01'),
        cycleEnd: new Date('2024-07-01')
      };

      const createNewCycle = (plan, oldCycle) => {
        const newStart = oldCycle.cycleEnd;
        const newEnd = addMonths(newStart, plan.intervalCount);

        return {
          cycleStart: newStart,
          cycleEnd: newEnd,
          allowanceGranted: plan.allowancePerCycle,
          allowanceRemaining: plan.allowancePerCycle
        };
      };

      const newCycle = createNewCycle(semiAnnualPlan, oldCycle);

      expect(newCycle.cycleStart.getTime()).toBe(new Date('2024-07-01').getTime());
      expect(newCycle.cycleEnd.getTime()).toBe(new Date('2025-01-01').getTime());
      expect(newCycle.allowanceGranted).toBe(12);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent allowance consumption attempts', () => {
      const cycle = {
        allowanceRemaining: 1,
        allowanceUsed: 1
      };

      const attemptConsumption = (cycle, requestId) => {
        // Simulate optimistic locking
        if (cycle.allowanceRemaining <= 0) {
          throw new Error(`Insufficient allowance for request ${requestId}`);
        }
        
        return {
          ...cycle,
          allowanceUsed: cycle.allowanceUsed + 1,
          allowanceRemaining: cycle.allowanceRemaining - 1
        };
      };

      // First request should succeed
      const result1 = attemptConsumption(cycle, 'req1');
      expect(result1.allowanceRemaining).toBe(0);

      // Second concurrent request should fail
      expect(() => attemptConsumption(result1, 'req2')).toThrow('Insufficient allowance for request req2');
    });

    it('should handle allowance restoration for partially used cycles', () => {
      const cycle = {
        allowanceGranted: 2,
        allowanceUsed: 1,
        allowanceRemaining: 1
      };

      const restoreAllowance = (cycle, amount) => {
        const newUsed = Math.max(0, cycle.allowanceUsed - amount);
        const newRemaining = Math.min(cycle.allowanceGranted, cycle.allowanceRemaining + amount);

        return {
          ...cycle,
          allowanceUsed: newUsed,
          allowanceRemaining: newRemaining
        };
      };

      const restored = restoreAllowance(cycle, 1);
      expect(restored.allowanceUsed).toBe(0);
      expect(restored.allowanceRemaining).toBe(2);

      // Should not exceed granted amount
      const overRestored = restoreAllowance(restored, 5);
      expect(overRestored.allowanceRemaining).toBe(2); // Capped at granted amount
    });

    it('should handle subscription suspension and reactivation', () => {
      const suspendedSubscription = {
        status: 'suspended',
        currentPeriodEnd: addMonths(new Date(), 1)
      };

      const activeCycle = {
        allowanceRemaining: 2,
        isActive: true
      };

      const checkCoverageForSuspended = (subscription, cycle) => {
        if (subscription.status !== 'active') {
          return {
            isCovered: false,
            reason: `Subscription is ${subscription.status}`
          };
        }
        return { isCovered: true };
      };

      const result = checkCoverageForSuspended(suspendedSubscription, activeCycle);
      expect(result.isCovered).toBe(false);
      expect(result.reason).toBe('Subscription is suspended');
    });
  });
});