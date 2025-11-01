import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'https://web-production-b2ce.up.railway.app';

console.log('🧪 Testing Doctor Registration (No License Fields)\n');
console.log('API URL:', API_URL);

const testData = {
  email: `test-doctor-${Date.now()}@example.com`,
  password: 'Test123!Password',
  firstName: 'Test',
  lastName: 'Doctor',
  phone: '+49 123 456 7890',
  specialty: 'General Medicine',
  additionalCountries: ['DE', 'FR'],
  bio: 'Test doctor for Phase 2 implementation',
  consultationPrice: '50'
};

console.log('\n📤 Sending registration request...');
console.log('Email:', testData.email);
console.log('Countries:', testData.additionalCountries);

try {
  const response = await fetch(`${API_URL}/api/doctor-registration/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testData)
  });

  console.log('\n📥 Response Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));

  const responseText = await response.text();

  try {
    const data = JSON.parse(responseText);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Registration successful!');
      console.log('✅ License fields were NOT required');
      console.log('✅ Doctor ID:', data.doctorId);
    } else {
      console.log('\n❌ Registration failed');
      if (data.errors) {
        console.log('Validation errors:');
        data.errors.forEach(err => console.log(`  - ${err.message}`));
      }
    }
  } catch (jsonError) {
    console.log('\n❌ Response is not JSON:');
    console.log(responseText.substring(0, 500));
  }
} catch (error) {
  console.error('\n❌ Request failed:', error.message);
}
