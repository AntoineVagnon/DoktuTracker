import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, CreditCard, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from '@/hooks/useAuth';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

function CompleteSubscriptionForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login-form');
      return;
    }

    // Get incomplete subscription data
    const fetchIncompleteSubscription = async () => {
      try {
        const response = await apiRequest('POST', '/api/membership/complete-subscription');
        const data = await response.json();
        
        if (data.clientSecret) {
          setSubscriptionData(data);
        } else if (data.status === 'active') {
          // Subscription is already active, redirect to dashboard
          setLocation('/dashboard');
        } else {
          setError(data.message || "Unable to complete subscription");
        }
      } catch (err: any) {
        setError("Failed to load subscription information");
      }
    };

    fetchIncompleteSubscription();
  }, [isAuthenticated, setLocation]);

  const handleCompletePayment = async () => {
    if (!stripe || !elements || !subscriptionData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Payment form not loaded properly");
      setIsLoading(false);
      return;
    }

    try {
      let result;
      
      // Check if this is a setup intent or payment intent
      if (subscriptionData.paymentType === 'setup' || subscriptionData.clientSecret.startsWith('seti_')) {
        // Use confirmCardSetup for setup intents
        result = await stripe.confirmCardSetup(subscriptionData.clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });
      } else {
        // Use confirmCardPayment for payment intents
        result = await stripe.confirmCardPayment(subscriptionData.clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });
      }

      if (result.error) {
        setError(result.error.message || "Payment failed");
      } else {
        // Check success for both payment intent and setup intent
        const isPaymentSuccess = result.paymentIntent?.status === 'succeeded';
        const isSetupSuccess = result.setupIntent?.status === 'succeeded';
        
        if (isPaymentSuccess || isSetupSuccess) {
          setSuccess(true);
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            setLocation('/dashboard');
          }, 3000);
        } else {
          setError("Payment processing incomplete");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Payment Complete!</CardTitle>
            <CardDescription>
              Your membership is now active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <CardDescription>
            Your membership subscription needs payment completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {subscriptionData && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Subscription Details</h3>
                <p className="text-sm text-blue-800">
                  {subscriptionData.message}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span className="font-medium">Payment Method</span>
                  </div>
                  <CardElement 
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                      },
                    }}
                  />
                </div>

                <Button 
                  onClick={handleCompletePayment}
                  disabled={!stripe || !elements || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Processing..." : "Complete Payment"}
                </Button>
              </div>
            </>
          )}

          <div className="text-center">
            <Button 
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              className="text-sm"
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CompleteSubscription() {
  return (
    <Elements stripe={stripePromise}>
      <CompleteSubscriptionForm />
    </Elements>
  );
}