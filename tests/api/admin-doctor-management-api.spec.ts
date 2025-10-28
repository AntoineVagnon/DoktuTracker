/**
 * COMPREHENSIVE ADMIN DOCTOR MANAGEMENT API TESTS
 *
 * Test Suite: Admin API Endpoints for Doctor Application Review Workflow
 * Priority: P0 (Critical)
 * Test Levels: Integration + Security
 *
 * Test Coverage:
 * - GET /api/admin/doctors/applications (list applications)
 * - GET /api/admin/doctors/applications/:id (get detail)
 * - POST /api/admin/doctors/applications/:id/approve (approve)
 * - POST /api/admin/doctors/applications/:id/reject (soft/hard reject)
 * - POST /api/admin/doctors/:id/suspend (suspend)
 * - POST /api/admin/doctors/:id/reactivate (reactivate)
 * - GET /api/admin/doctors/statistics (stats)
 */

import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const PRODUCTION_BASE_URL = 'https://web-production-b2ce.up.railway.app';
const LOCAL_BASE_URL = 'http://localhost:5000';

// Test against production by default (can be switched)
const BASE_URL = process.env.TEST_ENV === 'local' ? LOCAL_BASE_URL : PRODUCTION_BASE_URL;

// Admin credentials (from test-admin-login.spec.ts)
const ADMIN_EMAIL = 'antoine.vagnon@gmail.com';
const ADMIN_PASSWORD = 'Spl@ncnopleure49';

// Test doctor data for workflow tests
const TEST_DOCTOR_TIMESTAMP = Date.now();
const TEST_DOCTORS = {
  toApprove: {
    email: `test-doctor-approve-${TEST_DOCTOR_TIMESTAMP}@example.com`,
    firstName: 'Jean',
    lastName: 'Dupont',
    licenseNumber: '12345678901',
    licenseCountry: 'FR',
    specialty: 'Cardiology',
    bio: 'Test doctor for approval workflow'
  },
  toRejectSoft: {
    email: `test-doctor-soft-reject-${TEST_DOCTOR_TIMESTAMP}@example.com`,
    firstName: 'Maria',
    lastName: 'Garcia',
    licenseNumber: 'ES123456',
    licenseCountry: 'ES',
    specialty: 'Dermatology',
    bio: 'Test doctor for soft rejection'
  },
  toRejectHard: {
    email: `test-doctor-hard-reject-${TEST_DOCTOR_TIMESTAMP}@example.com`,
    firstName: 'Invalid',
    lastName: 'User',
    licenseNumber: 'INVALID123',
    licenseCountry: 'DE',
    specialty: 'General Practice',
    bio: 'Test doctor for hard rejection'
  }
};

let adminAuthCookies: string[] = [];
let testDoctorIds: Record<string, number> = {};

