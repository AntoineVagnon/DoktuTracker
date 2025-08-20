// Test script for the enhanced email system
const { sendAppointmentConfirmation, sendAppointmentReminder } = require('./server/services/appointmentEmailService');

async function testEmailSystem() {
  console.log('🧪 Testing enhanced email system...');
  
  const testData = {
    appointment_id: 'test-123',
    patient_first_name: 'John',
    patient_email: 'john@example.com',
    patient_timezone: 'Europe/Paris',
    doctor_name: 'Dr. Smith',
    doctor_email: 'smith@doktu.co',
    doctor_specialization: 'Pediatric',
    appointment_datetime_utc: '2025-08-21T10:00:00Z',
    join_link: 'https://zoom.us/j/123456789',
    price: '35',
    currency: '€',
    sequence: 0
  };

  try {
    console.log('📧 Testing appointment confirmation email...');
    await sendAppointmentConfirmation(testData);
    console.log('✅ Confirmation email test completed');

    console.log('📧 Testing appointment reminder email...');
    await sendAppointmentReminder(testData);
    console.log('✅ Reminder email test completed');

    console.log('🎉 All email tests passed!');
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run the test
testEmailSystem().then(() => {
  console.log('Email system test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});