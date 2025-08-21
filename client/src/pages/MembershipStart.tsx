import { useState, useEffect } from 'react';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CreditCard, AlertCircle, ChevronLeft, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analytics } from "@/lib/analytics";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  period: string;
  allowance: string;
  renewal: string;
}

const PLAN_DETAILS: Record<string, PlanDetails> = {
  monthly: {
    id: 'monthly_plan',
    name: 'Monthly',
    price: '€45 / month',
    period: 'month',
    allowance: '2 × 30-minute consultations per month',
    renewal: 'Auto-renews monthly'
  },
  semiannual: {
    id: 'biannual_plan',
    name: '6-Month',
    price: '€219 / 6 months',
    period: '6 months',
    allowance: '12 consultations over 6 months (2 per month)',
    renewal: 'Auto-renews every 6 months'
  }
};

interface PaymentFormProps {
  plan: PlanDetails;
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PaymentForm = ({ plan, clientSecret, onSuccess, onError, paymentType = 'payment' }: PaymentFormProps & { paymentType?: 'payment' | 'setup' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    let error;
    
    // Use the appropriate confirmation method based on payment type
    if (paymentType === 'setup') {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/membership/success?plan=${plan.id}`,
        },
      });
      error = result.error;
    } else {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/membership/success?plan=${plan.id}`,
        },
      });
      error = result.error;
    }

    if (error) {
      onError(error.message || 'Payment failed');
      analytics.track('membership_payment_failed', {
        plan: plan.id,
        reason: error.message
      });
    } else {
      analytics.track('membership_payment_success', {
        plan: plan.id,
        amount: plan.price
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <div className="text-xs text-gray-500 space-y-1">
        <p>By clicking Activate Membership, you agree to our:</p>
        <div className="flex gap-3">
          <a href="/terms" className="underline hover:text-gray-700">Terms of Service</a>
          <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>
          <a href="/terms#refund" className="underline hover:text-gray-700">Refund Policy</a>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isLoading} 
        className="w-full" 
        size="lg"
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Activate Membership
          </>
        )}
      </Button>
    </form>
  );
};

