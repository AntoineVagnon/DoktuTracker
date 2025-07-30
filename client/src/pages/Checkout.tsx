import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, Euro, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [slotExpired, setSlotExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [doctor, setDoctor] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);

  // Extract booking parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  useEffect(() => {
    const initializeCheckout = async () => {
      if (!doctorId || !slot || !price) {
        toast({
          title: "Invalid Booking Request",
          description: "Missing booking information. Please start the booking process again.",
          variant: "destructive"
        });
        setLocation('/');
        return;
      }

      try {
        // Check if the slot is still held by this session
        const heldSlotResponse = await fetch('/api/slots/held');
        const heldSlotData = await heldSlotResponse.json();
        
        if (!heldSlotData.heldSlot) {
          setSlotExpired(true);
          setIsLoading(false);
          return;
        }

        // Fetch doctor information
        const doctorResponse = await fetch(`/api/doctors/${doctorId}`);
        const doctorData = await doctorResponse.json();
        setDoctor(doctorData);

        // Set booking data for display
        const slotDateTime = new Date(slot);
        setBookingData({
          doctorId,
          slot: slotDateTime,
          price: parseFloat(price),
          slotId: heldSlotData.heldSlot.id
        });

        // Calculate time remaining (15 minutes from when slot was held)
        const expiresAt = new Date(heldSlotData.heldSlot.expiresAt);
        const now = new Date();
        const remaining = Math.max(0, expiresAt.getTime() - now.getTime());
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          setSlotExpired(true);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Checkout initialization error:', error);
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive"
        });
        setLocation('/');
      }
    };

    initializeCheckout();
  }, [doctorId, slot, price, toast, setLocation]);

  // Timer for countdown and expiration check
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setSlotExpired(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handlePayment = async () => {
    if (!bookingData || slotExpired) return;

    setIsLoading(true);
    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(bookingData.price * 100), // Convert to cents
          currency: 'eur',
          metadata: {
            doctorId: bookingData.doctorId,
            slotId: bookingData.slotId,
            appointmentDate: bookingData.slot.toISOString()
          }
        })
      });

      const { clientSecret } = await response.json();
      
      if (!clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Redirect to Stripe Checkout or use Elements
      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatSlotDateTime = (slotDateTime: Date) => {
    return {
      date: slotDateTime.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: slotDateTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <Card className="p-8">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-lg">Preparing your appointment...</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (slotExpired) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <Card className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <CardTitle className="text-xl mb-4">Slot Expired</CardTitle>
              <p className="text-gray-600 mb-6">
                Your reserved time slot has expired. Please choose a new time.
              </p>
              <Button 
                onClick={() => setLocation(`/doctor/${doctorId}`)}
                className="w-full"
              >
                Choose New Time
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!bookingData || !doctor) {
    return null;
  }

  const { date, time } = formatSlotDateTime(bookingData.slot);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Time remaining warning */}
          {timeRemaining > 0 && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-orange-800">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Time remaining: {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Confirm Your Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <strong className="text-gray-900 mr-2">Doctor:</strong>
                  {doctor.firstName} {doctor.lastName}
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-3" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-3" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Euro className="h-4 w-4 mr-3" />
                  <span className="font-semibold">€{bookingData.price}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Button */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handlePayment}
                disabled={isLoading || slotExpired}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay €${bookingData.price} & Confirm`
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Secure payment powered by Stripe
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}