import { useState, useEffect } from 'react';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CreditCard, Star, Users, Calendar, Shield } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceAmount: string;
  currency: string;
  billingInterval: string;
  intervalCount: number;
  allowancePerCycle: number;
  stripePriceId: string;
  isActive: boolean;
  featured: boolean;
}

interface SubscriptionFormProps {
  selectedPlan: MembershipPlan;
  clientSecret: string;
  onSuccess: () => void;
}

const SubscriptionForm = ({ selectedPlan, clientSecret, onSuccess }: SubscriptionFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/membership/success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `Welcome to ${selectedPlan.name}!`,
      });
      onSuccess();
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <Check className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">Selected Plan: {selectedPlan.name}</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          €{selectedPlan.priceAmount} per {selectedPlan.billingInterval === '6_months' ? '6 months' : 'month'}
        </p>
      </div>

      <PaymentElement />

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
            Subscribe to {selectedPlan.name}
          </>
        )}
      </Button>
    </form>
  );
};

export default function Membership() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch available plans
        const plansResponse = await apiRequest("GET", "/api/membership/plans");
        const plansData = await plansResponse.json();
        setPlans(plansData.plans || []);

        // Fetch current subscription status
        const subscriptionResponse = await apiRequest("GET", "/api/membership/subscription");
        const subscriptionData = await subscriptionResponse.json();
        setSubscription(subscriptionData.subscription);

      } catch (error) {
        console.error("Error fetching membership data:", error);
        toast({
          title: "Error",
          description: "Failed to load membership information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSubscribe = async (plan: MembershipPlan) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/membership/subscribe", {
        planId: plan.id
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        setSelectedPlan(plan);
        setClientSecret(data.clientSecret);
      } else {
        throw new Error("Failed to create subscription");
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    { icon: Users, text: "Access to certified European doctors" },
    { icon: Calendar, text: "Easy appointment scheduling" },
    { icon: Shield, text: "GDPR compliant and secure" },
    { icon: Star, text: "Priority booking support" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show subscription form if user is subscribing
  if (selectedPlan && clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedPlan(null);
              setClientSecret("");
            }}
            className="mb-4"
          >
            ← Back to Plans
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Subscription</h1>
          <p className="text-gray-600 mt-2">
            Enter your payment information to activate your membership
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <Card>
            <CardContent className="p-6">
              <SubscriptionForm 
                selectedPlan={selectedPlan}
                clientSecret={clientSecret}
                onSuccess={() => {
                  // Redirect will happen automatically through Stripe
                }}
              />
            </CardContent>
          </Card>
        </Elements>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Membership Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to certified doctors with our flexible membership plans. 
            Save money and get priority support.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Why Choose Membership?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                  <benefit.icon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <div className="mb-8">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Active Subscription</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You currently have an active membership plan.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.featured ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}
            >
              {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    €{plan.priceAmount}
                  </span>
                  <span className="text-gray-600 ml-1">
                    / {plan.billingInterval === '6_months' ? '6 months' : 'month'}
                  </span>
                </div>

                {plan.billingInterval === '6_months' && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      23% Savings
                    </Badge>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {plan.allowancePerCycle} consultation{plan.allowancePerCycle > 1 ? 's' : ''} 
                      {plan.billingInterval === '6_months' ? ' (2 per month)' : ' per month'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Certified European doctors</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Video consultations</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Priority support</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">GDPR compliant</span>
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full ${plan.featured ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  disabled={isLoading || !!subscription}
                  size="lg"
                >
                  {subscription ? 'Already Subscribed' : 'Choose This Plan'}
                </Button>

                {plan.billingInterval === '6_months' && (
                  <p className="text-xs text-gray-500 text-center">
                    Equivalent to €{(parseFloat(plan.priceAmount) / 6).toFixed(2)} per month
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">How does the membership work?</h3>
                <p className="text-gray-600 text-sm">
                  Your membership gives you a monthly allowance of consultations. You can book appointments 
                  with any of our certified doctors without additional cost until your allowance is used.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What happens if I exceed my allowance?</h3>
                <p className="text-gray-600 text-sm">
                  If you need more consultations than your monthly allowance, you can still book additional 
                  appointments at our standard rate of €35 per consultation.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600 text-sm">
                  Yes, you can cancel your membership at any time. Your access will continue until the end 
                  of your current billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}