import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar, Clock, Euro, AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from '@/hooks/useTranslation';

console.log('Stripe Publishable Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Available' : 'Missing');
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout() {
  const { t } = useTranslation('checkout');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [slotExpired, setSlotExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [doctor, setDoctor] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
          title: t('checkout.errors.invalid_booking'),
          description: t('checkout.errors.missing_info'),
          variant: "destructive"
        });
        setLocation('/');
        return;
      }

      // Check if user is authenticated before proceeding
      const authData = localStorage.getItem('doktu_auth');
      console.log('🔐 Auth check:', { hasAuthData: !!authData, authData: authData ? 'exists' : 'missing' });

      if (!authData) {
        console.log('❌ User not authenticated, redirecting to login');
        // Redirect to login with booking parameters to continue after login
        const loginUrl = `/test-login?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}${slotId ? `&slotId=${slotId}` : ''}`;
        window.location.href = loginUrl;
        return;
      }

      // Validate the token by checking if it has required fields
      try {
        const authObj = JSON.parse(authData);
        if (!authObj.session?.access_token) {
          console.log('❌ Invalid auth data (missing access_token), redirecting to login');
          localStorage.removeItem('doktu_auth'); // Clear invalid data
          const loginUrl = `/test-login?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}${slotId ? `&slotId=${slotId}` : ''}`;
          window.location.href = loginUrl;
          return;
        }
        console.log('✅ Valid auth token found');
      } catch (e) {
        console.log('❌ Failed to parse auth data, redirecting to login');
        localStorage.removeItem('doktu_auth'); // Clear invalid data
        const loginUrl = `/test-login?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}${slotId ? `&slotId=${slotId}` : ''}`;
        window.location.href = loginUrl;
        return;
      }

      try {
        // Fetch saved payment methods for the user
        console.log('💳 Fetching saved payment methods...');
        try {
          const paymentMethodsResponse = await apiRequest('GET', '/api/payment-methods');
          if (paymentMethodsResponse.ok) {
            const methods = await paymentMethodsResponse.json();
            setPaymentMethods(methods);

            // Auto-select the default payment method if available
            const defaultMethod = methods.find((m: any) => m.is_default);
            if (defaultMethod) {
              setSelectedPaymentMethod(defaultMethod.id);
              console.log('💳 Auto-selected default payment method:', defaultMethod.id);
            } else if (methods.length > 0) {
              // If no default, select the first one
              setSelectedPaymentMethod(methods[0].id);
              console.log('💳 Auto-selected first payment method:', methods[0].id);
            } else {
              // No saved payment methods, user will need to enter card
              setUseNewCard(true);
              console.log('💳 No saved payment methods, will use new card');
            }
          }
        } catch (pmError) {
          console.error('❌ Failed to fetch payment methods:', pmError);
          // Continue with checkout even if fetching payment methods fails
          setUseNewCard(true);
        }

        // Only check for held slots if we don't have an existing appointment
        let heldSlotData: any = {};

        if (!appointmentId) {
          // If we have a slotId from the URL, re-hold the slot
          if (slotId) {
            console.log('Re-holding slot with ID:', slotId);
            try {
              const reholdResponse = await apiRequest('POST', '/api/slots/hold', { slotId });

              if (reholdResponse.ok) {
                const reholdData = await reholdResponse.json();
                console.log('Slot re-held successfully:', reholdData);

                // Now get the held slot
                const heldSlotResponse = await apiRequest('GET', '/api/slots/held');
                heldSlotData = await heldSlotResponse.json();
              } else {
                console.warn('Re-hold failed, trying to get existing held slot');
                // Try to get existing held slot instead of failing immediately
                const heldSlotResponse = await apiRequest('GET', '/api/slots/held');
                heldSlotData = await heldSlotResponse.json();
              }
            } catch (error) {
              console.error('Error during re-hold:', error);
              // Try to get existing held slot as fallback
              try {
                const heldSlotResponse = await apiRequest('GET', '/api/slots/held');
                heldSlotData = await heldSlotResponse.json();
              } catch (fallbackError) {
                console.error('Failed to get held slot as fallback:', fallbackError);
              }
            }
          } else {
            // No slotId provided, check if there's already a held slot
            try {
              const heldSlotResponse = await apiRequest('GET', '/api/slots/held');
              heldSlotData = await heldSlotResponse.json();
            } catch (error) {
              console.error('Failed to get held slot:', error);
            }
          }

          // Only show expired error if we truly have no held slot
          if (!heldSlotData.heldSlot) {
            console.error('No held slot found. User may need to select a time slot again.');
            setSlotExpired(true);
            setIsLoading(false);
            return;
          }
        }

        // Fetch doctor information
        const doctorResponse = await apiRequest('GET', `/api/doctors/${doctorId}`);
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
          const existingAppointmentResponse = await apiRequest('GET', `/api/appointments/${appointmentId}`);

          if (!existingAppointmentResponse.ok) {
            console.error('❌ Failed to fetch appointment:', existingAppointmentResponse.status);
            throw new Error('Failed to fetch existing appointment');
          }

          appointmentData = await existingAppointmentResponse.json();
          console.log('🔄 Fetched appointment data:', appointmentData);
          
          // 💎 CHECK IF EXISTING APPOINTMENT IS ALREADY PAID/COVERED
          if (appointmentData.status === 'paid') {
            console.log('🎟️ Existing appointment is already paid! Redirecting to dashboard...');
            toast({
              title: t('checkout.success.already_confirmed'),
              description: t('checkout.success.already_booked'),
            });

            // Redirect to dashboard after short delay
            setTimeout(() => {
              setLocation('/dashboard');
            }, 1500);
            return;
          }

          // Also check coverage result if available
          if (appointmentData.coverageResult?.isCovered) {
            console.log('🎟️ Existing appointment covered by membership! Redirecting to dashboard...');
            toast({
              title: t('checkout.success.membership_confirmed'),
              description: t('checkout.success.membership_credits').replace('{{remaining}}', appointmentData.coverageResult.remainingAllowance),
            });

            // Redirect to dashboard after short delay
            setTimeout(() => {
              setLocation('/dashboard');
            }, 1500);
            return;
          }
          
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
          
          // TEST: Try the conflict-free endpoint first
          console.log("🧪 Testing conflict-free endpoint first...");
          try {
            const testResponse = await apiRequest('POST', '/api/appointments/create', { test: true });

            const testResult = await testResponse.json();
            console.log("🧪 Test endpoint result:", testResult);

            if (testResponse.ok) {
              console.log("✅ Conflict-free endpoint works! Issue is specifically with /api/appointments");
            } else {
              console.log("❌ Even conflict-free endpoint fails - deeper routing issue");
            }
          } catch (testError) {
            console.log("❌ Test endpoint failed:", testError);
          }

          // Use the working endpoint (conflict-free)
          console.log("🔄 Using working /api/appointments/create endpoint...");
          const appointmentResponse = await apiRequest('POST', '/api/appointments/create', {
            doctorId: doctorId.toString(),
            timeSlotId: heldSlotData.heldSlot.id,
            appointmentDate: appointmentDateUTC.toISOString(), // Store as UTC
            price: price.toString(),
            status: 'pending_payment'
          });

          if (!appointmentResponse.ok) {
            const errorData = await appointmentResponse.text();
            console.error('❌ Appointment creation failed:', {
              status: appointmentResponse.status,
              statusText: appointmentResponse.statusText,
              errorData
            });
            throw new Error(`Failed to create appointment: ${appointmentResponse.status} ${errorData}`);
          }

          appointmentData = await appointmentResponse.json();
          
          // 💎 CHECK IF APPOINTMENT IS COVERED BY MEMBERSHIP
          console.log('🎟️ Checking appointment coverage result:', appointmentData.coverageResult);
          
          if (appointmentData.coverageResult?.isCovered) {
            console.log('🎟️ Appointment covered by membership! Redirecting to dashboard...');
            toast({
              title: t('checkout.success.membership_confirmed'),
              description: t('checkout.success.membership_credits').replace('{{remaining}}', appointmentData.coverageResult.remainingAllowance),
            });

            // Redirect to dashboard after short delay
            setTimeout(() => {
              setLocation('/dashboard');
            }, 1500);
            return;
          }
          
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

        // Store appointment ID in bookingData for later use
        setBookingData((prev: any) => ({
          ...prev,
          appointmentId: appointmentData.appointmentId || appointmentData.id
        }));

        // Create payment intent only if appointment is not already paid and not covered by membership
        if (appointmentData.status !== 'paid' && !appointmentData.coverageResult?.isCovered) {
          // Only create payment intent if using a new card
          // If using saved payment method, we won't need the Stripe Element
          if (useNewCard || !selectedPaymentMethod) {
            const paymentResponse = await apiRequest('POST', '/api/payment/create-intent', {
              appointmentId: appointmentData.appointmentId || appointmentData.id,
              amount: parseFloat(price)
            });

            const paymentData = await paymentResponse.json();
            if (paymentData.clientSecret) {
              setClientSecret(paymentData.clientSecret);
            }
          } else {
            console.log('💳 Will use saved payment method:', selectedPaymentMethod);
          }
        } else {
          console.log('💎 Skipping payment intent creation - appointment already paid or covered');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Checkout initialization error:', error);
        toast({
          title: t('checkout.errors.general_error'),
          description: t('checkout.errors.payment_init_failed'),
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
      title: t('checkout.success.title'),
      description: t('checkout.success.message'),
    });
    setLocation('/dashboard');
  };

  const handlePayWithSavedCard = async () => {
    if (!selectedPaymentMethod || !bookingData?.appointmentId) {
      toast({
        title: t('checkout.errors.general_error'),
        description: t('checkout.errors.missing_payment_method'),
        variant: "destructive"
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log('💳 Charging saved payment method:', {
        appointmentId: bookingData.appointmentId,
        paymentMethodId: selectedPaymentMethod,
        amount: bookingData.price
      });

      const response = await apiRequest('POST', '/api/payment/charge-saved-method', {
        appointmentId: bookingData.appointmentId,
        paymentMethodId: selectedPaymentMethod,
        amount: bookingData.price
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Payment successful:', result);
        handlePaymentSuccess();
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast({
        title: t('checkout.errors.payment_failed'),
        description: error.message || t('checkout.errors.payment_failed_message'),
        variant: "destructive"
      });
      setIsProcessingPayment(false);
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
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
              <span className="text-lg">{t('checkout.loading')}</span>
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
              <CardTitle className="text-xl mb-4">{t('checkout.expired_title')}</CardTitle>
              <p className="text-gray-600 mb-6">
                {t('checkout.expired_message')}
              </p>
              <Button
                onClick={() => setLocation(`/doctor/${doctorId}`)}
                className="w-full"
              >
                {t('checkout.expired_button')}
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
                    {t('checkout.time_remaining')} {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.confirm_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <strong className="text-gray-900 mr-2">{t('checkout.doctor_label')}</strong>
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

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.payment_title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Show saved payment methods if available */}
              {paymentMethods.length > 0 && !useNewCard ? (
                <div className="space-y-4">
                  {/* Saved Payment Methods */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">{t('checkout.saved_method_label')}</Label>
                    <RadioGroup
                      value={selectedPaymentMethod || ''}
                      onValueChange={setSelectedPaymentMethod}
                      className="space-y-3"
                    >
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label
                            htmlFor={method.id}
                            className="flex items-center flex-1 cursor-pointer"
                          >
                            <CreditCard className="h-5 w-5 text-gray-600 mr-3" />
                            <div className="flex-1">
                              <div className="font-medium">
                                {formatCardBrand(method.card?.brand || 'Card')} •••• {method.card?.last4}
                              </div>
                              <div className="text-sm text-gray-500">
                                {t('checkout.card_expires')} {method.card?.exp_month}/{method.card?.exp_year}
                              </div>
                            </div>
                            {method.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {t('checkout.card_default')}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Pay Button for Saved Card */}
                  <Button
                    onClick={handlePayWithSavedCard}
                    disabled={!selectedPaymentMethod || isProcessingPayment}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('checkout.processing')}
                      </>
                    ) : (
                      <>
                        {t('checkout.pay_button').replace('{{amount}}', bookingData.price)}
                      </>
                    )}
                  </Button>

                  {/* Toggle to Use New Card */}
                  <div className="text-center pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setUseNewCard(true)}
                      className="w-full"
                    >
                      {t('checkout.use_different_card')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Show toggle back to saved cards if we have any */}
                  {paymentMethods.length > 0 && useNewCard && (
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        onClick={() => setUseNewCard(false)}
                        className="text-sm"
                      >
                        {t('checkout.back_to_saved')}
                      </Button>
                    </div>
                  )}

                  {/* New Card Entry */}
                  {clientSecret ? (
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
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                      <span>{t('checkout.preparing_payment')}</span>
                    </div>
                  )}
                </>
              )}

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('checkout.secure_by_stripe')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}