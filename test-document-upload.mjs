import dotenv from 'dotenv';
dotenv.config();

import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

const API_URL = 'https://web-production-b2ce.up.railway.app';

console.log('🧪 Testing Document Upload API\n');
console.log('API URL:', API_URL);

// Test credentials from the registration we just created
const testCredentials = {
  email: 'test-doctor-1762010222499@example.com',
  password: 'Test123!Password'
};

async function testDocumentUpload() {
  try {
    // Step 1: Login to get session cookie
    console.log('\n📤 Step 1: Logging in...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredentials)
    });

    const loginData = await loginResponse.json();
    console.log('Login Response:', loginResponse.status);

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      console.log('\nℹ️  Note: This might be expected if the doctor account needs admin approval first.');
      console.log('The important verification is that the registration succeeded without license fields.');
      return;
    }

    // Get session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful');
    console.log('Session cookie obtained:', cookies ? 'Yes' : 'No');

    if (!cookies) {
      console.log('⚠️  No session cookie received - cannot test upload without authentication');
      return;
    }

    // Step 2: Upload document
    console.log('\n📤 Step 2: Uploading test document...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test-approbation.txt'));
    formData.append('documentType', 'approbation');

    const uploadResponse = await fetch(`${API_URL}/api/doctor-documents/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
      body: formData
    });

    const uploadData = await uploadResponse.json();

    console.log('\n📥 Upload Response Status:', uploadResponse.status);
    console.log('Response:', JSON.stringify(uploadData, null, 2));

    if (uploadResponse.ok) {
      console.log('\n✅ Document upload successful!');
      console.log('✅ Document ID:', uploadData.document?.id);
      console.log('✅ File name:', uploadData.document?.fileName);
      console.log('✅ Verification status:', uploadData.document?.verificationStatus);
    } else {
      console.log('\n❌ Document upload failed');
      if (uploadData.error) {
        console.log('Error:', uploadData.error);
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Check if test file exists
if (!fs.existsSync('./test-approbation.txt')) {
  console.log('❌ Test file not found: test-approbation.txt');
  console.log('Please create the file first.');
  process.exit(1);
}

testDocumentUpload();
