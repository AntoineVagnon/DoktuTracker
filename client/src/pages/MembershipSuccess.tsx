import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function MembershipSuccess() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const planParam = new URLSearchParams(searchParams).get('plan') || 'monthly';
  
  // Direct auth check using React Query to bypass useAuth issues
  const { data: authData, refetch: refetchAuth } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: 3,
    retryDelay: 1000,
    staleTime: 0, // Always refetch
    refetchOnMount: 'always'
  });
  
  const isDirectlyAuthenticated = !!(authData as any)?.id;
  const finalAuthState = isAuthenticated || isDirectlyAuthenticated;
  
  const planNames: Record<string, string> = {
    'monthly_plan': 'Monthly',
    'biannual_plan': '6-Month', 
    'monthly': 'Monthly',
    'semiannual': '6-Month'
  };
  
  const planName = planNames[planParam] || 'Membership';
  
  const handleRetryAuth = async () => {
    setRetryCount(prev => prev + 1);
    await refetchAuth();
  };
  
  useEffect(() => {
    // Auto-redirect to dashboard if authenticated
    if (finalAuthState && !isLoading) {
      const timer = setTimeout(() => {
        setLocation('/dashboard');
      }, 3000); // Reduced from 5 seconds to 3
      
      return () => clearTimeout(timer);
    }
  }, [finalAuthState, isLoading, setLocation]);
  
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
          
          {finalAuthState ? (
            <>
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                You will be redirected to your dashboard in 3 seconds...
              </p>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Checking your account access...
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleRetryAuth}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Account Status
                </Button>
                
                <Button 
                  onClick={() => setLocation('/dashboard')}
                  className="w-full"
                  size="lg"
                >
                  Continue to Dashboard
                </Button>
              </div>
              
              <p className="text-xs text-center text-gray-500">
                Your payment was successful! If the dashboard doesn't load your membership, try refreshing above.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}