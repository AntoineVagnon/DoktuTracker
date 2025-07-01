import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, LogIn, Calendar, Clock, Euro } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AuthChoice() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  
  // Extract booking parameters
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

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

  const handleNewPatient = () => {
    navigate(`/register-form?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`);
  };

  const handleReturningPatient = () => {
    navigate(`/login-form?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Booking Summary */}
          {doctorId && slot && price && (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Complete Your Booking
              </h1>
              <div className="bg-white rounded-lg shadow-sm border p-4 inline-block">
                <div className="flex items-center space-x-6 text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{date}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">{time}</span>
                  </div>
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 mr-2" />
                    <span className="text-sm">€{price}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Patient Choice Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            
            {/* New Patient Card */}
            <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <UserPlus className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  New Patient
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  First time using Doktu? Create your patient account to book your consultation.
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={handleNewPatient}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                >
                  Sign Up as New Patient
                </Button>
              </CardContent>
            </Card>

            {/* Returning Patient Card */}
            <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center p-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <LogIn className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Returning Patient
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Already have a Doktu account? Sign in to continue booking.
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button
                  onClick={handleReturningPatient}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
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