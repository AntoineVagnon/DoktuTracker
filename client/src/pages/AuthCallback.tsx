import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');

        if (type === 'signup' && accessToken && refreshToken) {
          // Call our backend to confirm the email
          const response = await fetch('/api/auth/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accessToken,
              refreshToken
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setStatus('success');
            setMessage('Email confirmed successfully! You can now log in.');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
              setLocation('/test-login?message=Email confirmed, you can now log in');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(data.error || 'Email confirmation failed');
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Something went wrong during confirmation');
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Email Confirmation
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 text-center">
              {status === 'loading' && (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <p className="text-gray-600">Confirming your email...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                  <p className="text-green-600 font-medium">{message}</p>
                  <p className="text-sm text-gray-500">
                    Redirecting to login page...
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  <XCircle className="h-12 w-12 mx-auto text-red-600" />
                  <p className="text-red-600 font-medium">{message}</p>
                  <Button 
                    onClick={() => setLocation('/test-login')}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}