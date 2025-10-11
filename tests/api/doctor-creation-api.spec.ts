/**
 * API-level test for doctor creation
 * Tests the backend directly to verify Supabase integration
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';

test.use({
  storageState: './playwright/.auth/admin.json'
});

test.describe('Doctor Creation - API Test', () => {
  test('API can create doctor account with valid admin session', async ({ request }) => {
    // Generate unique email
    const timestamp = Date.now();
    const testEmail = `test.doctor.${timestamp}@doktu.co`;

    console.log(`\n🧪 Testing doctor creation API with email: ${testEmail}`);

    // Prepare doctor data
    const doctorData = {
      email: testEmail,
      password: 'SecurePassword123!',
      firstName: 'API',
      lastName: 'Test',
      specialization: 'Cardiology',
      title: 'Dr.',
      bio: 'Test doctor created via API test',
      licenseNumber: 'LIC-TEST-001',
      yearsOfExperience: 5,
      consultationFee: 50,
      languages: ['English', 'French']
    };

    console.log('📤 Sending request to:', `${API_URL}/api/admin/create-doctor`);
    console.log('📋 Request data:', JSON.stringify(doctorData, null, 2));

    // Make the API request with authenticated session
    const response = await request.post(`${API_URL}/api/admin/create-doctor`, {
      data: doctorData
    });

    const responseBody = await response.text();
    console.log('\n📥 Response status:', response.status());
    console.log('📥 Response body:', responseBody);

    // Parse response if JSON
    let responseJson;
    try {
      responseJson = JSON.parse(responseBody);
      console.log('📥 Parsed JSON:', JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log('❌ Response is not JSON');
    }

    // Check response
    if (response.status() === 201 || response.status() === 200) {
      console.log('✅ Doctor created successfully!');
      expect(response.status()).toBeLessThan(300);

      if (responseJson) {
        expect(responseJson).toHaveProperty('doctor');
        expect(responseJson.doctor).toHaveProperty('email', testEmail);
        console.log('✅ Response contains expected doctor data');
      }
    } else {
      console.log('❌ Failed to create doctor');
      console.log('Error message:', responseJson?.error || responseJson?.message || responseBody);

      // Log specific error for debugging
      if (responseJson?.error?.includes('not_admin')) {
        console.log('🔴 SUPABASE SERVICE ROLE KEY ISSUE STILL EXISTS');
      } else if (responseJson?.error?.includes('User not allowed')) {
        console.log('🔴 SUPABASE EMAIL DOMAIN RESTRICTION');
      }

      // Fail the test
      expect(response.status()).toBeLessThan(300);
    }
  });
});
