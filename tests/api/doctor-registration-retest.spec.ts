/**
 * DOCTOR REGISTRATION RE-TEST SUITE
 *
 * Purpose: Verify that the Supabase SERVICE_ROLE_KEY fix resolved the P0 blocker
 *
 * Previous Issue: HTTP 401 "Invalid API key" on all registration attempts
 * Expected After Fix: HTTP 201 with userId and doctorId
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:5000';

// Generate unique test data to avoid rate limiting and duplicates
function generateUniqueEmail(): string {
  return `retest.doctor.${Date.now()}.${Math.random().toString(36).substring(7)}@doktu.test`;
}

function generateLicenseNumber(): string {
  return `RETEST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

test.describe('Doctor Registration - Post-Fix Validation', () => {

  test('[CRITICAL] POST /signup - Valid French doctor registration', async ({ request }) => {
    const testEmail = generateUniqueEmail();
    const licenseNumber = generateLicenseNumber();

    console.log('\n🧪 Testing valid French doctor registration...');
    console.log('Email:', testEmail);
    console.log('License:', licenseNumber);

    const payload = {
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'Jean',
      lastName: 'Dupont',
      specialty: 'Cardiology',
      licenseNumber: licenseNumber,
      licenseCountry: 'FR',
      phone: '+33123456789',
      bio: 'Experienced cardiologist with 10 years of practice.'
    };

    const response = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload
    });

    const status = response.status();
    const body = await response.json();

    console.log('📊 Response Status:', status);
    console.log('📦 Response Body:', JSON.stringify(body, null, 2));

    // CRITICAL ASSERTIONS
    expect(status, 'Should return HTTP 201 (not 401)').toBe(201);
    expect(body.success, 'Success flag should be true').toBe(true);
    expect(body.data).toHaveProperty('userId');
    expect(body.data).toHaveProperty('doctorId');
    expect(body.data.email).toBe(testEmail);
    expect(body.data.status).toBe('pending_review');

    console.log('✅ Registration SUCCESSFUL!');
    console.log('   User ID:', body.data.userId);
    console.log('   Doctor ID:', body.data.doctorId);
  });

  test('[CRITICAL] POST /signup - Valid German doctor registration', async ({ request }) => {
    const testEmail = generateUniqueEmail();
    const licenseNumber = generateLicenseNumber();

    console.log('\n🧪 Testing valid German doctor registration...');

    const payload = {
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'Hans',
      lastName: 'Mueller',
      specialty: 'Neurology',
      licenseNumber: licenseNumber,
      licenseCountry: 'DE',
      phone: '+4912345678',
      bio: 'German neurologist.'
    };

    const response = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload
    });

    const status = response.status();
    const body = await response.json();

    console.log('📊 Response Status:', status);
    console.log('📦 Response Body:', JSON.stringify(body, null, 2));

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('userId');
    expect(body.data).toHaveProperty('doctorId');

    console.log('✅ German doctor registration SUCCESSFUL!');
  });

  test('[CRITICAL] POST /signup - Valid Serbian doctor registration', async ({ request }) => {
    const testEmail = generateUniqueEmail();
    const licenseNumber = generateLicenseNumber();

    console.log('\n🧪 Testing valid Serbian doctor registration...');

    const payload = {
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'Nikola',
      lastName: 'Petrovic',
      specialty: 'Cardiology',
      licenseNumber: licenseNumber,
      licenseCountry: 'RS',
      phone: '+381123456789',
      bio: 'Serbian cardiologist.'
    };

    const response = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload
    });

    const status = response.status();
    const body = await response.json();

    console.log('📊 Response Status:', status);
    console.log('📦 Response Body:', JSON.stringify(body, null, 2));

    expect(status).toBe(201);
    expect(body.success).toBe(true);

    console.log('✅ Serbian doctor registration SUCCESSFUL!');
  });

  test('[VALIDATION] POST /signup - REJECT ineligible country (USA)', async ({ request }) => {
    const testEmail = generateUniqueEmail();
    const licenseNumber = generateLicenseNumber();

    console.log('\n🧪 Testing ineligible country rejection...');

    const payload = {
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      specialty: 'Cardiology',
      licenseNumber: licenseNumber,
      licenseCountry: 'US', // Not eligible
      phone: '+11234567890'
    };

    const response = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload
    });

    const status = response.status();
    const body = await response.json();

    console.log('📊 Response Status:', status);
    console.log('📦 Response Body:', JSON.stringify(body, null, 2));

    expect(status).toBe(400);
    expect(body.error).toBe('Country not eligible');

    console.log('✅ Country validation working correctly!');
  });

  test('[VALIDATION] POST /signup - REJECT duplicate email', async ({ request }) => {
    const testEmail = generateUniqueEmail();
    const licenseNumber1 = generateLicenseNumber();
    const licenseNumber2 = generateLicenseNumber();

    console.log('\n🧪 Testing duplicate email rejection...');

    // First registration
    const payload1 = {
      email: testEmail,
      password: 'SecurePass123!',
      firstName: 'First',
      lastName: 'Doctor',
      specialty: 'Cardiology',
      licenseNumber: licenseNumber1,
      licenseCountry: 'FR',
      phone: '+33123456789'
    };

    const response1 = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload1
    });

    console.log('First registration status:', response1.status());
    expect(response1.status()).toBe(201);

    // Second registration with same email
    const payload2 = {
      email: testEmail, // DUPLICATE
      password: 'DifferentPass123!',
      firstName: 'Second',
      lastName: 'Doctor',
      specialty: 'Neurology',
      licenseNumber: licenseNumber2,
      licenseCountry: 'DE',
      phone: '+4912345678'
    };

    const response2 = await request.post(`${API_BASE_URL}/api/doctor-registration/signup`, {
      data: payload2
    });

    const status = response2.status();
    const body = await response2.json();

    console.log('Duplicate attempt status:', status);
    console.log('Response:', JSON.stringify(body, null, 2));

    expect(status).toBe(409);
    expect(body.error).toBe('Email already registered');

    console.log('✅ Duplicate email detection working!');
  });

  test('[VALIDATION] GET /eligible-countries - Returns correct country list', async ({ request }) => {
    console.log('\n🧪 Testing eligible countries endpoint...');

    const response = await request.get(`${API_BASE_URL}/api/doctor-registration/eligible-countries`);

    const status = response.status();
    const body = await response.json();

    console.log('📊 Response Status:', status);
    console.log('📦 Total Countries:', body.countries?.length);

    expect(status).toBe(200);
    expect(body.countries).toBeInstanceOf(Array);
    expect(body.regions).toHaveProperty('eu');
    expect(body.regions).toHaveProperty('balkan');
    expect(body.regions.eu.count).toBe(27);
    expect(body.regions.balkan.count).toBe(7);

    // Verify key countries
    expect(body.countries).toContain('FR');
    expect(body.countries).toContain('DE');
    expect(body.countries).toContain('RS');

    console.log('✅ Eligible countries endpoint working!');
  });

});
