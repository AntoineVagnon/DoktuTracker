import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CheckoutFormProps {
  onSuccess: () => void;
  bookingData: any;
}

export default function CheckoutForm({ onSuccess, bookingData }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "Unable to process payment. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded without redirect
        console.log('Payment succeeded:', paymentIntent);
        toast({
          title: "Payment Successful",
          description: "Your appointment has been confirmed!",
        });
        // Redirect to success page with payment intent ID
        window.location.href = `/payment-success?payment_intent=${paymentIntent.id}&payment_intent_client_secret=${paymentIntent.client_secret}`;
      } else {
        // Handle other payment statuses
        console.log('Payment status:', paymentIntent?.status);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Unexpected payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded p-4 min-h-[120px]">
        <PaymentElement options={{
          layout: 'tabs'
        }} />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay €${bookingData?.price} & Confirm`
        )}
      </Button>
    </form>
  );
}