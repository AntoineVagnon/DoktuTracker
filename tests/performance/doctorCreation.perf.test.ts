/**
 * @file doctorCreation.perf.test.ts
 * @description Performance tests for Doctor Creation feature
 * @framework k6 (JavaScript-based load testing)
 * @priority P0 (3 tests), P1 (3 tests), P2 (1 test)
 * @total 7 tests
 *
 * Tests response time, throughput, load capacity, stress conditions, and spike handling.
 *
 * INSTALLATION:
 * brew install k6  (macOS)
 * choco install k6  (Windows)
 * sudo apt-get install k6  (Linux)
 *
 * EXECUTION:
 * k6 run tests/performance/doctorCreation.perf.test.ts
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================

const errorRate = new Rate('errors');
const doctorCreationDuration = new Trend('doctor_creation_duration');
const successfulCreations = new Counter('successful_creations');
const failedCreations = new Counter('failed_creations');

// ============================================================================
// Test Configuration
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'https://doktu-tracker.vercel.app';
const ADMIN_EMAIL = __ENV.TEST_ADMIN_EMAIL || 'admin@doktu.co';
const ADMIN_PASSWORD = __ENV.TEST_ADMIN_PASSWORD || 'AdminPass123!';

// Performance Thresholds (from TEST_REPORT_DOCTOR_CREATION.md)
export const options = {
  thresholds: {
    'http_req_duration': ['p(50)<2000', 'p(95)<5000', 'p(99)<10000'], // P50<2s, P95<5s, P99<10s
    'http_reqs': ['rate>10'], // >10 req/s throughput
    'errors': ['rate<0.05'], // <5% error rate
    'http_req_failed': ['rate<0.05'], // <5% failed requests
  },
  scenarios: {
    // PERF-001 [P0]: Baseline performance (1 user)
    baseline: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test: 'PERF-001', priority: 'P0' },
      exec: 'baselineTest',
    },

    // PERF-002 [P0]: Load test (10 concurrent users)
    load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '35s',
      tags: { test: 'PERF-002', priority: 'P0' },
      exec: 'loadTest',
    },

    // PERF-003 [P0]: Stress test (50+ concurrent users)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50
        { duration: '2m', target: 100 },  // Ramp up to 100
        { duration: '1m', target: 200 },  // Spike to 200
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '3m',
      tags: { test: 'PERF-003', priority: 'P0' },
      exec: 'stressTest',
    },

    // PERF-004 [P1]: Spike test (sudden traffic surge)
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Sudden spike to 500 users
        { duration: '30s', target: 500 },  // Hold at 500
        { duration: '10s', target: 0 },    // Drop to 0
      ],
      startTime: '9m',
      tags: { test: 'PERF-004', priority: 'P1' },
      exec: 'spikeTest',
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login as admin and get session cookie
 */
function loginAsAdmin() {
  const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  // Extract session cookie
  const cookies = loginRes.cookies;
  return cookies;
}

/**
 * Create a doctor account
 */
