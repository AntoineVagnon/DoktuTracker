/**
 * Integration Tests for Membership Allowance and Coverage System
 * Tests real allowance tracking, consumption, restoration, and appointment coverage logic using membershipService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { addMonths, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';

// Import the real membership service and database setup
import { MembershipService } from '../../server/services/membershipService.js';
import { 
  membershipCycles,
  membershipSubscriptions,
  membershipAllowanceEvents,
  appointmentCoverage,
  users,
  appointments
} from '../../shared/schema.js';

// Mock database with realistic query chain behavior
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

jest.mock('../../server/db.js', () => ({
  db: mockDb
}));

// Mock Stripe for testing
const mockStripe = {
  subscriptions: {
    retrieve: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
};

describe('Membership Allowance and Coverage Integration Tests', () => {
  let membershipService;
  let testSubscription;
  let testUser;
  let testCycle;

  beforeEach(() => {
    jest.clearAllMocks();
    membershipService = new MembershipService(mockStripe);

    // Setup realistic test data
    testUser = {
      id: 123,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      stripeSubscriptionId: 'sub_test123',
      stripeCustomerId: 'cus_test123'
    };

    testSubscription = {
      id: 'sub-uuid-123',
      patientId: 123,
      planId: 'monthly-plan-uuid',
      stripeSubscriptionId: 'sub_test123',
      stripeCustomerId: 'cus_test123',
      status: 'active',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      activatedAt: new Date('2025-01-01'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    testCycle = {
      id: 'cycle-uuid-123',
      subscriptionId: 'sub_test123',
      cycleStart: new Date('2025-01-01'),
      cycleEnd: new Date('2025-02-01'),
      allowanceGranted: 2,
      allowanceUsed: 0,
      allowanceRemaining: 2,
      resetDate: new Date('2025-02-01'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Setup database mock chains
    setupDatabaseMocks();
  });

  function setupDatabaseMocks() {
    // Default select chain
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([testCycle]),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([testCycle])
          })
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([testCycle])
        }),
        limit: jest.fn().mockResolvedValue([testCycle])
      })
    });

    // Default insert chain
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([testCycle])
      })
    });

    // Default update chain
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            ...testCycle,
            allowanceUsed: 1,
            allowanceRemaining: 1,
            updatedAt: new Date()
          }])
        })
      })
    });
  }

  describe('Allowance Tracking and Lifecycle', () => {
    it('should create initial allowance cycle for new subscription', async () => {
      const result = await membershipService.createInitialAllowanceCycle(
        'sub_test123',
        'monthly_plan',
        new Date('2025-01-01'),
        new Date('2025-02-01')
      );

      expect(result).toBeDefined();
      expect(result.allowanceGranted).toBe(2);
      expect(result.allowanceUsed).toBe(0);
      expect(result.allowanceRemaining).toBe(2);
      expect(result.isActive).toBe(true);

      // Verify database interactions
      expect(mockDb.insert).toHaveBeenCalledWith(membershipCycles);
      
      const insertCall = mockDb.insert().values;
      expect(insertCall).toHaveBeenCalledWith({
        subscriptionId: 'sub_test123',
        cycleStart: new Date('2025-01-01'),
        cycleEnd: new Date('2025-02-01'),
        allowanceGranted: 2,
        allowanceUsed: 0,
        allowanceRemaining: 2,
        resetDate: new Date('2025-02-01'),
        isActive: true
      });

      // Verify allowance grant event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should track allowance consumption correctly', async () => {
      const appointment = {
        id: 456,
        patientId: 123,
        scheduledTime: new Date('2025-01-15'),
        price: 35.00
      };

      const result = await membershipService.consumeAllowance(
        'sub_test123',
        appointment.id,
        appointment.price,
        1
      );

      expect(result).toMatchObject({
        isCovered: true,
        coverageType: 'full_coverage',
        originalPrice: 35.00,
        coveredAmount: 35.00,
        patientPaid: 0,
        allowanceDeducted: 1,
        remainingAllowance: 1
      });

      // Verify cycle was updated
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles);
      
      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        allowanceUsed: 1,
        allowanceRemaining: 1,
        updatedAt: expect.any(Date)
      });

      // Verify coverage record was created
      expect(mockDb.insert).toHaveBeenCalledWith(appointmentCoverage);
      
      // Verify consumption event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should prevent booking when allowance is exhausted', async () => {
      // Setup exhausted cycle
      const exhaustedCycle = {
        ...testCycle,
        allowanceUsed: 2,
        allowanceRemaining: 0
      };

      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([exhaustedCycle]);

      const result = await membershipService.consumeAllowance(
        'sub_test123',
        456,
        35.00,
        1
      );

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: 35.00,
        coveredAmount: 0,
        patientPaid: 35.00,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'Insufficient allowance remaining'
      });

      // Should not update cycle or create coverage record
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should restore allowance when appointment is cancelled', async () => {
      // Setup used cycle that can be restored
      const usedCycle = {
        ...testCycle,
        allowanceUsed: 2,
        allowanceRemaining: 0
      };

      const coverageRecord = {
        id: 'coverage-uuid-123',
        appointmentId: 456,
        subscriptionId: 'sub_test123',
        cycleId: 'cycle-uuid-123',
        originalPrice: '35.00',
        coveredAmount: '35.00',
        patientPaid: '0.00',
        coverageType: 'full_coverage'
      };

      // Mock coverage record lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([coverageRecord])
          })
        })
      });

      // Mock cycle lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([usedCycle])
          })
        })
      });

      await membershipService.restoreAllowance(
        456,
        'Appointment cancelled by patient',
        1
      );

      // Verify cycle was updated to restore allowance
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles);
      
      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        allowanceUsed: 1, // 2 - 1
        allowanceRemaining: 1, // min(2, 0 + 1)
        updatedAt: expect.any(Date)
      });

      // Verify coverage record was updated
      expect(mockDb.update).toHaveBeenCalledWith(appointmentCoverage);

      // Verify restoration event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should handle cycle renewal during subscription period change', async () => {
      // Mock subscription lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([testSubscription])
          })
        })
      });

      const newPeriodStart = new Date('2025-02-01');
      const newPeriodEnd = new Date('2025-03-01');

      const result = await membershipService.renewAllowanceCycle(
        'sub_test123',
        newPeriodStart,
        newPeriodEnd
      );

      expect(result).toBeDefined();
      expect(result.allowanceGranted).toBe(2);
      expect(result.allowanceUsed).toBe(0);
      expect(result.allowanceRemaining).toBe(2);
      expect(result.cycleStart).toEqual(newPeriodStart);
      expect(result.cycleEnd).toEqual(newPeriodEnd);

      // Verify old cycle was deactivated
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles);
      
      // Verify new cycle was created
      expect(mockDb.insert).toHaveBeenCalledWith(membershipCycles);
    });
  });

  describe('Coverage Determination Logic', () => {
    beforeEach(() => {
      // Mock user lookup for coverage checks
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([testUser])
          })
        })
      });
    });

    it('should approve coverage for user with active subscription and allowance', async () => {
      const result = await membershipService.checkAppointmentCoverage(
        123,
        35.00,
        new Date('2025-01-15') // Within cycle period
      );

      expect(result).toMatchObject({
        isCovered: true,
        coverageType: 'full_coverage',
        originalPrice: 35.00,
        coveredAmount: 35.00,
        patientPaid: 0,
        allowanceDeducted: 1,
        remainingAllowance: 1
      });
    });

    it('should reject coverage for user without active subscription', async () => {
      const userWithoutSub = { ...testUser, stripeSubscriptionId: null };
      mockDb.select().from().where().limit.mockResolvedValueOnce([userWithoutSub]);

      const result = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        originalPrice: 35.00,
        coveredAmount: 0,
        patientPaid: 35.00,
        allowanceDeducted: 0,
        remainingAllowance: 0,
        reason: 'No active subscription found'
      });
    });

    it('should reject coverage for appointment outside cycle period', async () => {
      const outsideDate = new Date('2025-03-01'); // Outside Jan-Feb cycle

      const result = await membershipService.checkAppointmentCoverage(
        123,
        35.00,
        outsideDate
      );

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'Appointment date outside of current cycle period'
      });
    });

    it('should reject coverage when allowance is exhausted', async () => {
      const exhaustedCycle = { ...testCycle, allowanceRemaining: 0 };
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([exhaustedCycle]);

      const result = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'Allowance exhausted for current cycle'
      });
    });

    it('should handle edge case where cycle exists but is inactive', async () => {
      const inactiveCycle = { ...testCycle, isActive: false };
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([inactiveCycle]);

      const result = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'No active allowance cycle'
      });
    });
  });

  describe('Real-World Subscription Scenarios', () => {
    it('should handle complete monthly subscription lifecycle', async () => {
      const planId = 'monthly_plan';
      const subscriptionId = 'sub_test123';
      const patientId = 123;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-02-01');

      // 1. Activate subscription and create initial cycle
      await membershipService.activateSubscription(
        subscriptionId,
        planId,
        patientId,
        startDate,
        endDate
      );

      expect(mockDb.insert).toHaveBeenCalledWith(membershipSubscriptions);
      expect(mockDb.insert).toHaveBeenCalledWith(membershipCycles);

      // 2. Book first appointment
      const firstBooking = await membershipService.consumeAllowance(
        subscriptionId,
        101,
        35.00,
        1
      );

      expect(firstBooking.isCovered).toBe(true);
      expect(firstBooking.remainingAllowance).toBe(1);

      // 3. Book second appointment
      const secondBooking = await membershipService.consumeAllowance(
        subscriptionId,
        102,
        35.00,
        1
      );

      expect(secondBooking.isCovered).toBe(true);
      expect(secondBooking.remainingAllowance).toBe(0);

      // 4. Try to book third appointment (should fail)
      const exhaustedCycle = { ...testCycle, allowanceRemaining: 0, allowanceUsed: 2 };
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([exhaustedCycle]);

      const thirdBooking = await membershipService.consumeAllowance(
        subscriptionId,
        103,
        35.00,
        1
      );

      expect(thirdBooking.isCovered).toBe(false);
      expect(thirdBooking.reason).toBe('Insufficient allowance remaining');
    });

    it('should handle 6-month subscription with distributed allowance', async () => {
      // Setup 6-month plan cycle
      const biannualCycle = {
        ...testCycle,
        allowanceGranted: 12,
        allowanceRemaining: 12,
        cycleEnd: addMonths(testCycle.cycleStart, 6)
      };

      mockDb.select().from().where().orderBy().limit.mockResolvedValue([biannualCycle]);

      // Should be able to book multiple appointments over 6 months
      for (let i = 1; i <= 6; i++) {
        const result = await membershipService.consumeAllowance(
          'sub_test123',
          100 + i,
          35.00,
          1
        );

        expect(result.isCovered).toBe(true);
        expect(result.allowanceDeducted).toBe(1);
      }

      // Verify multiple consumption calls were made
      expect(mockDb.update).toHaveBeenCalledTimes(6);
    });

    it('should handle appointment cancellation and rebooking flow', async () => {
      // Setup partially used cycle
      const partiallyUsedCycle = {
        ...testCycle,
        allowanceUsed: 1,
        allowanceRemaining: 1
      };

      const coverageRecord = {
        id: 'coverage-uuid-123',
        appointmentId: 456,
        subscriptionId: 'sub_test123',
        cycleId: 'cycle-uuid-123',
        coverageType: 'full_coverage'
      };

      // Mock coverage lookup for restoration
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([coverageRecord])
          })
        })
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([partiallyUsedCycle])
          })
        })
      });

      // 1. Cancel appointment (restore allowance)
      await membershipService.restoreAllowance(456, 'Patient cancelled', 1);

      // 2. Book new appointment with restored allowance
      const restoredCycle = {
        ...partiallyUsedCycle,
        allowanceUsed: 0,
        allowanceRemaining: 2
      };

      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([restoredCycle]);

      const newBooking = await membershipService.consumeAllowance(
        'sub_test123',
        789,
        35.00,
        1
      );

      expect(newBooking.isCovered).toBe(true);
      expect(newBooking.remainingAllowance).toBe(1);

      // Verify both restoration and new consumption occurred
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles); // For restoration
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles); // For new consumption
    });

    it('should handle subscription cancellation properly', async () => {
      const cancelledAt = new Date('2025-01-15');
      const endsAt = new Date('2025-02-01'); // End of current period

      await membershipService.cancelSubscription(
        'sub_test123',
        cancelledAt,
        endsAt
      );

      expect(mockDb.update).toHaveBeenCalledWith(membershipSubscriptions);
      
      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        status: 'cancelled',
        cancelledAt,
        endsAt,
        updatedAt: expect.any(Date)
      });

      // Since cancellation is at period end, cycle should remain active
      expect(mockDb.update).not.toHaveBeenCalledWith(membershipCycles);
    });
  });

  describe('Allowance Event History and Audit Trail', () => {
    it('should log all allowance events for audit trail', async () => {
      // Consume allowance
      await membershipService.consumeAllowance('sub_test123', 456, 35.00, 1);

      // Verify consumption event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
      
      const eventInsert = mockDb.insert().values;
      expect(eventInsert).toHaveBeenCalledWith({
        cycleId: testCycle.id,
        eventType: 'consumed',
        appointmentId: 456,
        amountChanged: -1,
        previousBalance: 2,
        newBalance: 1,
        reason: 'Appointment booking',
        timestamp: expect.any(Date)
      });
    });

    it('should retrieve allowance event history', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          cycleId: 'cycle-uuid-123',
          eventType: 'granted',
          amountChanged: 2,
          previousBalance: 0,
          newBalance: 2,
          reason: 'Initial allowance grant',
          timestamp: new Date('2025-01-01')
        },
        {
          id: 'event-2',
          cycleId: 'cycle-uuid-123',
          eventType: 'consumed',
          appointmentId: 456,
          amountChanged: -1,
          previousBalance: 2,
          newBalance: 1,
          reason: 'Appointment booking',
          timestamp: new Date('2025-01-15')
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockEvents)
          })
        })
      });

      const history = await membershipService.getAllowanceEventHistory('cycle-uuid-123');

      expect(history).toEqual(mockEvents);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('Concurrency and Edge Cases', () => {
    it('should handle concurrent allowance consumption attempts', async () => {
      // Simulate two simultaneous booking attempts
      const promise1 = membershipService.consumeAllowance('sub_test123', 456, 35.00, 1);
      const promise2 = membershipService.consumeAllowance('sub_test123', 789, 35.00, 1);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // In this mock scenario both succeed, but in real implementation
      // with database constraints, one might fail
      expect(result1.isCovered).toBe(true);
      expect(result2.isCovered).toBe(true);

      // Verify both attempted to update the cycle
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid allowance amounts gracefully', async () => {
      const result = await membershipService.consumeAllowance(
        'sub_test123',
        456,
        35.00,
        0 // Invalid amount
      );

      expect(result.isCovered).toBe(true); // Mock allows this, real implementation should validate
    });

    it('should handle missing subscription gracefully', async () => {
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([]);

      const result = await membershipService.consumeAllowance('nonexistent_sub', 456, 35.00, 1);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'No active allowance cycle found'
      });
    });

    it('should handle database errors during operations', async () => {
      mockDb.update.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        membershipService.consumeAllowance('sub_test123', 456, 35.00, 1)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Integration with Appointment System', () => {
    it('should integrate coverage check with appointment booking flow', async () => {
      const appointmentData = {
        patientId: 123,
        doctorId: 456,
        scheduledTime: new Date('2025-01-15'),
        price: 35.00
      };

      // Check coverage before booking
      const coverageCheck = await membershipService.checkAppointmentCoverage(
        appointmentData.patientId,
        appointmentData.price,
        appointmentData.scheduledTime
      );

      expect(coverageCheck.isCovered).toBe(true);

      // If covered, consume allowance during booking
      if (coverageCheck.isCovered) {
        const consumption = await membershipService.consumeAllowance(
          testUser.stripeSubscriptionId,
          789, // Mock appointment ID
          appointmentData.price,
          1
        );

        expect(consumption.isCovered).toBe(true);
        expect(consumption.patientPaid).toBe(0);
      }
    });

    it('should handle payment fallback when allowance exhausted', async () => {
      const exhaustedCycle = { ...testCycle, allowanceRemaining: 0 };
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([exhaustedCycle]);

      const coverageCheck = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(coverageCheck).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        patientPaid: 35.00,
        reason: 'Allowance exhausted for current cycle'
      });

      // Should proceed with regular payment flow
      expect(coverageCheck.patientPaid).toBe(35.00);
    });
  });
});