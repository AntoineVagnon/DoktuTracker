// Debug time calculation issue
const now = new Date();
const slot19h = new Date('2025-08-02T19:00:00');

console.log('Current time:', now.toISOString());
console.log('Slot time:', slot19h.toISOString());
console.log('Difference in minutes:', (slot19h - now) / (1000 * 60));

// The backend is checking:
const slotDateTime = new Date(`2025-08-02T19:00:00`);
console.log('\nBackend slot creation:', slotDateTime.toISOString());
console.log('Backend time diff:', (slotDateTime - now) / (1000 * 60));

// The issue might be timezone related
console.log('\nTimezone info:');
console.log('Local timezone offset:', now.getTimezoneOffset());
console.log('Current time in Europe/Paris:', now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
