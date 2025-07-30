// Test what the /api/doctors endpoint is actually returning
console.log('🔍 Testing /api/doctors endpoint...');

try {
  const response = await fetch('http://localhost:8080/api/doctors');
  const doctors = await response.json();
  
  console.log('📊 Response status:', response.status);
  console.log('👥 Number of doctors:', doctors.length);
  
  if (doctors.length > 0) {
    console.log('📝 First doctor structure:');
    console.log(JSON.stringify(doctors[0], null, 2));
    
    // Check for James Rodriguez specifically
    const james = doctors.find(d => d.user?.email === 'james.rodriguez@doktu.com');
    if (james) {
      console.log('👨‍⚕️ James Rodriguez data:');
      console.log(JSON.stringify(james, null, 2));
    } else {
      console.log('❌ James Rodriguez not found in doctors list');
      console.log('Available doctors:', doctors.map(d => ({ id: d.id, email: d.user?.email })));
    }
  }
} catch (error) {
  console.error('❌ Error fetching doctors:', error);
}