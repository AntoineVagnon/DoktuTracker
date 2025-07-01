import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, LogIn } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AuthChoice() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  
  // Extract booking parameters
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  const handleNewPatient = () => {
    window.location.href = `/register-form?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
  };

  const handleReturningPatient = () => {
    window.location.href = `/login-form?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          
          {/* Compact Booking Summary */}
          {doctorId && slot && price && (
            <div className="booking-summary border rounded-lg p-4 mb-8 bg-white">
              <h2 className="text-lg font-semibold mb-2">Booking Summary</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Date:</span><span>{format(new Date(slot), 'dd/MM/yyyy')}</span>
                <span>Time:</span><span>{format(new Date(slot), 'HH:mm')}</span>
                <span>Price:</span><span>€{price}</span>
              </div>
            </div>
          )}

          {/* Patient Choice Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* New Patient Card */}
            <Card className="rounded-lg shadow-lg hover:shadow-xl transition-shadow border-blue-200">
              <CardHeader className="text-center p-6">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  New Patient
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">
                  First time using Doktu? Create your patient account to book your consultation.
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button
                  onClick={handleNewPatient}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg"
                  aria-label="Sign up as new patient to book consultation"
                >
                  Sign Up as New Patient
                </Button>
              </CardContent>
            </Card>

            {/* Returning Patient Card */}
            <Card className="rounded-lg shadow-lg hover:shadow-xl transition-shadow border-green-200">
              <CardHeader className="text-center p-6">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <LogIn className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Returning Patient
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">
                  Already have a Doktu account? Sign in to continue booking.
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Button
                  onClick={handleReturningPatient}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg"
                  aria-label="Sign in to existing account to book consultation"
                >
                  Sign In to Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}