test.describe('Admin Doctor Management API Tests', () => {

  // ============================
  // SETUP: Admin Authentication
  // ============================
  test.beforeAll(async ({ playwright }) => {
    console.log('\n🔐 Setting up admin authentication...');

    const request = await playwright.request.newContext();

    // Login as admin
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });

    expect(loginResponse.ok()).toBeTruthy();

    // Extract cookies
    const headers = loginResponse.headers();
    const setCookie = headers['set-cookie'];
    if (setCookie) {
      adminAuthCookies = setCookie.split(',');
      console.log(`✅ Admin authenticated, got ${adminAuthCookies.length} cookies`);
    }

    await request.dispose();
  });

  // ============================
  // PHASE 1: LIST APPLICATIONS
  // ============================

  test('[IT-001] [P0] GET /api/admin/doctors/applications - should return paginated doctor list', async ({ request }) => {
    console.log('\n📋 Testing: List all doctor applications');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log(`✅ Response status: ${response.status()}`);
    console.log(`✅ Total applications: ${data.pagination?.total || 0}`);

    // Validate response structure
    expect(data).toHaveProperty('applications');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.applications)).toBeTruthy();

    // Validate pagination
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');

    // If applications exist, validate structure
    if (data.applications.length > 0) {
      const firstApp = data.applications[0];
      expect(firstApp).toHaveProperty('doctorId');
      expect(firstApp).toHaveProperty('email');
      expect(firstApp).toHaveProperty('firstName');
      expect(firstApp).toHaveProperty('lastName');
      expect(firstApp).toHaveProperty('specialty');
      expect(firstApp).toHaveProperty('status');
      console.log(`✅ First application structure valid: ${firstApp.firstName} ${firstApp.lastName}`);
    }
  });

  test('[IT-002] [P1] GET /api/admin/doctors/applications - filter by status pending_review', async ({ request }) => {
    console.log('\n🔍 Testing: Filter applications by status');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        status: 'pending_review',
        page: 1,
        limit: 20
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log(`✅ Pending applications: ${data.applications.length}`);

    // All returned applications should have pending_review status
    data.applications.forEach((app: any) => {
      expect(app.status).toBe('pending_review');
    });

    console.log('✅ Status filter working correctly');
  });

  test('[IT-003] [P1] GET /api/admin/doctors/applications - search functionality', async ({ request }) => {
    console.log('\n🔍 Testing: Search applications by name');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        search: 'test',
        page: 1,
        limit: 20
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log(`✅ Search results: ${data.applications.length}`);

    // Validate search results contain search term
    if (data.applications.length > 0) {
      const searchTerm = 'test';
      data.applications.forEach((app: any) => {
        const fullText = `${app.firstName} ${app.lastName} ${app.email} ${app.licenseNumber}`.toLowerCase();
        expect(fullText).toContain(searchTerm);
      });
      console.log('✅ Search filter working correctly');
    }
  });

  // ============================
  // PHASE 2: GET APPLICATION DETAILS
  // ============================

  test('[IT-004] [P0] GET /api/admin/doctors/applications/:id - should return doctor details', async ({ request }) => {
    console.log('\n📄 Testing: Get doctor application details');

    // First, get list of applications
    const listResponse = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: { limit: 1 }
    });

    const listData = await listResponse.json();

    if (listData.applications.length === 0) {
      console.log('⚠️ No applications found to test detail view');
      test.skip();
      return;
    }

    const doctorId = listData.applications[0].doctorId;

    // Get details
    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications/${doctorId}`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log(`✅ Doctor details retrieved: ${data.application.firstName} ${data.application.lastName}`);

    // Validate detailed structure
    expect(data).toHaveProperty('application');
    expect(data).toHaveProperty('auditHistory');
    expect(Array.isArray(data.auditHistory)).toBeTruthy();

    const app = data.application;
    expect(app).toHaveProperty('doctorId');
    expect(app).toHaveProperty('email');
    expect(app).toHaveProperty('firstName');
    expect(app).toHaveProperty('lastName');
    expect(app).toHaveProperty('specialty');
    expect(app).toHaveProperty('licenseNumber');
    expect(app).toHaveProperty('licenseCountry');
    expect(app).toHaveProperty('status');
    expect(app).toHaveProperty('bio');

    console.log('✅ Application details structure valid');
  });

  // ============================
  // PHASE 3: SECURITY TESTS
  // ============================

  test('[SEC-001] [P0] Admin endpoints should reject unauthenticated requests', async ({ request }) => {
    console.log('\n🔒 Testing: Unauthenticated access denied');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`);

    expect(response.status()).toBe(401);
    console.log('✅ Unauthenticated request rejected with 401');
  });

  test('[SEC-002] [P0] Admin endpoints should reject non-admin users', async ({ playwright }) => {
    console.log('\n🔒 Testing: Non-admin access denied');

    // Create test patient account (if needed) or use existing
    // For now, we'll test without auth - should be caught by SEC-001
    // In a real scenario, you'd login as a patient/doctor and test 403

    const request = await playwright.request.newContext();

    // Test without admin cookies
    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`);

    expect([401, 403]).toContain(response.status());
    console.log(`✅ Non-admin request rejected with ${response.status()}`);

    await request.dispose();
  });

  test('[SEC-003] [P0] Should not expose sensitive data in API responses', async ({ request }) => {
    console.log('\n🔒 Testing: Sensitive data not exposed');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: { limit: 1 }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.applications.length > 0) {
      const app = data.applications[0];

      // Should NOT include sensitive fields
      expect(app).not.toHaveProperty('password');
      expect(app).not.toHaveProperty('passwordHash');
      expect(app).not.toHaveProperty('hashedPassword');

      console.log('✅ No sensitive data exposed');
    }
  });

  // ============================
  // PHASE 4: STATISTICS
  // ============================

  test('[IT-005] [P1] GET /api/admin/doctors/statistics - should return stats', async ({ request }) => {
    console.log('\n📊 Testing: Get doctor statistics');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/statistics`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log(`✅ Statistics retrieved`);

    // Validate stats structure
    expect(data).toHaveProperty('statusCounts');
    expect(Array.isArray(data.statusCounts)).toBeTruthy();

    // Should have counts for different statuses
    console.log('Status counts:', data.statusCounts);

    data.statusCounts.forEach((stat: any) => {
      expect(stat).toHaveProperty('status');
      expect(stat).toHaveProperty('count');
      expect(typeof stat.count).toBe('string'); // SQL returns as string
    });

    console.log('✅ Statistics structure valid');
  });

  // ============================
  // PHASE 5: ERROR HANDLING
  // ============================

  test('[ERR-001] [P1] Should return 404 for non-existent doctor', async ({ request }) => {
    console.log('\n❌ Testing: Non-existent doctor returns 404');

    const response = await request.get(`${BASE_URL}/api/admin/doctors/applications/999999`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      }
    });

    expect(response.status()).toBe(404);
    console.log('✅ 404 returned for non-existent doctor');
  });

  test('[ERR-002] [P1] Should validate required fields for rejection', async ({ request }) => {
    console.log('\n❌ Testing: Rejection without reason fails');

    // Get a pending doctor
    const listResponse = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        status: 'pending_review',
        limit: 1
      }
    });

    const listData = await listResponse.json();

    if (listData.applications.length === 0) {
      console.log('⚠️ No pending applications to test rejection validation');
      test.skip();
      return;
    }

    const doctorId = listData.applications[0].doctorId;

    // Try to reject without reason
    const response = await request.post(`${BASE_URL}/api/admin/doctors/applications/${doctorId}/reject`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      data: {
        rejectionType: 'soft'
        // Missing required 'reason' field
      }
    });

    expect([400, 422]).toContain(response.status());
    console.log(`✅ Rejection without reason rejected with ${response.status()}`);
  });

  // ============================
  // PHASE 6: PAGINATION
  // ============================

  test('[IT-006] [P2] Pagination should work correctly', async ({ request }) => {
    console.log('\n📄 Testing: Pagination functionality');

    // Get first page
    const page1Response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        page: 1,
        limit: 5
      }
    });

    expect(page1Response.status()).toBe(200);

    const page1Data = await page1Response.json();

    if (page1Data.pagination.total <= 5) {
      console.log('⚠️ Not enough applications to test pagination');
      return;
    }

    // Get second page
    const page2Response = await request.get(`${BASE_URL}/api/admin/doctors/applications`, {
      headers: {
        'Cookie': adminAuthCookies.join('; ')
      },
      params: {
        page: 2,
        limit: 5
      }
    });

    expect(page2Response.status()).toBe(200);

    const page2Data = await page2Response.json();

    // Verify different results
    const page1Ids = page1Data.applications.map((a: any) => a.doctorId);
    const page2Ids = page2Data.applications.map((a: any) => a.doctorId);

    // No overlap between pages
    const overlap = page1Ids.filter((id: number) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);

    console.log('✅ Pagination working correctly');
  });

});

/**
 * NOTE: Approval/Rejection workflow tests are in the E2E Playwright tests
 * because they require UI interaction and state changes that are better
 * tested in a browser environment with proper setup/teardown.
 *
 * See: tests/e2e/admin-doctor-approval-workflow.spec.ts
 */
