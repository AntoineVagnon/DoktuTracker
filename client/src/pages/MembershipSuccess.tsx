import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';

export default function MembershipSuccess() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const planParam = new URLSearchParams(searchParams).get('plan') || 'monthly';
  
  const planNames: Record<string, string> = {
    'monthly_plan': 'Monthly',
    'biannual_plan': '6-Month',
    'monthly': 'Monthly',
    'semiannual': '6-Month'
  };
  
  const planName = planNames[planParam] || 'Membership';
  
  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      setLocation('/patient-dashboard');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [setLocation]);
  
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
          
          <Button 
            onClick={() => setLocation('/patient-dashboard')}
            className="w-full"
            size="lg"
          >
            Go to Dashboard
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            You will be redirected to your dashboard in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}