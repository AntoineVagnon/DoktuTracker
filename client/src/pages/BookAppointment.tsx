import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Euro } from "lucide-react";
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

export default function BookAppointment() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Auth guard: redirect unauthenticated users to login flow
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!user) {
    const currentPath = location;
    const redirectUrl = encodeURIComponent(currentPath);
    window.location.href = `/login?redirect=${redirectUrl}`;
    return null;
  }

  // Parse URL parameters after auth check
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price') || '35.00'; // fallback to default price

  // Validate required parameters
  if (!doctorId || !slot || !price) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Card className="rounded-2xl shadow-lg p-6">
              <CardContent>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking Request</h1>
                <p className="text-gray-600 mb-8">
                  The booking information is incomplete or invalid.
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

  const { data: doctor, isLoading: doctorLoading } = useQuery<Doctor>({
    queryKey: ['/api/public/doctors', doctorId],
    enabled: !!doctorId,
  });

  const handleProceedToCheckout = () => {
    const checkoutUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
    window.location.href = checkoutUrl;
  };

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

  if (doctorLoading) {
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

  // If doctor doesn't exist, show error message
  if (!doctorLoading && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <Card className="rounded-2xl shadow-lg p-6">
              <CardContent>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Doctor Not Found</h1>
                <p className="text-gray-600 mb-8">
                  The requested doctor could not be found.
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
            <CardContent className="p-0">
              {/* Back link */}
              <button 
                onClick={() => window.location.href = `/doctor/${doctorId}`}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </button>

              {/* Title and subtitle */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Book appointment</h1>
                <p className="text-gray-600">
                  with Dr. {doctor?.user.firstName} {doctor?.user.lastName}
                </p>
              </div>

              {/* Booking Summary */}
              <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                
                <div className="space-y-3 text-sm">
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Euro className="h-4 w-4 text-gray-400 mr-2" />
                      <span>Price</span>
                    </div>
                    <span className="font-medium">€{price}</span>
                  </div>
                </div>
              </div>

              {/* Checkout button for authenticated users */}
              <div>
                <p className="text-gray-900 mb-4 font-medium">Ready to proceed with your booking</p>
                
                <Button
                  onClick={handleProceedToCheckout}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg"
                  aria-label="Proceed to secure checkout"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}