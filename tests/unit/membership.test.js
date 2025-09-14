/**
 * Unit Tests for Membership System Business Logic
 * Tests core membership service functions, allowance calculations, and coverage determination
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { addMonths, startOfMonth, endOfMonth } from 'date-fns';

// Create a comprehensive mock for the database
const createMockDb = () => ({
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        }),
        limit: jest.fn().mockResolvedValue([])
      }),
      orderBy: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([])
      }),
      limit: jest.fn().mockResolvedValue([])
    })
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([])
    })
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([])
      })
    })
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue({})
  })
});

const mockDb = createMockDb();

// Mock the database module before any other imports
jest.unstable_mockModule('../../server/db.js', () => ({
  db: mockDb
}));

// Now import the modules dynamically after mocking
const { MembershipService } = await import('../../server/services/membershipService.js');
const { 
  membershipPlans, 
  membershipSubscriptions, 
  membershipCycles,
  membershipAllowanceEvents,
  appointmentCoverage,
  insertMembershipPlanSchema,
  insertMembershipSubscriptionSchema,
  insertMembershipCycleSchema,
  insertMembershipAllowanceEventSchema
} = await import('../../shared/schema.js');

// Mock Stripe for unit testing
const mockStripe = {
  subscriptions: {
    retrieve: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn()
  }
};

describe('Membership Business Logic Unit Tests', () => {
  let membershipService;
  let mockCycle;
  let mockSubscription;

  beforeEach(() => {
    jest.clearAllMocks();
    membershipService = new MembershipService(mockStripe);

    // Setup common test data
    mockCycle = {
      id: 'cycle-uuid-123',
      subscriptionId: 'sub-uuid-123',
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

    mockSubscription = {
      id: 'sub-uuid-123',
      patientId: 123,
      planId: 'monthly-plan-uuid',
      stripeSubscriptionId: 'sub_stripe123',
      stripeCustomerId: 'cus_stripe123',
      status: 'active',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-02-01'),
      activatedAt: new Date('2025-01-01'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Setup default database mock chain
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockCycle])
          }),
          limit: jest.fn().mockResolvedValue([mockCycle])
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockCycle])
        }),
        limit: jest.fn().mockResolvedValue([mockCycle])
      })
    });

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockCycle])
      })
    });

    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...mockCycle, allowanceRemaining: 1 }])
        })
      })
    });
  });

  describe('Plan Configuration Logic', () => {
    it('should return correct plan configurations', () => {
      const plans = membershipService.getPlanConfigurations();

      expect(plans).toHaveProperty('monthly_plan');
      expect(plans).toHaveProperty('biannual_plan');

      // Test monthly plan configuration
      expect(plans.monthly_plan).toEqual({
        id: 'monthly_plan',
        name: 'Monthly Membership',
        priceAmount: 4500, // €45.00 in cents
        interval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2,
        description: '2 consultations per month with certified doctors'
      });

      // Test 6-month plan configuration
      expect(plans.biannual_plan).toEqual({
        id: 'biannual_plan',
        name: '6-Month Membership',
        priceAmount: 21900, // €219.00 in cents
        interval: 'month',
        intervalCount: 6,
        allowancePerCycle: 12,
        description: '12 consultations over 6 months (2 per month) with 23% savings'
      });
    });

    it('should calculate correct value per consultation', () => {
      const plans = membershipService.getPlanConfigurations();
      
      const monthlyValuePerConsultation = plans.monthly_plan.priceAmount / plans.monthly_plan.allowancePerCycle;
      const biannualValuePerConsultation = plans.biannual_plan.priceAmount / plans.biannual_plan.allowancePerCycle;
      
      expect(monthlyValuePerConsultation).toBe(2250); // €22.50 per consultation
      expect(biannualValuePerConsultation).toBe(1825); // €18.25 per consultation (savings)
      
      // Verify 6-month plan offers savings
      expect(biannualValuePerConsultation).toBeLessThan(monthlyValuePerConsultation);
    });
  });

  describe('Allowance Cycle Management', () => {
    it('should create initial allowance cycle correctly', async () => {
      const subscriptionId = 'sub_test123';
      const planId = 'monthly_plan';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-02-01');

      await membershipService.createInitialAllowanceCycle(
        subscriptionId,
        planId,
        startDate,
        endDate
      );

      // Verify cycle was inserted with correct data
      expect(mockDb.insert).toHaveBeenCalledWith(membershipCycles);
      
      const insertValues = mockDb.insert().values;
      expect(insertValues).toHaveBeenCalledWith({
        subscriptionId,
        cycleStart: startDate,
        cycleEnd: endDate,
        allowanceGranted: 2, // Monthly plan allowance
        allowanceUsed: 0,
        allowanceRemaining: 2,
        resetDate: endDate,
        isActive: true
      });

      // Verify allowance grant event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should throw error for invalid plan ID', async () => {
      await expect(
        membershipService.createInitialAllowanceCycle(
          'sub_test123',
          'invalid_plan',
          new Date(),
          new Date()
        )
      ).rejects.toThrow('Invalid plan ID: invalid_plan');
    });

    it('should get current active allowance cycle', async () => {
      const result = await membershipService.getCurrentAllowanceCycle('sub_test123');

      expect(result).toEqual(mockCycle);
      expect(mockDb.select).toHaveBeenCalled();
      
      // Verify correct query structure
      const fromCall = mockDb.select().from;
      const whereCall = fromCall().where;
      const orderByCall = whereCall().orderBy;
      const limitCall = orderByCall().limit;
      
      expect(fromCall).toHaveBeenCalledWith(membershipCycles);
      expect(limitCall).toHaveBeenCalledWith(1);
    });

    it('should return null when no active cycle exists', async () => {
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([]);

      const result = await membershipService.getCurrentAllowanceCycle('sub_test123');

      expect(result).toBeNull();
    });
  });

  describe('Allowance Consumption Logic', () => {
    it('should consume allowance successfully when available', async () => {
      const result = await membershipService.consumeAllowance(
        'sub_test123',
        456, // appointmentId
        35.00, // originalPrice
        1 // amount
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
      
      // Verify coverage record was created
      expect(mockDb.insert).toHaveBeenCalledWith(appointmentCoverage);
      
      // Verify allowance event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should reject consumption when no active cycle exists', async () => {
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([]);

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
        reason: 'No active allowance cycle found'
      });

      // Should not update anything
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should reject consumption when insufficient allowance remaining', async () => {
      const exhaustedCycle = { ...mockCycle, allowanceRemaining: 0 };
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

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle multiple allowance consumption', async () => {
      const result = await membershipService.consumeAllowance(
        'sub_test123',
        456,
        35.00,
        2 // Consume 2 allowances
      );

      expect(result.allowanceDeducted).toBe(2);
      expect(result.remainingAllowance).toBe(0); // 2 - 2 = 0

      // Verify update was called with correct values
      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        allowanceUsed: 2, // 0 + 2
        allowanceRemaining: 0, // 2 - 2
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('Allowance Restoration Logic', () => {
    beforeEach(() => {
      // Mock coverage record lookup
      const mockCoverageRecord = {
        id: 'coverage-uuid-123',
        appointmentId: 456,
        subscriptionId: 'sub-uuid-123',
        cycleId: 'cycle-uuid-123',
        coverageType: 'full_coverage'
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockCoverageRecord]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockCycle])
            })
          })
        })
      });
    });

    it('should restore allowance when appointment is cancelled', async () => {
      await membershipService.restoreAllowance(456, 'Patient cancelled appointment', 1);

      // Verify cycle was updated to restore allowance
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles);
      
      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        allowanceUsed: 0, // Math.max(0, 0-1) = 0
        allowanceRemaining: 2, // Math.min(2, 2+1) = 2 (capped at granted)
        updatedAt: expect.any(Date)
      });

      // Verify coverage record was updated
      expect(mockDb.update).toHaveBeenCalledWith(appointmentCoverage);

      // Verify restoration event was logged
      expect(mockDb.insert).toHaveBeenCalledWith(membershipAllowanceEvents);
    });

    it('should not restore allowance when no coverage exists', async () => {
      // Mock no coverage record found
      mockDb.select().from().where().limit.mockResolvedValueOnce([]);

      await membershipService.restoreAllowance(456, 'No coverage found', 1);

      // Should not update anything since no coverage exists
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should not exceed granted allowance when restoring', async () => {
      const fullCycle = { ...mockCycle, allowanceUsed: 0, allowanceRemaining: 2 };
      mockDb.select().from().where().limit.mockResolvedValueOnce([fullCycle]);

      await membershipService.restoreAllowance(456, 'Restore attempt', 1);

      const updateSet = mockDb.update().set;
      expect(updateSet).toHaveBeenCalledWith({
        allowanceUsed: 0, // Already at 0, can't go negative
        allowanceRemaining: 2, // Capped at granted amount
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('Coverage Determination Logic', () => {
    beforeEach(() => {
      // Mock user lookup
      const mockUser = {
        id: 123,
        stripeSubscriptionId: 'sub_stripe123'
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockCycle])
            })
          })
        })
      });
    });

    it('should approve coverage when allowance is available', async () => {
      const result = await membershipService.checkAppointmentCoverage(
        123, // patientId
        35.00, // appointmentPrice
        new Date('2025-01-15') // appointmentDate within cycle
      );

      expect(result).toMatchObject({
        isCovered: true,
        coverageType: 'full_coverage',
        originalPrice: 35.00,
        coveredAmount: 35.00,
        patientPaid: 0,
        allowanceDeducted: 1,
        remainingAllowance: 1 // 2 - 1
      });
    });

    it('should reject coverage when user has no subscription', async () => {
      const userWithoutSub = { id: 123, stripeSubscriptionId: null };
      mockDb.select().from().where().limit.mockResolvedValueOnce([userWithoutSub]);

      const result = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'No active subscription found'
      });
    });

    it('should reject coverage when appointment is outside cycle period', async () => {
      const outsideDate = new Date('2025-03-01'); // Outside Jan 1 - Feb 1 cycle

      const result = await membershipService.checkAppointmentCoverage(123, 35.00, outsideDate);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'Appointment date outside of current cycle period'
      });
    });

    it('should reject coverage when allowance is exhausted', async () => {
      const exhaustedCycle = { ...mockCycle, allowanceRemaining: 0 };
      mockDb.select().from().where().orderBy().limit.mockResolvedValueOnce([exhaustedCycle]);

      const result = await membershipService.checkAppointmentCoverage(123, 35.00);

      expect(result).toMatchObject({
        isCovered: false,
        coverageType: 'no_coverage',
        reason: 'Allowance exhausted for current cycle'
      });
    });
  });

  describe('Cycle Renewal Logic', () => {
    beforeEach(() => {
      // Mock subscription lookup
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockSubscription]),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockCycle])
            })
          })
        })
      });
    });

    it('should renew allowance cycle correctly', async () => {
      const newStartDate = new Date('2025-02-01');
      const newEndDate = new Date('2025-03-01');

      await membershipService.renewAllowanceCycle(
        'sub_stripe123',
        newStartDate,
        newEndDate
      );

      // Verify old cycle was deactivated
      expect(mockDb.update).toHaveBeenCalledWith(membershipCycles);
      
      // Verify new cycle was created
      expect(mockDb.insert).toHaveBeenCalledWith(membershipCycles);
      
      const insertValues = mockDb.insert().values;
      expect(insertValues).toHaveBeenCalledWith({
        subscriptionId: 'sub_stripe123',
        cycleStart: newStartDate,
        cycleEnd: newEndDate,
        allowanceGranted: 2, // Based on plan configuration
        allowanceUsed: 0,
        allowanceRemaining: 2,
        resetDate: newEndDate,
        isActive: true
      });
    });

    it('should throw error when subscription not found', async () => {
      mockDb.select().from().where().limit.mockResolvedValueOnce([]);

      await expect(
        membershipService.renewAllowanceCycle(
          'sub_nonexistent',
          new Date(),
          new Date()
        )
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('Allowance Status Retrieval', () => {
    it('should return allowance status for user with active subscription', async () => {
      const mockUser = { id: 123, stripeSubscriptionId: 'sub_stripe123' };
      mockDb.select().from().where().limit.mockResolvedValueOnce([mockUser]);

      const result = await membershipService.getAllowanceStatus(123);

      expect(result).toEqual({
        cycleId: mockCycle.id,
        allowanceGranted: mockCycle.allowanceGranted,
        allowanceUsed: mockCycle.allowanceUsed,
        allowanceRemaining: mockCycle.allowanceRemaining,
        cycleStart: mockCycle.cycleStart,
        cycleEnd: mockCycle.cycleEnd,
        resetDate: mockCycle.resetDate,
        isActive: mockCycle.isActive
      });
    });

    it('should return null for user without subscription', async () => {
      const userWithoutSub = { id: 123, stripeSubscriptionId: null };
      mockDb.select().from().where().limit.mockResolvedValueOnce([userWithoutSub]);

      const result = await membershipService.getAllowanceStatus(123);

      expect(result).toBeNull();
    });
  });

  describe('Schema Validation', () => {
    it('should validate membership plan schema', () => {
      const validPlan = {
        name: 'Test Plan',
        description: 'Test description',
        priceAmount: '45.00',
        currency: 'EUR',
        billingInterval: 'month',
        intervalCount: 1,
        allowancePerCycle: 2,
        stripePriceId: 'price_test123',
        isActive: true
      };

      const result = insertMembershipPlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it('should reject invalid membership plan schema', () => {
      const invalidPlan = {
        // Missing required fields
        description: 'Invalid plan'
      };

      const result = insertMembershipPlanSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.error?.issues).toBeDefined();
    });

    it('should validate membership subscription schema', () => {
      const validSubscription = {
        patientId: 123,
        planId: 'plan-uuid',
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: addMonths(new Date(), 1),
        activatedAt: new Date()
      };

      const result = insertMembershipSubscriptionSchema.safeParse(validSubscription);
      expect(result.success).toBe(true);
    });

    it('should validate membership cycle schema', () => {
      const validCycle = {
        subscriptionId: 'sub-uuid',
        cycleStart: new Date(),
        cycleEnd: addMonths(new Date(), 1),
        allowanceGranted: 2,
        allowanceUsed: 0,
        allowanceRemaining: 2,
        resetDate: addMonths(new Date(), 1),
        isActive: true
      };

      const result = insertMembershipCycleSchema.safeParse(validCycle);
      expect(result.success).toBe(true);
    });

    it('should validate allowance event schema', () => {
      const validEvent = {
        cycleId: 'cycle-uuid',
        eventType: 'consumed',
        appointmentId: 123,
        amountChanged: -1,
        previousBalance: 2,
        newBalance: 1,
        reason: 'Appointment booking',
        timestamp: new Date()
      };

      const result = insertMembershipAllowanceEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        membershipService.getCurrentAllowanceCycle('sub_test123')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent allowance consumption', async () => {
      // Simulate race condition where allowance is consumed by two requests
      const race1 = membershipService.consumeAllowance('sub_test123', 456, 35.00, 1);
      const race2 = membershipService.consumeAllowance('sub_test123', 789, 35.00, 1);

      const [result1, result2] = await Promise.all([race1, race2]);

      // Both should succeed in this mock scenario, but in real app, 
      // one might fail due to insufficient allowance
      expect(result1.isCovered).toBe(true);
      expect(result2.isCovered).toBe(true);
    });

    it('should validate allowance amounts are positive', async () => {
      await expect(
        membershipService.consumeAllowance('sub_test123', 456, 35.00, -1)
      ).resolves.toMatchObject({
        isCovered: false,
        reason: 'Insufficient allowance remaining'
      });
    });
  });
});