import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, Euro, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm';

console.log('Stripe Publishable Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Available' : 'Missing');
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [slotExpired, setSlotExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [doctor, setDoctor] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');

  // Extract booking parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');
  const slotId = urlParams.get('slotId');
  const appointmentId = urlParams.get('appointmentId');
  
  console.log('🔥 Checkout Page Params:', { 
    doctorId, 
    slot, 
    price, 
    slotId, 
    appointmentId,
    fullUrl: window.location.href 
  });

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
        // Only check for held slots if we don't have an existing appointment
        let heldSlotData: any = {};
        
        if (!appointmentId) {
          // If we have a slotId from the URL, re-hold the slot
          if (slotId) {
            console.log('Re-holding slot with ID:', slotId);
            const reholdResponse = await fetch('/api/slots/hold', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ slotId })
            });
            
            if (reholdResponse.ok) {
              const reholdData = await reholdResponse.json();
              console.log('Slot re-held successfully:', reholdData);
              
              // Now get the held slot
              const heldSlotResponse = await fetch('/api/slots/held');
              heldSlotData = await heldSlotResponse.json();
            } else {
              console.error('Failed to re-hold slot');
              setSlotExpired(true);
              setIsLoading(false);
              return;
            }
          } else {
            // No slotId provided, check if there's already a held slot
            const heldSlotResponse = await fetch('/api/slots/held');
            heldSlotData = await heldSlotResponse.json();
          }
          
          if (!heldSlotData.heldSlot) {
            setSlotExpired(true);
            setIsLoading(false);
            return;
          }
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
          slotId: heldSlotData.heldSlot?.id || null
        });

        // We'll calculate time remaining after we know if we have an existing appointment
        // This will be done in the appointment handling section below

        let appointmentData;
        
        if (appointmentId) {
          // Use existing appointment instead of creating new one
          console.log('🔄 Using existing appointment ID:', appointmentId);
          const existingAppointmentResponse = await fetch(`/api/appointments/${appointmentId}`);
          
          if (!existingAppointmentResponse.ok) {
            console.error('❌ Failed to fetch appointment:', existingAppointmentResponse.status);
            throw new Error('Failed to fetch existing appointment');
          }
          
          appointmentData = await existingAppointmentResponse.json();
          console.log('🔄 Fetched appointment data:', appointmentData);
          
          // Calculate time remaining from original appointment creation time
          const createdAt = new Date(appointmentData.createdAt);
          const originalExpiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 minutes from original creation
          const now = new Date();
          const remaining = Math.max(0, originalExpiresAt.getTime() - now.getTime());
          
          console.log('🔥 Checkout Timer Check (Existing):', { 
            appointmentId: appointmentData.id,
            createdAt: createdAt.toISOString(), 
            expiresAt: originalExpiresAt.toISOString(), 
            now: now.toISOString(),
            remainingMs: remaining,
            isExpired: remaining <= 0
          });
          
          setTimeRemaining(remaining);
          
          if (remaining <= 0) {
            console.log('⏰ Original appointment timer expired');
            setSlotExpired(true);
            setIsLoading(false);
            return;
          }
        } else {
          // Create new appointment with proper timezone handling
          console.log('🆕 Creating new appointment');
          console.log('🕐 Original slot parameter:', slot);
          
          // Parse as local time - JavaScript treats "YYYY-MM-DDTHH:MM:SS" as local time
          const localSlotDate = new Date(slot);
          console.log('🕐 Parsed local date:', localSlotDate.toLocaleString());
          console.log('🕐 Current timezone offset (minutes):', localSlotDate.getTimezoneOffset());
          
          // Convert to UTC for storage - JavaScript's toISOString() does this automatically
          const appointmentDateUTC = localSlotDate;
          console.log('🕐 UTC for storage:', appointmentDateUTC.toISOString());
          
          // Verify the conversion
          const verifyLocal = new Date(appointmentDateUTC.toISOString());
          console.log('🕐 Verification - stored UTC converted back to local:', verifyLocal.toLocaleString());
          
          const appointmentResponse = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctorId: doctorId.toString(),
              timeSlotId: heldSlotData.heldSlot.id,
              appointmentDate: appointmentDateUTC.toISOString(), // Store as UTC
              price: price.toString(),
              status: 'pending_payment'
            })
          });

          if (!appointmentResponse.ok) {
            throw new Error('Failed to create appointment');
          }

          appointmentData = await appointmentResponse.json();
          
          // Calculate time remaining from new appointment creation time
          const createdAt = new Date(appointmentData.createdAt);
          const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 minutes from creation
          const now = new Date();
          const remaining = Math.max(0, expiresAt.getTime() - now.getTime());
          setTimeRemaining(remaining);
          
          if (remaining <= 0) {
            console.log('⏰ New appointment timer expired');
            setSlotExpired(true);
            setIsLoading(false);
            return;
          }
        }

        // Create payment intent
        const paymentResponse = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointmentData.id,
            amount: parseFloat(price)
          })
        });

        const paymentData = await paymentResponse.json();
        if (paymentData.clientSecret) {
          setClientSecret(paymentData.clientSecret);
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

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful!",
      description: "Your appointment has been confirmed.",
    });
    setLocation('/dashboard');
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

          {/* Stripe Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {clientSecret && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Client Secret: {clientSecret ? 'Available' : 'Missing'}
                  </p>
                  <Elements 
                    stripe={stripePromise} 
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                      },
                    }}
                  >
                    <CheckoutForm 
                      onSuccess={handlePaymentSuccess}
                      bookingData={bookingData}
                    />
                  </Elements>
                </div>
              )}
              
              {!clientSecret && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span>Preparing payment...</span>
                </div>
              )}
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Secure payment powered by Stripe
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}