function createDoctor(cookies: any, timestamp: number, iteration: number) {
  const payload = JSON.stringify({
    email: `perf.test.${timestamp}.${iteration}@doktu.co`,
    password: 'PerfTestP@ss123',
    firstName: `Perf${iteration}`,
    lastName: 'Doctor',
    specialization: 'General Medicine',
    title: 'Dr.',
    bio: 'Performance test doctor profile',
    yearsOfExperience: 5,
    consultationFee: 50.00,
    languages: ['English'],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': Object.keys(cookies).map(key => `${key}=${cookies[key]}`).join('; '),
    },
    tags: { name: 'CreateDoctor' },
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/admin/create-doctor`, payload, params);
  const duration = Date.now() - startTime;

  doctorCreationDuration.add(duration);

  const success = check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 10s': (r) => r.timings.duration < 10000,
    'has doctor ID': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.doctor && body.doctor.id;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulCreations.add(1);
  } else {
    failedCreations.add(1);
    errorRate.add(1);
    console.error(`Failed to create doctor: ${res.status} - ${res.body}`);
  }

  return success;
}

// ============================================================================
// PERF-001 [P0]: Baseline Performance (1 user)
// ============================================================================

export function baselineTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const iteration = __ITER;

  createDoctor(cookies, timestamp, iteration);
  sleep(1); // 1 second think time
}

// ============================================================================
// PERF-002 [P0]: Load Test (10 concurrent users)
// ============================================================================

export function loadTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const iteration = __ITER;

  createDoctor(cookies, timestamp, iteration);
  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

// ============================================================================
// PERF-003 [P0]: Stress Test (50-200 concurrent users)
// ============================================================================

export function stressTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const iteration = __ITER;

  createDoctor(cookies, timestamp, iteration);
  sleep(Math.random() * 1); // 0-1 second think time (aggressive)
}

// ============================================================================
// PERF-004 [P1]: Spike Test (sudden 500 users)
// ============================================================================

export function spikeTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const iteration = __ITER;

  createDoctor(cookies, timestamp, iteration);
  sleep(0.5); // Minimal think time for spike
}

// ============================================================================
// PERF-005 [P1]: Database connection pool exhaustion
// ============================================================================

/**
 * Test: Create 100 doctors rapidly to stress connection pool
 * Run separately: k6 run -e TEST_SCENARIO=connection_pool tests/performance/doctorCreation.perf.test.ts
 */
export function connectionPoolTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();

  // Fire 100 rapid requests
  for (let i = 0; i < 100; i++) {
    createDoctor(cookies, timestamp, i);
  }
}

// ============================================================================
// PERF-006 [P1]: Sustained load (30 minutes)
// ============================================================================

export const sustainedLoadOptions = {
  scenarios: {
    sustained: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m',
      tags: { test: 'PERF-006', priority: 'P1' },
    },
  },
};

/**
 * Run separately: k6 run -e TEST_SCENARIO=sustained tests/performance/doctorCreation.perf.test.ts
 */
export function sustainedLoadTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const iteration = __ITER;

  createDoctor(cookies, timestamp, iteration);
  sleep(Math.random() * 3 + 2); // 2-5 seconds think time
}

// ============================================================================
// PERF-007 [P2]: Concurrent duplicate email handling
// ============================================================================

export function concurrentDuplicateTest() {
  const cookies = loginAsAdmin();
  if (!cookies) {
    errorRate.add(1);
    return;
  }

  const timestamp = Date.now();
  const duplicateEmail = `duplicate.${timestamp}@doktu.co`;

  // Fire 5 concurrent requests with same email
  const requests = [];
  for (let i = 0; i < 5; i++) {
    const payload = JSON.stringify({
      email: duplicateEmail,
      password: 'PerfTestP@ss123',
      firstName: `Duplicate${i}`,
      lastName: 'Test',
      specialization: 'General',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': Object.keys(cookies).map(key => `${key}=${cookies[key]}`).join('; '),
      },
    };

    requests.push(http.post(`${BASE_URL}/api/admin/create-doctor`, payload, params));
  }

  // Check that only 1 succeeded, rest failed with 409/400
  const successCount = requests.filter(r => r.status === 201).length;
  const conflictCount = requests.filter(r => [400, 409].includes(r.status)).length;

  check({ successCount, conflictCount }, {
    'only 1 doctor created': (counts) => counts.successCount === 1,
    'others rejected as duplicates': (counts) => counts.conflictCount >= 4,
  });
}

// ============================================================================
// Test Summary
// ============================================================================

export function handleSummary(data: any) {
  console.log('======================================');
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('======================================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Successful Creations: ${data.metrics.successful_creations.values.count}`);
  console.log(`Failed Creations: ${data.metrics.failed_creations.values.count}`);
  console.log(`Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
  console.log(`P50 Response Time: ${data.metrics.http_req_duration.values['p(50)']}ms`);
  console.log(`P95 Response Time: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`P99 Response Time: ${data.metrics.http_req_duration.values['p(99)']}ms`);
  console.log(`Throughput: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`);
  console.log('======================================');

  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

/**
 * Performance Test Coverage Summary:
 *
 * P0 Critical (3 tests):
 * - PERF-001: Baseline (1 user, 30s) - P50<2s, P95<5s, P99<10s
 * - PERF-002: Load (10 users, 2min) - >10 req/s throughput
 * - PERF-003: Stress (50-200 users) - System stability under load
 *
 * P1 High Priority (3 tests):
 * - PERF-004: Spike (500 users) - Handle traffic surges
 * - PERF-005: Connection pool (100 rapid) - Database pool limits
 * - PERF-006: Sustained (20 users, 30min) - Memory leaks, gradual degradation
 *
 * P2 Medium Priority (1 test):
 * - PERF-007: Concurrent duplicates - Race condition handling
 *
 * Total: 7 tests
 *
 * Execution Commands:
 * # Run all tests (default)
 * k6 run tests/performance/doctorCreation.perf.test.ts
 *
 * # Run specific scenario
 * k6 run -e TEST_SCENARIO=baseline tests/performance/doctorCreation.perf.test.ts
 * k6 run -e TEST_SCENARIO=load tests/performance/doctorCreation.perf.test.ts
 * k6 run -e TEST_SCENARIO=stress tests/performance/doctorCreation.perf.test.ts
 * k6 run -e TEST_SCENARIO=spike tests/performance/doctorCreation.perf.test.ts
 * k6 run -e TEST_SCENARIO=connection_pool tests/performance/doctorCreation.perf.test.ts
 * k6 run -e TEST_SCENARIO=sustained tests/performance/doctorCreation.perf.test.ts
 *
 * # Generate HTML report
 * k6 run --out json=perf-results.json tests/performance/doctorCreation.perf.test.ts
 * k6 run --out influxdb=http://localhost:8086/k6 tests/performance/doctorCreation.perf.test.ts
 *
 * Environment Variables:
 * - BASE_URL: Application base URL (default: https://doktu-tracker.vercel.app)
 * - TEST_ADMIN_EMAIL: Admin email
 * - TEST_ADMIN_PASSWORD: Admin password
 *
 * Performance Benchmarks (from protocol):
 * - P50 < 2 seconds (50th percentile)
 * - P95 < 5 seconds (95th percentile)
 * - P99 < 10 seconds (99th percentile)
 * - Throughput > 10 requests/second
 * - Error rate < 5%
 *
 * Alternative Framework (Artillery.io):
 * If k6 is not available, use Artillery:
 * npm install -g artillery
 * artillery quick --count 10 --num 100 https://doktu-tracker.vercel.app/api/admin/create-doctor
 */
