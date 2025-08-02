// Simple script to show when appointments should be created
const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);

console.log('Appointments to create after 18:30:\n');

// 7 PM appointment
const apt1 = new Date(today);
apt1.setHours(19, 0, 0, 0);
console.log(`1. ${apt1.toLocaleString('en-US', { timeZone: 'Europe/Paris' })} - In-person appointment`);

// 8 PM appointment  
const apt2 = new Date(today);
apt2.setHours(20, 0, 0, 0);
console.log(`2. ${apt2.toLocaleString('en-US', { timeZone: 'Europe/Paris' })} - Video appointment`);

// 9 PM appointment
const apt3 = new Date(today);
apt3.setHours(21, 0, 0, 0);
console.log(`3. ${apt3.toLocaleString('en-US', { timeZone: 'Europe/Paris' })} - In-person appointment`);

console.log('\nThese appointments need to be created for patient@test40.com with Dr. James Rodriguez');
console.log('\nTo test the inline actions:');
console.log('1. Book these appointments through the UI');
console.log('2. Navigate to the Calendar tab');
console.log('3. The appointments will show with inline action buttons (Reschedule, Cancel, Join Video)');
