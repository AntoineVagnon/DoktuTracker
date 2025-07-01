import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Euro, CreditCard } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

interface Doctor {
  id: string;
  specialty: string;
  avg_rating: number;
  review_count: number;
  avatar_url: string;
  location: string;
  consultation_price: string;
  user: {
    firstName: string;
    lastName: string;
    bio: string;
  };
}

export default function Checkout() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price') || '35.00';

  const { data: doctor, isLoading: doctorLoading } = useQuery<Doctor>({
    queryKey: ['/api/public/doctors', doctorId],
    enabled: !!doctorId,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [isAuthenticated, isLoading, doctorId, slot, price]);

  const formatSlotTime = (slotString: string) => {
    try {
      const date = new Date(slotString);
      return {
        date: date.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    } catch {
      return { date: 'Invalid date', time: 'Invalid time' };
    }
  };

  const handlePayment = () => {
    // TODO: Integrate with Stripe Checkout
    console.log('Processing payment for:', { doctorId, slot, price, patient: user });
    // After successful payment, redirect to dashboard
    window.location.href = '/dashboard';
  };

  if (isLoading || doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctorId || !slot || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Card className="rounded-2xl shadow-lg p-6">
              <CardContent>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Checkout Request</h1>
                <p className="text-gray-600 mb-8">
                  The payment information is incomplete or invalid.
                </p>
                <Button onClick={() => window.location.href = '/'} className="w-full">
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const slotTime = formatSlotTime(slot);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="rounded-2xl shadow-lg p-6">
            <CardHeader className="p-0 mb-6">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
              
              <CardTitle className="text-2xl font-bold text-gray-900">
                Payment
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Complete your appointment booking
              </p>
            </CardHeader>

            <CardContent className="p-0">
              {/* Appointment Summary */}
              <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Appointment Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Doctor</span>
                    <span className="font-medium">Dr. {doctor.user.firstName} {doctor.user.lastName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Date</span>
                    </div>
                    <span className="font-medium">{slotTime.date}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Time</span>
                    </div>
                    <span className="font-medium">{slotTime.time}</span>
                  </div>
                  
                  <div className="border-t pt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Euro className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-semibold">Total</span>
                    </div>
                    <span className="font-bold text-lg">€{price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>Secure payment:</strong> Your payment is processed securely via Stripe. 
                    You'll receive a confirmation email immediately after booking.
                  </p>
                </div>

                <Button
                  onClick={handlePayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg flex items-center justify-center"
                  aria-label="Complete payment and book appointment"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay €{price} & Book Appointment
                </Button>

                <div className="text-center text-sm text-gray-500">
                  <p>
                    Payment secured by{" "}
                    <a href="https://stripe.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Stripe
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}