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
    const cookies = loginRes.headers.get('set-cookie');
    const sessionId = cookies?.match(/sessionId=([^;]+)/)?.[1];
    
    console.log('Login response:', loginData.message || 'Success');
    console.log('Session ID:', sessionId ? 'Found' : 'Not found');
    
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
      console.log('\n✅ Current doctor professional info:');
      console.log('  - Specialty:', doctorData.specialty || 'Not set');
      console.log('  - Bio:', doctorData.bio || 'Not set');
      console.log('  - Education:', doctorData.education || 'Not set');
      console.log('  - Experience:', doctorData.experience || 'Not set');
      console.log('  - Languages:', doctorData.languages?.join(', ') || 'Not set');
      console.log('  - RPPS Number:', doctorData.rppsNumber || 'Not set');
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
      console.log('\n✅ Successfully updated doctor professional info');
      console.log('  - Specialty:', updatedData.specialty);
      console.log('  - Bio:', updatedData.bio);
      console.log('  - Education:', updatedData.education);
      console.log('  - Experience:', updatedData.experience);
      console.log('  - Languages:', updatedData.languages?.join(', '));
      console.log('  - RPPS Number:', updatedData.rppsNumber);
    } else {
      const error = await updateRes.text();
      console.log('\n❌ Failed to update doctor info:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDoctorProfessional();
