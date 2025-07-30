import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'password_reset' | 'email_confirmation' | 'error' | 'success'>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase returns tokens in hash fragment, not search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('Auth callback params:', { 
          type, 
          accessToken: !!accessToken, 
          refreshToken: !!refreshToken,
          hash: window.location.hash,
          hashParams: Array.from(hashParams.entries())
        });

        if (type === 'recovery' && accessToken) {
          // Password reset flow
          setStatus('password_reset');
        } else if (type === 'signup' && accessToken) {
          // Email confirmation flow
          setStatus('email_confirmation');
          
          console.log('Starting email confirmation process with token:', !!accessToken);
          
          // Handle email confirmation automatically
          const response = await fetch('/api/auth/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              access_token: accessToken,
              refresh_token: refreshToken 
            }),
            credentials: 'include' // Important for session cookies
          });

          console.log('Confirmation response status:', response.status);
          const responseData = await response.json();
          console.log('Confirmation response data:', responseData);

          if (response.ok) {
            setStatus('success');
            toast({
              title: "Email Confirmed",
              description: "Your email has been confirmed successfully!",
            });
            
            // Check for booking context in sessionStorage
            const loginRedirect = sessionStorage.getItem('loginRedirect');
            const pendingBooking = sessionStorage.getItem('pendingBooking');
            
            console.log('Checking redirect context:', { loginRedirect, pendingBooking });
            
            setTimeout(() => {
              if (loginRedirect) {
                // Clear the redirect and navigate to booking flow
                sessionStorage.removeItem('loginRedirect');
                console.log('Redirecting to booking flow:', loginRedirect);
                setLocation(loginRedirect);
              } else if (pendingBooking) {
                // Handle legacy pendingBooking format
                const booking = JSON.parse(pendingBooking);
                sessionStorage.removeItem('pendingBooking');
                const checkoutUrl = `/checkout?doctorId=${booking.doctorId}&slot=${encodeURIComponent(booking.slot)}&price=${booking.price}`;
                console.log('Redirecting to checkout:', checkoutUrl);
                setLocation(checkoutUrl);
              } else {
                // No booking context, go to dashboard
                console.log('No booking context, going to dashboard');
                setLocation('/dashboard');
              }
            }, 1500); // Reduced delay for better UX
          } else {
            console.error('Email confirmation failed:', responseData);
            throw new Error(`Email confirmation failed: ${responseData.error || 'Unknown error'}`);
          }
        } else if (accessToken && !type) {
          // Handle case where we have tokens but no explicit type (common with Supabase)
          console.log('Found access token without explicit type, treating as signup confirmation');
          setStatus('email_confirmation');
          
          const response = await fetch('/api/auth/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              access_token: accessToken,
              refresh_token: refreshToken 
            }),
            credentials: 'include'
          });

          console.log('Fallback confirmation response status:', response.status);
          const responseData = await response.json();
          console.log('Fallback confirmation response data:', responseData);

          if (response.ok) {
            setStatus('success');
            toast({
              title: "Authentication Successful",
              description: "You have been signed in successfully!",
            });
            
            const loginRedirect = sessionStorage.getItem('loginRedirect');
            const pendingBooking = sessionStorage.getItem('pendingBooking');
            
            setTimeout(() => {
              if (loginRedirect) {
                sessionStorage.removeItem('loginRedirect');
                setLocation(loginRedirect);
              } else if (pendingBooking) {
                const booking = JSON.parse(pendingBooking);
                sessionStorage.removeItem('pendingBooking');
                setLocation(`/checkout?doctorId=${booking.doctorId}&slot=${encodeURIComponent(booking.slot)}&price=${booking.price}`);
              } else {
                setLocation('/dashboard');
              }
            }, 1500);
          } else {
            throw new Error(`Authentication failed: ${responseData.error || 'Unknown error'}`);
          }
        } else {
          console.log('No valid auth type found, setting error state');
          console.log('Available hash params:', Array.from(hashParams.entries()));
          console.log('Type:', type, 'Access token:', !!accessToken);
          throw new Error('Invalid callback parameters');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        toast({
          title: "Authentication Error",
          description: "There was an issue with the authentication process.",
          variant: "destructive"
        });
      }
    };

    handleAuthCallback();
  }, [toast, setLocation]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          access_token: accessToken,
          refresh_token: refreshToken,
          password: newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully!",
        });
        
        // Check for booking context after password reset success
        const loginRedirect = sessionStorage.getItem('loginRedirect');
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        
        setTimeout(() => {
          if (loginRedirect) {
            sessionStorage.removeItem('loginRedirect');
            setLocation(loginRedirect);
          } else if (pendingBooking) {
            const booking = JSON.parse(pendingBooking);
            sessionStorage.removeItem('pendingBooking');
            setLocation(`/checkout?doctorId=${booking.doctorId}&slot=${encodeURIComponent(booking.slot)}&price=${booking.price}`);
          } else {
            setLocation('/test-login');
          }
        }, 2000);
      } else {
        throw new Error(data.error || 'Password update failed');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {status === 'loading' && 'Processing...'}
                {status === 'password_reset' && 'Reset Your Password'}
                {status === 'email_confirmation' && 'Confirming Email...'}
                {status === 'success' && 'Success!'}
                {status === 'error' && 'Authentication Error'}
              </CardTitle>
              <CardDescription>
                {status === 'loading' && 'Please wait while we process your request'}
                {status === 'password_reset' && 'Enter your new password below'}
                {status === 'email_confirmation' && 'Your email is being confirmed'}
                {status === 'success' && 'Authentication completed successfully'}
                {status === 'error' && 'There was an issue with authentication'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {status === 'loading' && (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {status === 'password_reset' && (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              )}

              {status === 'email_confirmation' && (
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {status === 'success' && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <p className="text-gray-600">
                    Redirecting you to continue...
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setLocation('/test-login')}
                      className="w-full"
                    >
                      Go to Login
                    </Button>
                    <Button 
                      onClick={() => setLocation('/')}
                      variant="outline"
                      className="w-full"
                    >
                      Go to Home
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}