// Test script to trigger appointment creation error and see validation details
const fetch = require('node-fetch');

async function testAppointmentCreation() {
  console.log('🧪 Testing appointment creation to reproduce validation error...');
  
  try {
    // Simulate the exact request that the frontend makes
    const response = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'session=test_session_for_user_53' // Simulate authenticated user
      },
      body: JSON.stringify({
        doctorId: "9",                    // String (frontend sends as string)
        timeSlotId: "d27a262d-1447-49f7-a009-c209c5fa2411",  // UUID
        appointmentDate: "2025-09-16T16:30:00.000Z",         // ISO string
        price: "35.00",                   // String
        status: "pending_payment"         // Status (gets overridden by server)
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', response.headers.raw());
    
    const result = await response.text();
    console.log('📊 Response body:', result);
    
    if (!response.ok) {
      console.log('❌ Request failed as expected - check server logs for validation details');
    } else {
      console.log('✅ Request succeeded unexpectedly');
    }
    
  } catch (error) {
    console.error('💥 Request error:', error);
  }
}

testAppointmentCreation();