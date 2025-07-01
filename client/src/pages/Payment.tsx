import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, Euro, User, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const CheckoutForm = ({ doctorId, slot, price }: { doctorId: string, slot: string, price: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    // Fetch doctor information
    fetch(`/api/public/doctors/${doctorId}`)
      .then(res => res.json())
      .then(data => setDoctor(data))
      .catch(err => console.error('Error fetching doctor:', err));
  }, [doctorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(price),
          doctorId,
          slot,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Your appointment has been booked!",
        });
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!doctor) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Appointment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Appointment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <span>Dr. {doctor.user?.firstName} {doctor.user?.lastName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{format(new Date(slot), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{format(new Date(slot), 'HH:mm')}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              <span>Total Amount</span>
            </div>
            <span>€{price}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Information
              </label>
              <div className="border rounded-md p-3">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 text-lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </>
        ) : (
          `Pay €${price} & Book Appointment`
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secured with 256-bit SSL encryption. You will receive a confirmation email after successful payment.
      </p>
    </form>
  );
};

export default function Payment() {
  // Extract booking parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  // Redirect if missing parameters
  if (!doctorId || !slot || !price) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Booking
            </h1>
            <p className="text-gray-600">
              Secure payment to confirm your medical consultation
            </p>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm doctorId={doctorId} slot={slot} price={price} />
          </Elements>
        </div>
      </div>

      <Footer />
    </div>
  );
}