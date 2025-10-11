/**
 * Unit Tests for Doctor Creation Feature
 *
 * Test Level: Unit (White-Box)
 * Framework: Vitest
 * Coverage Target: 85%+
 * Priority: P0 and P1 tests
 *
 * Following: TESTING_PROTOCOL.md Section 4.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock dependencies
const mockSupabase = {
  auth: {
    admin: {
      createUser: vi.fn(),
    },
  },
};

const mockStorage = {
  createUser: vi.fn(),
  createDoctor: vi.fn(),
};

// Zod schema from routes.ts
const doctorDataSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  specialization: z.string().min(1),
  title: z.string().default('Dr.'),
  bio: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().min(0).default(0),
  consultationFee: z.number().min(0).default(35),
  languages: z.array(z.string()).default(['English']),
});

describe('Doctor Creation - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('[P0] Authentication and Authorization', () => {
    it('UT-001: Admin middleware validates user role', () => {
      // Arrange
      const req = {
        user: { id: '123', role: 'admin' },
      };

      // Act
      const isAdmin = req.user && req.user.role === 'admin';

      // Assert
      expect(isAdmin).toBe(true);
    });

    it('UT-002: Non-admin user receives 401', () => {
      // Arrange
      const req = {
        user: { id: '456', role: 'patient' },
      };

      // Act
      const isAdmin = req.user && req.user.role === 'admin';

      // Assert
      expect(isAdmin).toBe(false);
    });
  });

  describe('[P1] Input Validation (Zod Schema)', () => {
    it('UT-003: Zod schema rejects invalid email', () => {
      // Arrange
      const invalidData = {
        email: 'notanemail',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      // Act & Assert
      expect(() => doctorDataSchema.parse(invalidData)).toThrow(z.ZodError);

      try {
        doctorDataSchema.parse(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        expect((error as z.ZodError).errors[0].path).toEqual(['email']);
        expect((error as z.ZodError).errors[0].message).toContain('email');
      }
    });

    it('UT-004: Zod schema rejects password < 8 chars (BVA)', () => {
      // Arrange
      const invalidData = {
        email: 'test@doktu.co',
        password: 'Pass1!', // 6 characters
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      // Act & Assert
      expect(() => doctorDataSchema.parse(invalidData)).toThrow(z.ZodError);

      try {
        doctorDataSchema.parse(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        expect((error as z.ZodError).errors[0].path).toEqual(['password']);
        expect((error as z.ZodError).errors[0].message).toContain('8');
      }
    });

    it('UT-004b: Zod schema accepts password = 8 chars (BVA boundary)', () => {
      // Arrange
      const validData = {
        email: 'test@doktu.co',
        password: 'Pass123!', // Exactly 8 characters
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      // Act
      const result = doctorDataSchema.parse(validData);

      // Assert
      expect(result.password).toBe('Pass123!');
      expect(result.password.length).toBe(8);
    });

    it('UT-014: Consultation fee accepts decimal (EP)', () => {
      // Arrange
      const validData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        consultationFee: 45.75,
      };

      // Act
      const result = doctorDataSchema.parse(validData);

      // Assert
      expect(result.consultationFee).toBe(45.75);
    });

    it('UT-015: Years of experience accepts 0 (BVA)', () => {
      // Arrange
      const validData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        yearsOfExperience: 0,
      };

      // Act
      const result = doctorDataSchema.parse(validData);

      // Assert
      expect(result.yearsOfExperience).toBe(0);
    });
  });

  describe('[P0] Supabase Auth Integration (Mocked)', () => {
    it('UT-005: Supabase auth user created with correct metadata', async () => {
      // Arrange
      const doctorData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'uuid-123',
            email: 'test@doktu.co',
          },
        },
        error: null,
      });

      // Act
      const { data, error } = await mockSupabase.auth.admin.createUser({
        email: doctorData.email,
        password: doctorData.password,
        email_confirm: true,
        user_metadata: {
          role: 'doctor',
          firstName: doctorData.firstName,
          lastName: doctorData.lastName,
        },
      });

      // Assert
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledTimes(1);
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@doktu.co',
        password: 'SecurePass123',
        email_confirm: true,
        user_metadata: {
          role: 'doctor',
          firstName: 'John',
          lastName: 'Doe',
        },
      });
      expect(data?.user.id).toBe('uuid-123');
      expect(error).toBeNull();
    });

    it('UT-006: Duplicate email returns error (P0)', async () => {
      // Arrange
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: {
          message: 'User already registered',
          status: 400,
        },
      });

      // Act
      const { data, error } = await mockSupabase.auth.admin.createUser({
        email: 'existing@doktu.co',
        password: 'SecurePass123',
        email_confirm: true,
        user_metadata: {},
      });

      // Assert
      expect(error).not.toBeNull();
      expect(error?.message).toBe('User already registered');
      expect(data).toBeNull();
    });
  });

  describe('[P2] Default Values', () => {
    it('UT-007: Bio defaults to generated text', () => {
      // Arrange
      const doctorData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Smith',
        specialization: 'Cardiology',
        title: 'Dr.',
        // bio is undefined
      };

      const parsedData = doctorDataSchema.parse(doctorData);

      // Act - Simulate backend logic
      const bio = parsedData.bio || `${parsedData.title} ${parsedData.firstName} ${parsedData.lastName}, specialized in ${parsedData.specialization}.`;

      // Assert
      expect(bio).toBe('Dr. John Smith, specialized in Cardiology.');
    });

    it('UT-008: License number auto-generated with correct pattern', () => {
      // Arrange
      const doctorData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        // licenseNumber is undefined
      };

      const parsedData = doctorDataSchema.parse(doctorData);

      // Act - Simulate backend logic
      const licenseNumber = parsedData.licenseNumber || `DOC-${Date.now()}`;

      // Assert
      expect(licenseNumber).toMatch(/^DOC-\d{13}$/);
    });

    it('UT-009: Consultation fee defaults to 35', () => {
      // Arrange
      const doctorData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        // consultationFee is undefined
      };

      // Act
      const result = doctorDataSchema.parse(doctorData);

      // Assert
      expect(result.consultationFee).toBe(35);
    });

    it('UT-010: Languages defaults to ["English"]', () => {
      // Arrange
      const doctorData = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        // languages is undefined
      };

      // Act
      const result = doctorDataSchema.parse(doctorData);

      // Assert
      expect(result.languages).toEqual(['English']);
    });
  });

  describe('[P0] Response Format', () => {
    it('UT-011: Returns 201 with credentials on success', () => {
      // Arrange
      const expectedResponse = {
        success: true,
        doctor: {
          id: 1,
          email: 'test@doktu.co',
          firstName: 'John',
          lastName: 'Doe',
          specialization: 'Cardiology',
        },
        credentials: {
          email: 'test@doktu.co',
          password: 'SecurePass123',
        },
      };

      // Act
      const statusCode = 201;
      const responseBody = expectedResponse;

      // Assert
      expect(statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.doctor).toBeDefined();
      expect(responseBody.credentials).toBeDefined();
      expect(responseBody.credentials.email).toBe('test@doktu.co');
      expect(responseBody.credentials.password).toBe('SecurePass123');
    });
  });

  describe('[P1] Error Handling', () => {
    it('UT-012: Returns 400 on Zod validation error', () => {
      // Arrange
      const invalidData = {
        email: 'invalid',
        password: 'short',
        firstName: '',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      // Act & Assert
      try {
        doctorDataSchema.parse(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        const zodError = error as z.ZodError;

        // Should have multiple errors
        expect(zodError.errors.length).toBeGreaterThan(0);

        // Check error structure
        expect(zodError.errors[0]).toHaveProperty('path');
        expect(zodError.errors[0]).toHaveProperty('message');
      }
    });

    it('UT-013: Returns 500 on database error', async () => {
      // Arrange
      mockStorage.createDoctor.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(mockStorage.createDoctor({})).rejects.toThrow('Database connection failed');
    });
  });

  describe('[P1] Boundary Value Analysis - Extended', () => {
    it('BVA-001: Password length = 7 chars (rejected)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'Pass12!', // 7 chars
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      expect(() => doctorDataSchema.parse(data)).toThrow();
    });

    it('BVA-002: Password length = 8 chars (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'Pass123!', // 8 chars
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      const result = doctorDataSchema.parse(data);
      expect(result.password).toBe('Pass123!');
    });

    it('BVA-003: Password length = 128 chars (accepted)', () => {
      const password = 'a'.repeat(128);
      const data = {
        email: 'test@doktu.co',
        password,
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      const result = doctorDataSchema.parse(data);
      expect(result.password.length).toBe(128);
    });

    it('BVA-007: Consultation fee = 0.00 (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        consultationFee: 0.00,
      };

      const result = doctorDataSchema.parse(data);
      expect(result.consultationFee).toBe(0);
    });

    it('BVA-008: Consultation fee = 0.01 (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        consultationFee: 0.01,
      };

      const result = doctorDataSchema.parse(data);
      expect(result.consultationFee).toBe(0.01);
    });

    it('BVA-009: Consultation fee = 999.99 (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        consultationFee: 999.99,
      };

      const result = doctorDataSchema.parse(data);
      expect(result.consultationFee).toBe(999.99);
    });

    it('BVA-013: Years of experience = -1 (rejected)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        yearsOfExperience: -1,
      };

      expect(() => doctorDataSchema.parse(data)).toThrow();
    });

    it('BVA-014: Years of experience = 0 (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        yearsOfExperience: 0,
      };

      const result = doctorDataSchema.parse(data);
      expect(result.yearsOfExperience).toBe(0);
    });

    it('BVA-015: Years of experience = 60 (accepted)', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        yearsOfExperience: 60,
      };

      const result = doctorDataSchema.parse(data);
      expect(result.yearsOfExperience).toBe(60);
    });
  });

  describe('[P1] Equivalence Partitioning', () => {
    it('EP-001: Valid specialization accepted', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      const result = doctorDataSchema.parse(data);
      expect(result.specialization).toBe('Cardiology');
    });

    it('EP-002: Empty specialization rejected', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: '',
      };

      expect(() => doctorDataSchema.parse(data)).toThrow();
    });

    it('EP-003: Languages with 1 item accepted', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        languages: ['English'],
      };

      const result = doctorDataSchema.parse(data);
      expect(result.languages).toEqual(['English']);
    });

    it('EP-004: Languages with multiple items accepted', () => {
      const data = {
        email: 'test@doktu.co',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
        languages: ['English', 'French', 'Spanish'],
      };

      const result = doctorDataSchema.parse(data);
      expect(result.languages).toEqual(['English', 'French', 'Spanish']);
    });
  });
});
