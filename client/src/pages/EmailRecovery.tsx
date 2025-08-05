import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, MailIcon } from 'lucide-react';

export default function EmailRecovery() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'patient@test40.com' // Use the old email that's still in Supabase
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setMessage('Password reset email sent to patient@test40.com. Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Synchronization Issue</CardTitle>
          <CardDescription>
            We detected that your email was changed but not fully synchronized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your email was updated to <strong>kalyos.officiel@gmail.com</strong> in our system, but the authentication service still has your old email.</p>
              <p className="mt-2">To regain access:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click the button below to send a password reset to your OLD email</li>
                <li>Check <strong>patient@test40.com</strong> for the reset link</li>
                <li>Reset your password</li>
                <li>Log in with your OLD email (patient@test40.com)</li>
                <li>Once logged in, we'll help you properly update your email</li>
              </ol>
            </AlertDescription>
          </Alert>

          {message && (
            <Alert className="bg-green-50 border-green-200">
              <MailIcon className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handlePasswordReset} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Password Reset to Old Email'}
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            <p>Don't have access to patient@test40.com?</p>
            <p className="mt-1">Please contact support for assistance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}