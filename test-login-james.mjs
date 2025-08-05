async function testLogin() {
  try {
    // Test login with the corrected email
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'james.rodriguez@doktu.com',
        password: 'Test123456!'
      })
    });
    
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      const cookies = loginRes.headers.get('set-cookie');
      const sessionId = cookies?.match(/sessionId=([^;]+)/)?.[1];
      
      console.log('✅ Login successful');
      console.log('User:', loginData.user?.email, 'Role:', loginData.user?.role);
      
      if (sessionId) {
        // Test accessing doctor professional info
        const doctorRes = await fetch('http://localhost:3000/api/doctors/current', {
          headers: { 'Cookie': `sessionId=${sessionId}` }
        });
        
        if (doctorRes.ok) {
          const doctorData = await doctorRes.json();
          console.log('✅ Doctor profile accessible');
          console.log('Specialty:', doctorData.specialty);
          console.log('Bio:', doctorData.bio?.substring(0, 50) + '...');
        } else {
          const error = await doctorRes.text();
          console.log('❌ Cannot access doctor profile:', error);
        }
      }
    } else {
      const error = await loginRes.text();
      console.log('❌ Login failed:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();
