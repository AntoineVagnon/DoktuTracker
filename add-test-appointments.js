// Script to add test appointments through the API
// Run with: node add-test-appointments.js

async function createTestAppointments() {
  try {
    console.log('Creating test appointments for inline actions...');
    
    // Get current time and create appointment times
    const now = new Date();
    const appointments = [
      {
        time: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1 hour from now
        type: 'in-person',
        notes: 'Test appointment 1 for inline actions demo'
      },
      {
        time: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        type: 'video',
        notes: 'Test appointment 2 (video) for inline actions demo'
      },
      {
        time: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
        type: 'in-person',
        notes: 'Test appointment 3 for inline actions demo'
      }
    ];

    // Format dates for display
    const formatDate = (date) => {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };

    console.log('\nAppointments to create:');
    appointments.forEach((apt, i) => {
      console.log(`${i + 1}. ${formatDate(apt.time)} - ${apt.type}`);
    });

    // Note: Since we can't directly insert into the database from this script,
    // you'll need to create these appointments through the UI or another method.
    console.log('\nTo create these appointments:');
    console.log('1. Log in as patient@test40.com');
    console.log('2. Navigate to Dr. James Rodriguez\'s profile');
    console.log('3. Book appointments at the following times:');
    
    appointments.forEach((apt, i) => {
      console.log(`   - ${formatDate(apt.time)} (${apt.type})`);
    });

    console.log('\nThese appointments will then appear in your calendar with inline action buttons!');

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestAppointments();