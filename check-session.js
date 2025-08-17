// Check current session status
async function checkSession() {
  try {
    const response = await fetch('http://localhost:5000/api/user/profile', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Profile check status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Current user:', data);
    } else {
      console.log('Not authenticated or error:', await response.text());
    }
    
    // Try to check auth/user endpoint
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Auth check status:', authResponse.status);
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Auth user:', authData);
    } else {
      console.log('Auth check failed:', await authResponse.text());
    }
    
  } catch (error) {
    console.error('Session check error:', error);
  }
}

checkSession();