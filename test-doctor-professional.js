const fetch = require('node-fetch');

async function testDoctorProfessional() {
  try {
    // Login as doctor
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'james.rodriguez@doktu.com',
        password: 'Test123456!'
      })
    });
    
    const loginData = await loginRes.json();
    const sessionId = loginRes.headers.get('set-cookie')?.match(/sessionId=([^;]+)/)?.[1];
    
    console.log('Login response:', loginData);
    console.log('Session ID:', sessionId);
    
    if (!sessionId) {
      console.error('Failed to get session ID');
      return;
    }
    
    // Get current doctor info
    const doctorRes = await fetch('http://localhost:3000/api/doctors/current', {
      headers: {
        'Cookie': `sessionId=${sessionId}`
      }
    });
    
    if (doctorRes.ok) {
      const doctorData = await doctorRes.json();
      console.log('\n✅ Current doctor professional info:', doctorData);
    } else {
      const error = await doctorRes.text();
      console.log('\n❌ Failed to fetch doctor info:', error);
    }
    
    // Test update endpoint
    const updateRes = await fetch('http://localhost:3000/api/doctors/current', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionId=${sessionId}`
      },
      body: JSON.stringify({
        specialty: 'Cardiology',
        bio: 'Experienced cardiologist with 15 years of practice',
        education: 'MD from Paris Medical School',
        experience: '15 years in cardiology',
        languages: ['French', 'English', 'Spanish'],
        rppsNumber: '123456789'
      })
    });
    
    if (updateRes.ok) {
      const updatedData = await updateRes.json();
      console.log('\n✅ Updated doctor professional info:', updatedData);
    } else {
      const error = await updateRes.text();
      console.log('\n❌ Failed to update doctor info:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDoctorProfessional();
