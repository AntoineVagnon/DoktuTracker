import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function MembershipSuccess() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const planParam = new URLSearchParams(searchParams).get('plan') || 'monthly';
  
  const planNames: Record<string, string> = {
    'monthly_plan': 'Monthly',
    'biannual_plan': '6-Month',
    'monthly': 'Monthly',
    'semiannual': '6-Month'
  };
  
  const planName = planNames[planParam] || 'Membership';
  
  useEffect(() => {
    // Don't redirect while auth is loading
    if (isLoading) return;
    
    // Give the auth state more time to settle after payment redirect
    // Payment redirects can sometimes interrupt auth state temporarily
    if (!isAuthenticated && !isLoading) {
      // Wait a bit longer before assuming user is truly logged out
      const authCheckTimer = setTimeout(() => {
        // Re-check auth state
        if (!isAuthenticated && !isLoading) {
          console.log("MembershipSuccess: User not authenticated after waiting, showing login prompt");
          // Don't redirect immediately - show success message with login prompt
          return;
        }
      }, 4000); // Wait 4 seconds for auth to settle
      
      return () => clearTimeout(authCheckTimer);
    }
    
    // Only redirect to dashboard if definitely authenticated
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        setLocation('/dashboard');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [setLocation, isAuthenticated, isLoading]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your {planName} membership has been activated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Access your dashboard to book consultations</li>
              <li>• Browse our network of certified doctors</li>
              <li>• Schedule your first appointment</li>
              <li>• Manage your membership settings</li>
            </ul>
          </div>
          
          {isAuthenticated ? (
            <>
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                You will be redirected to your dashboard in a few seconds...
              </p>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please log in to access your membership benefits
                </p>
              </div>
              
              <Button 
                onClick={() => setLocation('/login-form')}
                className="w-full"
                size="lg"
              >
                Log In to Continue
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Your payment was successful. Log in to start using your membership.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}