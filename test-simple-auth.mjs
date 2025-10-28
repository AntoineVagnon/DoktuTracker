import fetch from 'node-fetch';

console.log('Testing /api/auth/user with detailed logging...\n');

// Login
const loginRes = await fetch('https://web-production-b2ce.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'james.rodriguez@doktu.com', password: 'password123' })
});

const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];
console.log('Login status:', loginRes.status);
console.log('Cookie received:', cookie ? 'YES' : 'NO');

// Get user
const userRes = await fetch('https://web-production-b2ce.up.railway.app/api/auth/user', {
  headers: { 'Cookie': cookie }
});

const userData = await userRes.json();
console.log('\nResponse:', JSON.stringify(userData, null, 2));
console.log('\nHas doctorId?', userData.doctorId !== undefined ? `YES (${userData.doctorId})` : 'NO');
console.log('Has role?', userData.role ? `YES (${userData.role})` : 'NO');
