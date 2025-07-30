import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function PasswordReset() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const [redirectContext, setRedirectContext] = useState<any>(null);

  useEffect(() => {
    console.log('PasswordReset page loaded');
    
    // Check if user is already authenticated
    if (isAuthenticated) {
      toast({
        title: "Already Logged In",
        description: "You are already logged in.",
        variant: "destructive"
      });
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      return;
    }

    // Get password reset context
    const context = sessionStorage.getItem('password_reset_context');
    if (context) {
      setRedirectContext(JSON.parse(context));
    }
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const allParams = Array.from(hashParams.entries());
    console.log('Hash params:', allParams);
    
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const hasValidTokens = !!(accessToken && type === 'recovery');
    
    console.log('Has tokens:', hasValidTokens);
    setHasTokens(hasValidTokens);
    
    if (!hasValidTokens) {
      console.log('No valid tokens found, redirecting to homepage');
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    }
  }, [setLocation, isAuthenticated, toast]);

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
      // Get tokens from hash fragment
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        throw new Error('No access token found in URL');
      }

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
        setIsSuccess(true);
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully!",
        });
        
        // Clear the password reset context
        sessionStorage.removeItem('password_reset_context');
        
        // Redirect based on context
        setTimeout(() => {
          if (redirectContext?.source === 'homepage_modal') {
            // If reset was initiated from homepage modal, redirect to homepage
            setLocation('/?reset=success');
          } else {
            // Default to dashboard for other contexts
            setLocation('/dashboard');
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

  if (!hasTokens) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Invalid Reset Link
                </CardTitle>
                <CardDescription>
                  This password reset link is invalid or has expired
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="text-center space-y-4">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setLocation('/')}
                      className="w-full"
                    >
                      Go to Home
                    </Button>
                    <Button 
                      onClick={() => setLocation('/test-login')}
                      variant="outline"
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isSuccess ? 'Success!' : 'Reset Your Password'}
              </CardTitle>
              <CardDescription>
                {isSuccess ? 'Password updated successfully' : 'Enter your new password below'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {isSuccess ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <p className="text-gray-600">
                    {redirectContext?.source === 'homepage_modal' 
                      ? 'Redirecting you to homepage...'
                      : 'Redirecting you to dashboard...'
                    }
                  </p>
                </div>
              ) : (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}