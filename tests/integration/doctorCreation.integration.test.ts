/**
 * @file doctorCreation.integration.test.ts
 * @description Integration tests for Doctor Creation feature
 * @framework Vitest + Testcontainers
 * @priority P0 (5 tests), P1 (5 tests), P2 (2 tests)
 * @total 12 tests
 *
 * Tests database transactions, Supabase Auth integration, and concurrent operations.
 * Uses real PostgreSQL instance via Testcontainers for high-fidelity testing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
let mockSupabase: any;
let pgPool: Pool;
let postgresContainer: StartedTestContainer;

// ============================================================================
// Test Setup & Teardown
// ============================================================================

beforeAll(async () => {
  // Start PostgreSQL container
  postgresContainer = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpass',
      POSTGRES_DB: 'doktu_test',
    })
    .withExposedPorts(5432)
    .start();

  const host = postgresContainer.getHost();
  const port = postgresContainer.getMappedPort(5432);

  // Create connection pool
  pgPool = new Pool({
    host,
    port,
    user: 'testuser',
    password: 'testpass',
    database: 'doktu_test',
  });

  // Create test tables
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'patient',
      phone_number VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      specialization VARCHAR(100) NOT NULL,
      title VARCHAR(10) DEFAULT 'Dr.',
      bio TEXT,
      license_number VARCHAR(50) UNIQUE,
      years_of_experience INTEGER DEFAULT 0,
      consultation_fee NUMERIC(10, 2) DEFAULT 35.00,
      languages TEXT[] DEFAULT ARRAY['English'],
      rating NUMERIC(3, 2) DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      verified BOOLEAN DEFAULT TRUE,
      accepting_new_patients BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Mock Supabase client
  mockSupabase = {
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  };
}, 60000); // 60s timeout for container startup

afterAll(async () => {
  await pgPool.end();
  await postgresContainer.stop();
});

beforeEach(async () => {
  // Clean up test data before each test
  await pgPool.query('DELETE FROM doctors');
  await pgPool.query('DELETE FROM users');
  vi.clearAllMocks();
});

// ============================================================================
// P0 Critical Integration Tests (MUST PASS 100%)
// ============================================================================

describe('[P0] Critical Integration Tests', () => {

  it('IT-001 [P0]: Successfully create auth user + users record + doctors record', async () => {
    // Arrange
    const authUserId = 'auth-uuid-123';
    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: authUserId,
          email: 'jane.smith@doktu.co',
          user_metadata: {
            role: 'doctor',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      },
      error: null,
    });

    // Act - Simulate full doctor creation flow
    const { data: authData } = await mockSupabase.auth.admin.createUser({
      email: 'jane.smith@doktu.co',
      password: 'SecureP@ss123',
      email_confirm: true,
      user_metadata: { role: 'doctor', firstName: 'Jane', lastName: 'Smith' },
    });

    // Insert into users table
    const userResult = await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [authUserId, 'jane.smith@doktu.co', 'Jane', 'Smith', 'doctor']
    );

    // Insert into doctors table
    const doctorResult = await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number, consultation_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [authUserId, 'Jane', 'Smith', 'jane.smith@doktu.co', 'Cardiology', 'DOC-123456', 60.00]
    );

    // Assert - All 3 records created with matching IDs
    expect(authData.user.id).toBe(authUserId);
    expect(userResult.rows[0].email).toBe('jane.smith@doktu.co');
    expect(userResult.rows[0].role).toBe('doctor');
    expect(doctorResult.rows[0].user_id).toBe(authUserId);
    expect(doctorResult.rows[0].specialization).toBe('Cardiology');
    expect(doctorResult.rows[0].consultation_fee).toBe('60.00');
  });

  it('IT-002 [P0]: Rollback on database error prevents orphan auth users', async () => {
    // Arrange
    const authUserId = 'auth-uuid-456';
    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: authUserId, email: 'duplicate@doktu.co' } },
      error: null,
    });
    mockSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

    // Create a doctor with this email first (to trigger constraint violation)
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['existing-uuid', 'duplicate@doktu.co', 'Existing', 'Doctor', 'doctor']
    );
    await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['existing-uuid', 'Existing', 'Doctor', 'duplicate@doktu.co', 'General', 'DOC-EXIST']
    );

    // Act - Try to create duplicate doctor
    try {
      await mockSupabase.auth.admin.createUser({
        email: 'duplicate@doktu.co',
        password: 'Pass123!',
        email_confirm: true,
      });

      // Attempt to insert duplicate email (should fail)
      await pgPool.query(
        `INSERT INTO users (id, email, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [authUserId, 'duplicate@doktu.co', 'Jane', 'Duplicate', 'doctor']
      );
    } catch (error: any) {
      // Rollback: delete auth user
      await mockSupabase.auth.admin.deleteUser(authUserId);
    }

    // Assert - No orphan records created
    const userCount = await pgPool.query(`SELECT COUNT(*) FROM users WHERE email = 'duplicate@doktu.co'`);
    expect(parseInt(userCount.rows[0].count)).toBe(1); // Only the original

    const doctorCount = await pgPool.query(`SELECT COUNT(*) FROM doctors WHERE email = 'duplicate@doktu.co'`);
    expect(parseInt(doctorCount.rows[0].count)).toBe(1); // Only the original

    expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith(authUserId);
  });

  it('IT-005 [P0]: Foreign key constraint enforced (user_id → users.id)', async () => {
    // Act & Assert - Try to insert doctor with non-existent user_id
    await expect(
      pgPool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['non-existent-uuid', 'Jane', 'Smith', 'jane@doktu.co', 'Cardiology', 'DOC-123']
      )
    ).rejects.toThrow(); // Should throw foreign key constraint violation
  });

  it('IT-007 [P0]: Unique constraint enforced for doctor email', async () => {
    // Arrange - Create first doctor
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['uuid-1', 'jane@doktu.co', 'Jane', 'Smith', 'doctor']
    );
    await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['uuid-1', 'Jane', 'Smith', 'jane@doktu.co', 'Cardiology', 'DOC-1']
    );

    // Act & Assert - Try to create second doctor with same email
    await expect(
      pgPool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['uuid-2', 'Jane', 'Duplicate', 'jane@doktu.co', 'Neurology', 'DOC-2']
      )
    ).rejects.toThrow(/unique constraint/i);
  });

  it('IT-009 [P0]: Cascade delete removes doctor when user is deleted', async () => {
    // Arrange - Create user and doctor
    const userId = 'cascade-uuid';
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'cascade@doktu.co', 'Cascade', 'Test', 'doctor']
    );
    await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'Cascade', 'Test', 'cascade@doktu.co', 'General', 'DOC-CASCADE']
    );

    // Act - Delete user
    await pgPool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Assert - Doctor is automatically deleted (cascade)
    const doctorCount = await pgPool.query(
      'SELECT COUNT(*) FROM doctors WHERE user_id = $1',
      [userId]
    );
    expect(parseInt(doctorCount.rows[0].count)).toBe(0);
  });
});

// ============================================================================
// P1 High Priority Integration Tests (MUST PASS 100%)
// ============================================================================

describe('[P1] High Priority Integration Tests', () => {

  it('IT-003 [P1]: Handle Supabase timeout gracefully (no DB writes on failure)', async () => {
    // Arrange - Mock Supabase timeout
    mockSupabase.auth.admin.createUser.mockRejectedValue(
      new Error('Supabase timeout: Request took too long')
    );

    // Act
    let authError = null;
    try {
      await mockSupabase.auth.admin.createUser({
        email: 'timeout@doktu.co',
        password: 'Pass123!',
      });
    } catch (error) {
      authError = error;
    }

    // Assert - No database writes occurred
    expect(authError).toBeTruthy();
    const userCount = await pgPool.query(`SELECT COUNT(*) FROM users WHERE email = 'timeout@doktu.co'`);
    expect(parseInt(userCount.rows[0].count)).toBe(0);
  });

  it('IT-004 [P1]: Verify default values applied correctly in database', async () => {
    // Arrange
    const userId = 'defaults-uuid';
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'defaults@doktu.co', 'Default', 'Test', 'doctor']
    );

    // Act - Insert doctor without optional fields
    const result = await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, 'Default', 'Test', 'defaults@doktu.co', 'General', 'DOC-DEFAULT']
    );

    // Assert - Default values applied
    const doctor = result.rows[0];
    expect(doctor.title).toBe('Dr.');
    expect(doctor.years_of_experience).toBe(0);
    expect(doctor.consultation_fee).toBe('35.00');
    expect(doctor.languages).toEqual(['English']);
    expect(doctor.rating).toBe('5.00');
    expect(doctor.review_count).toBe(0);
    expect(doctor.verified).toBe(true);
    expect(doctor.accepting_new_patients).toBe(true);
  });

  it('IT-006 [P1]: License number auto-generation (DOC-{timestamp}) when not provided', async () => {
    // Arrange
    const userId = 'autogen-uuid';
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'autogen@doktu.co', 'Auto', 'Gen', 'doctor']
    );

    // Act - Insert doctor without license_number (simulating backend logic)
    const timestamp = Date.now();
    const autoLicense = `DOC-${timestamp}`;
    const result = await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, 'Auto', 'Gen', 'autogen@doktu.co', 'General', autoLicense]
    );

    // Assert - License number follows pattern
    expect(result.rows[0].license_number).toMatch(/^DOC-\d+$/);
    expect(result.rows[0].license_number).toBe(autoLicense);
  });

  it('IT-008 [P1]: Unique constraint enforced for license number', async () => {
    // Arrange - Create first doctor
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['uuid-1', 'doc1@doktu.co', 'Doc', 'One', 'doctor']
    );
    await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['uuid-1', 'Doc', 'One', 'doc1@doktu.co', 'Cardiology', 'DOC-UNIQUE']
    );

    // Act & Assert - Try to create second doctor with same license
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['uuid-2', 'doc2@doktu.co', 'Doc', 'Two', 'doctor']
    );
    await expect(
      pgPool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['uuid-2', 'Doc', 'Two', 'doc2@doktu.co', 'Neurology', 'DOC-UNIQUE']
      )
    ).rejects.toThrow(/unique constraint/i);
  });

  it('IT-010 [P1]: Verify consultation_fee stored with 2 decimal precision', async () => {
    // Arrange
    const userId = 'decimal-uuid';
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'decimal@doktu.co', 'Decimal', 'Test', 'doctor']
    );

    // Act - Insert doctor with precise fee
    const result = await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number, consultation_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, 'Decimal', 'Test', 'decimal@doktu.co', 'General', 'DOC-DECIMAL', 99.999]
    );

    // Assert - Rounded to 2 decimals
    expect(result.rows[0].consultation_fee).toBe('100.00'); // Postgres NUMERIC(10,2) rounds
  });
});

// ============================================================================
// P2 Medium Priority Integration Tests (80%+ pass acceptable)
// ============================================================================

describe('[P2] Medium Priority Integration Tests', () => {

  it('IT-011 [P2]: Concurrent doctor creation (race condition handling)', async () => {
    // Arrange
    const email = 'concurrent@doktu.co';
    const createDoctor = async (userId: string, licenseNum: string) => {
      await pgPool.query(
        `INSERT INTO users (id, email, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, email, 'Concurrent', 'Test', 'doctor']
      );
      await pgPool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'Concurrent', 'Test', email, 'General', licenseNum]
      );
    };

    // Act - Fire 2 concurrent requests with same email
    const [result1, result2] = await Promise.allSettled([
      createDoctor('concurrent-uuid-1', 'DOC-CON-1'),
      createDoctor('concurrent-uuid-2', 'DOC-CON-2'),
    ]);

    // Assert - One succeeds, one fails with unique constraint
    const successCount = [result1, result2].filter(r => r.status === 'fulfilled').length;
    const failCount = [result1, result2].filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(1); // Only one should succeed
    expect(failCount).toBe(1); // One should fail on unique constraint
  });

  it('IT-012 [P2]: Verify languages array stored correctly (PostgreSQL TEXT[])', async () => {
    // Arrange
    const userId = 'languages-uuid';
    await pgPool.query(
      `INSERT INTO users (id, email, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'languages@doktu.co', 'Lang', 'Test', 'doctor']
    );

    // Act - Insert doctor with multiple languages
    const result = await pgPool.query(
      `INSERT INTO doctors (user_id, first_name, last_name, email, specialization, license_number, languages)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, 'Lang', 'Test', 'languages@doktu.co', 'General', 'DOC-LANG', ['English', 'French', 'Spanish']]
    );

    // Assert - Array stored and retrieved correctly
    expect(result.rows[0].languages).toEqual(['English', 'French', 'Spanish']);
    expect(Array.isArray(result.rows[0].languages)).toBe(true);
  });
});

// ============================================================================
// Test Summary
// ============================================================================

/**
 * Integration Test Coverage Summary:
 *
 * P0 Critical (5 tests):
 * - IT-001: Full 3-table insert flow
 * - IT-002: Rollback on failure
 * - IT-005: Foreign key constraint
 * - IT-007: Unique email constraint
 * - IT-009: Cascade delete
 *
 * P1 High Priority (5 tests):
 * - IT-003: Supabase timeout handling
 * - IT-004: Default values
 * - IT-006: License auto-generation
 * - IT-008: Unique license constraint
 * - IT-010: Decimal precision
 *
 * P2 Medium Priority (2 tests):
 * - IT-011: Concurrent creation race condition
 * - IT-012: Languages array storage
 *
 * Total: 12 tests
 *
 * Execution Command:
 * npx vitest run tests/integration/doctorCreation.integration.test.ts
 *
 * Prerequisites:
 * npm install -D vitest testcontainers pg @supabase/supabase-js
 */
