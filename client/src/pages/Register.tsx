import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Euro } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Register() {
  const [location] = useLocation();
  
  // Use window.location.search directly to get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract booking parameters directly
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');
  const slotId = urlParams.get('slotId'); // Get the slot ID to preserve the hold
  const redirect = urlParams.get('redirect'); // Get the redirect parameter for membership flow
  
  console.log('Register page loaded with location:', location);
  console.log('Window URL search:', window.location.search);
  console.log('Full window URL:', window.location.href);
  console.log('Parsed booking params:', { doctorId, slot, price });

  const handleCreateAccount = () => {
    console.log('Create Account button clicked');
    console.log('Booking params:', { doctorId, slot, price });
    console.log('Redirect param:', redirect);
    
    // Handle redirect parameter (for membership flow)
    if (redirect) {
      sessionStorage.setItem('loginRedirect', redirect);
      console.log('Stored loginRedirect:', redirect);
    }
    // If we have booking parameters, create checkout callback URL
    else if (doctorId && slot && price) {
      const callbackUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}${slotId ? `&slotId=${slotId}` : ''}`;
      sessionStorage.setItem('loginRedirect', callbackUrl);
      console.log('Stored loginRedirect:', callbackUrl);
    } else {
      // No booking parameters, go to dashboard after auth
      sessionStorage.setItem('loginRedirect', '/dashboard');
      console.log('Stored loginRedirect: /dashboard');
    }
    
    // Redirect to a signup form - include redirect parameter if present
    let signupUrl = '/create-account?';
    if (redirect) {
      signupUrl += `redirect=${encodeURIComponent(redirect)}`;
    } else if (doctorId && slot && price) {
      signupUrl += `doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}${slotId ? `&slotId=${slotId}` : ''}`;
    }
    console.log('Redirecting to:', signupUrl);
    window.location.href = signupUrl;
  };

  const openAuthModal = () => {
    console.log('Sign in button clicked');
    console.log('Booking params:', { doctorId, slot, price });
    
    // Redirect to proper login form with booking parameters
    const loginUrl = `/test-login?${doctorId && slot && price ? `doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}` : ''}`;
    console.log('Redirecting to login:', loginUrl);
    window.location.href = loginUrl;
  };

  // Format booking details for display
  const formatSlotDateTime = (slotString: string) => {
    if (!slotString) return { date: '', time: '' };
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
  };

  const { date, time } = formatSlotDateTime(slot || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Booking Summary Card - only show if we have booking parameters */}
          {doctorId && slot && price && (
            <Card className="rounded-2xl shadow-lg p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-3" />
                    <span className="text-sm">{date}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-3" />
                    <span className="text-sm">{time}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Euro className="h-4 w-4 mr-3" />
                    <span className="text-sm">€{price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Form Card */}
          <Card className="rounded-2xl shadow-lg p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Create your account
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Join Doktu to book your consultation
              </p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Button
                    onClick={handleCreateAccount}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg"
                  >
                    Create Account & Continue
                  </Button>
                  
                  <div className="text-center">
                    <button
                      onClick={openAuthModal}
                      className="text-gray-600 hover:text-gray-900 text-sm border border-gray-300 hover:bg-gray-50 w-full py-3 rounded-lg"
                    >
                      Already have an account? Sign in instead
                    </button>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                  <p>
                    By creating an account, you agree to our{" "}
                    <a href="#" className="text-blue-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 hover:underline">
                      Privacy Policy
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