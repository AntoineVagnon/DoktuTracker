// Debug script to understand slot filtering differences
const now = new Date();
console.log('Current time:', now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
console.log('Current UTC:', now.toISOString());

// The home page shows "Next: Aug 2, 19:00"
// This would be 17:00 UTC (19:00 CEST - 2 hours)
const aug2_19h = new Date('2025-08-02T17:00:00Z');
console.log('\nAug 2, 19:00 CEST:');
console.log('- UTC:', aug2_19h.toISOString());
console.log('- Paris time:', aug2_19h.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

// Current time comparisons
console.log('\nTime comparison:');
console.log('- Is 19:00 slot in the future?', aug2_19h > now);
console.log('- Hours until slot:', (aug2_19h - now) / (1000 * 60 * 60));
