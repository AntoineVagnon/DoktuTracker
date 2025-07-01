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
    window.location.href = `/login-book?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          
          {/* Compact Booking Summary - Only show if we have booking parameters */}
          {doctorId && slot && price && (
            <div className="text-center mb-12">
              <div className="inline-block bg-gray-50 border rounded-lg p-4 mb-8">
                <h2 className="text-sm font-medium text-gray-600 mb-2">Booking Summary</h2>
                <div className="flex items-center space-x-6 text-sm">
                  <span><strong>Date:</strong> {format(new Date(slot), 'dd/MM/yyyy')}</span>
                  <span><strong>Time:</strong> {format(new Date(slot), 'HH:mm')}</span>
                  <span><strong>Price:</strong> €{price}</span>
                </div>
              </div>
            </div>
          )}

          {/* Patient Choice Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            
            {/* New Patient Card */}
            <Card className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center pt-8 pb-4 px-8">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <UserPlus className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-3">
                  New Patient
                </CardTitle>
                <p className="text-gray-600 text-sm leading-relaxed">
                  First time using Doktu? Create your patient account to book your consultation.
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={handleNewPatient}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                  aria-label="Sign up as new patient to book consultation"
                >
                  Sign Up as New Patient
                </Button>
              </CardContent>
            </Card>

            {/* Returning Patient Card */}
            <Card className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="text-center pt-8 pb-4 px-8">
                <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
                  <LogIn className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-3">
                  Returning Patient
                </CardTitle>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Already have a Doktu account? Sign in to continue booking.
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={handleReturningPatient}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
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