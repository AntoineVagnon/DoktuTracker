async function loginAndCheckNotifications() {
  // Login as admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@doktu.com',
      password: 'admin123'
    })
  });
  
  const loginData = await loginRes.json();
  console.log('Login response:', loginData);
  
  const cookies = loginRes.headers.get('set-cookie');
  
  if (cookies && loginData.user && loginData.user.role === 'admin') {
    // Fetch notifications
    const notifRes = await fetch('http://localhost:5000/api/admin/notifications', {
      headers: { 'Cookie': cookies }
    });
    
    const notifications = await notifRes.json();
    console.log('\nNotifications:', JSON.stringify(notifications, null, 2));
  }
}

loginAndCheckNotifications().catch(console.error);
