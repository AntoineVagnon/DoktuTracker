// Check if 19:00 slot exists for Dr. James Rodriguez
console.log('Checking for 19:00 slot on August 2, 2025...');

// Current time
const now = new Date();
console.log('Current time (Paris):', now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

// The 19:00 slot would be stored as:
// date: '2025-08-02'
// startTime: '19:00:00'
console.log('\nSlot should be stored as:');
console.log('- date: 2025-08-02');
console.log('- startTime: 19:00:00');

// Time check
const slot19h = new Date('2025-08-02T19:00:00+02:00'); // 19:00 CEST
const diffMinutes = (slot19h - now) / (1000 * 60);
console.log('\nTime until 19:00 slot:', Math.round(diffMinutes), 'minutes');
console.log('Meets 60-minute requirement?', diffMinutes >= 60);
