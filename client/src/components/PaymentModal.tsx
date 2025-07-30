import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, CreditCard, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentDetails: {
    id: string;
    doctorId: string;
    timeSlotId: string;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    price: number;
  };
  onPaymentSuccess: () => void;
}

interface PaymentFormProps {
  appointmentDetails: PaymentModalProps['appointmentDetails'];
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm = ({ appointmentDetails, onPaymentSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [showTestCards, setShowTestCards] = useState(false);

  useEffect(() => {
    // Create appointment and payment intent when component mounts
    const createAppointmentAndPaymentIntent = async () => {
      try {
        // First create the appointment in pending status
        const appointmentResponse = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doctorId: appointmentDetails.doctorId,
            timeSlotId: appointmentDetails.timeSlotId,
            price: appointmentDetails.price.toString(),
            status: 'pending_payment',
          }),
        });

        if (!appointmentResponse.ok) {
          throw new Error('Failed to create appointment');
        }

        const appointment = await appointmentResponse.json();

        // Then create payment intent
        const paymentResponse = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
            amount: appointmentDetails.price,
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error('Failed to create payment intent');
        }

        const paymentData = await paymentResponse.json();
        setClientSecret(paymentData.clientSecret);
      } catch (error) {
        console.error('Error creating appointment and payment intent:', error);
        setErrorMessage('Failed to initialize payment. Please try again.');
        setPaymentStatus('error');
      }
    };

    createAppointmentAndPaymentIntent();
  }, [appointmentDetails]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage("Card element not found");
      setIsProcessing(false);
      setPaymentStatus('error');
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Patient', // In production, get this from user data
          },
        },
      });

      if (error) {
        console.error('Payment failed:', error);
        setErrorMessage(error.message || 'Payment failed');
        setPaymentStatus('error');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('success');
        
        // Confirm payment on backend
        await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        // Auto-redirect after 2 seconds
        setTimeout(() => {
          onPaymentSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('An unexpected error occurred');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-4">Your appointment has been confirmed.</p>
        <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appointment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Doctor:</span>
            <span className="font-medium">{appointmentDetails.doctorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Specialty:</span>
            <span>{appointmentDetails.specialty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span>
              {appointmentDetails.date && appointmentDetails.time 
                ? format(new Date(`${appointmentDetails.date}T${appointmentDetails.time}`), 'MMM d, yyyy • HH:mm')
                : 'Invalid date'
              }
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600">Total:</span>
            <Badge variant="outline" className="text-lg font-semibold text-blue-600">
              €{appointmentDetails.price.toFixed(2)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Cards Info (only in development) */}
      {import.meta.env.DEV && (
        <Collapsible open={showTestCards} onOpenChange={setShowTestCards}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Stripe Test Cards
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Alert className="mt-2">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Test card numbers:</p>
                  <div className="text-sm space-y-1">
                    <div><code>4242 4242 4242 4242</code> - Payment succeeds</div>
                    <div><code>4000 0000 0000 9995</code> - Payment fails (insufficient funds)</div>
                    <div><code>4000 0027 6000 3184</code> - Requires 3-D Secure (pass)</div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Use any future expiry date and any 3-digit CVC.{' '}
                    <a 
                      href="https://docs.stripe.com/testing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Full list ↗
                    </a>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg">
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
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {paymentStatus === 'error' && errorMessage && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing || !clientSecret}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay €${appointmentDetails.price.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default function PaymentModal({ isOpen, onClose, appointmentDetails, onPaymentSuccess }: PaymentModalProps) {
  const [showCancelBanner, setShowCancelBanner] = useState(false);

  const handleClose = () => {
    setShowCancelBanner(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Secure Payment</DialogTitle>
          </DialogHeader>
          
          <Elements stripe={stripePromise}>
            <PaymentForm
              appointmentDetails={appointmentDetails}
              onPaymentSuccess={onPaymentSuccess}
              onCancel={handleClose}
            />
          </Elements>
        </DialogContent>
      </Dialog>

      {/* Cancel Banner */}
      {showCancelBanner && (
        <Alert className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <AlertDescription>
            Payment not completed. Resume payment or release the slot.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}