export default function MembershipStart() {
  const searchParams = useSearch();
  const planParam = new URLSearchParams(searchParams).get('plan') || 'monthly';
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<'loading' | 'auth' | 'payment' | 'success' | 'guard'>('loading');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'payment' | 'setup'>('payment');
  const [existingMembership, setExistingMembership] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string>('');
  
  const plan = PLAN_DETAILS[planParam] || PLAN_DETAILS.monthly;

  useEffect(() => {
    // Track CTA click
    analytics.track('membership_cta_clicked', {
      plan: planParam,
      source: 'home_pricing'
    });
  }, [planParam]);

  useEffect(() => {
    const checkAuthAndMembership = async () => {
      // First check if we have a session directly via API
      try {
        const authResponse = await apiRequest("GET", "/api/auth/user");
        const authData = await authResponse.json();
        
        if (authData && authData.id) {
          // User is authenticated - check for existing membership
          try {
            const membershipResponse = await apiRequest("GET", "/api/membership/subscription");
            const membershipData = await membershipResponse.json();
            
            if (membershipData.subscription && membershipData.subscription.status === 'active') {
              // User already has active membership
              setExistingMembership(membershipData.subscription);
              setCurrentStep('guard');
              analytics.track('membership_guard_shown', {
                plan_clicked: plan.id
              });
            } else {
              // No active membership - proceed to payment
              await startSubscription();
            }
          } catch (error) {
            // No membership - proceed to payment
            await startSubscription();
          }
        } else {
          // Not authenticated - show auth step
          setCurrentStep('auth');
          analytics.track('membership_flow_step_viewed', {
            step: 'auth',
            plan: plan.id
          });
        }
      } catch (error) {
        // Not authenticated - show auth step
        setCurrentStep('auth');
        analytics.track('membership_flow_step_viewed', {
          step: 'auth',
          plan: plan.id
        });
      }
    };

    // Small delay to ensure session is established after registration redirect
    const timer = setTimeout(() => {
      checkAuthAndMembership();
    }, 500);

    return () => clearTimeout(timer);
  }, [plan.id]);

  const startSubscription = async () => {
    try {
      const response = await apiRequest("POST", "/api/membership/subscribe", {
        planId: plan.id
      });
      
      const data = await response.json();
      console.log("Subscription response:", data);
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentType(data.paymentType || 'payment'); // Store payment type from backend
        setCurrentStep('payment');
        analytics.track('membership_flow_step_viewed', {
          step: 'review_pay',
          plan: plan.id
        });
      } else {
        throw new Error("Failed to create subscription - no client secret received");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('auth');
    }
  };

  const handleAuthChoice = (choice: 'login' | 'signup') => {
    // Preserve plan selection during auth
    const route = choice === 'login' ? '/login-form' : '/register';
    setLocation(`${route}?redirect=/membership-start?plan=${planParam}`);
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
    analytics.track('membership_flow_step_viewed', {
      step: 'success',
      plan: plan.id
    });
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      setLocation('/patient-dashboard');
    }, 2000);
  };

  // Loading state
  if (authLoading || currentStep === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Auth step for non-logged users
  if (currentStep === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Start Your Membership</CardTitle>
            <CardDescription>
              {plan.name} Plan - {plan.price}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Selected Plan: {plan.name}</p>
              <p className="text-xs text-blue-700">{plan.allowance}</p>
            </div>

            <div className="space-y-4">
              <p className="text-center text-gray-600">Do you already have an account?</p>
              
              <Button 
                onClick={() => handleAuthChoice('login')}
                className="w-full"
                size="lg"
              >
                Yes, I have an account
              </Button>
              
              <Button 
                onClick={() => handleAuthChoice('signup')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                No, create new account
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setLocation('/')}
                className="text-gray-500"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guard screen for users with active membership
  if (currentStep === 'guard') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Membership Already Active</CardTitle>
            <CardDescription>
              You already have an active membership
              {existingMembership?.renewsAt && ` (renews on ${new Date(existingMembership.renewsAt).toLocaleDateString()})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setLocation('/patient-dashboard')}
              className="w-full"
              size="lg"
            >
              Go to Dashboard
            </Button>
            
            <Button 
              onClick={() => setLocation('/membership')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Manage Membership
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment step
  if (currentStep === 'payment' && clientSecret) {
    console.log("Rendering payment form with clientSecret:", clientSecret ? "present" : "missing");
    
    // Create Elements options object once
    const elementsOptions = {
      clientSecret: clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#0066ff',
        },
      },
    };
    
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Activate Your Membership</h1>
            <p className="text-gray-600 mt-2">Complete your payment to start your membership</p>
          </div>

          {/* Plan Summary Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-blue-900">{plan.name} Plan</h3>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{plan.price}</p>
                </div>
                <Button
                  variant="link"
                  className="text-blue-700 text-sm"
                  onClick={() => setLocation('/membership')}
                >
                  Change plan
                </Button>
              </div>
              
              <Separator className="my-4 bg-blue-200" />
              
              <div className="space-y-2">
                <div className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{plan.allowance}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{plan.renewal}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">Cancel anytime</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardContent className="p-6">
              {paymentError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{paymentError}</AlertDescription>
                </Alert>
              )}

              <Elements stripe={stripePromise} options={elementsOptions} key={clientSecret}>
                <PaymentForm 
                  plan={plan}
                  clientSecret={clientSecret}
                  paymentType={paymentType}
                  onSuccess={handlePaymentSuccess}
                  onError={setPaymentError}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Membership Active 🎉</CardTitle>
            <CardDescription className="mt-2">
              Your {plan.name} membership is now active. You can start booking consultations immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-500 text-sm">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}