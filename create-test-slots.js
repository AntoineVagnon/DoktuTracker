// Simple script to create future slots using the API
async function createFutureSlots() {
  const baseUrl = 'http://localhost:5000';
  
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const slots = [];
  
  // Create slots for the next 5 days
  for (let day = 0; day < 5; day++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    
    // Morning slots
    slots.push(
      { date: dateStr, startTime: '09:00:00', endTime: '09:30:00' },
      { date: dateStr, startTime: '09:30:00', endTime: '10:00:00' },
      { date: dateStr, startTime: '10:00:00', endTime: '10:30:00' },
      { date: dateStr, startTime: '10:30:00', endTime: '11:00:00' }
    );
    
    // Afternoon slots
    slots.push(
      { date: dateStr, startTime: '14:00:00', endTime: '14:30:00' },
      { date: dateStr, startTime: '14:30:00', endTime: '15:00:00' },
      { date: dateStr, startTime: '15:00:00', endTime: '15:30:00' },
      { date: dateStr, startTime: '15:30:00', endTime: '16:00:00' }
    );
  }
  
  console.log(`Planning to create ${slots.length} slots starting from ${tomorrow.toISOString().split('T')[0]}`);
  console.log('Sample slots:', slots.slice(0, 3));
  
  // Note: To actually create these, we'd need to use the doctor's authentication
  // and call the time-slots API endpoint
  console.log('\nTo create these slots:');
  console.log('1. Log in as Dr. James Rodriguez');
  console.log('2. Use the doctor dashboard to create availability');
  console.log('3. Or use the batch time-slots API endpoint');
}

createFutureSlots();