import { useEffect } from 'react';

export default function TestPasswordReset() {
  useEffect(() => {
    console.log('TestPasswordReset component loaded successfully');
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
  }, []);

  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1>Test Password Reset Page</h1>
      <p>This is a test page to verify routing works.</p>
      <p>Current URL: {window.location.href}</p>
      <p>Hash: {window.location.hash}</p>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        <h3>URL Hash Analysis:</h3>
        <pre>{JSON.stringify(Array.from(new URLSearchParams(window.location.hash.substring(1)).entries()), null, 2)}</pre>
      </div>
    </div>
  );
}