import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import PaymentModal from "@/components/PaymentModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, User, CreditCard } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";

export default function Checkout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Get booking parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation(`/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`);
    }
  }, [user, doctorId, slot, price, setLocation]);

  // Fetch doctor details
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["/api/doctors", doctorId],
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${doctorId}`);
      if (!response.ok) throw new Error('Failed to fetch doctor');
      return response.json();
    },
    enabled: !!doctorId,
  });

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setLocation('/dashboard');
  };

  const handleBackToProfile = () => {
    setLocation(`/doctor/${doctorId}`);
  };

  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (!doctorId || !slot || !price) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking Request</h1>
            <p className="text-gray-600 mb-6">Missing booking information. Please start over.</p>
            <Button onClick={() => setLocation('/')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Doctor Not Found</h1>
            <p className="text-gray-600 mb-6">The requested doctor could not be found.</p>
            <Button onClick={() => setLocation('/')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // Parse appointment details
  const appointmentDate = slot ? new Date(slot) : new Date();
  const appointmentDetails = {
    id: '', // Will be created during payment process
    doctorId: doctorId, // Pass the actual doctor ID
    timeSlotId: slot, // Pass the actual time slot datetime
    doctorName: doctor.user ? `${doctor.user.title || 'Dr.'} ${doctor.user.firstName} ${doctor.user.lastName}` : 'Doctor',
    specialty: doctor.specialty,
    date: appointmentDate.toISOString().split('T')[0],
    time: appointmentDate.toTimeString().slice(0, 5),
    price: parseFloat(price),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBackToProfile}
            className="mb-6 p-0 h-auto font-normal text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to doctor profile
          </Button>

          {/* Checkout Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
            <p className="text-gray-600">Review your appointment details and proceed with payment</p>
          </div>

          {/* Appointment Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Appointment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Doctor Info */}
              <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{appointmentDetails.doctorName}</h3>
                  <p className="text-sm text-gray-600">{appointmentDetails.specialty}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">
                      {appointmentDate ? format(appointmentDate, 'EEEE, MMMM d, yyyy') : 'Invalid date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium">
                      {appointmentDate ? format(appointmentDate, 'HH:mm') : 'Invalid time'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration & Price */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">30 minutes</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">€{appointmentDetails.price.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Your payment is secured by Stripe. Your appointment will be confirmed immediately after successful payment.
              </p>
              
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
              >
                Pay €{appointmentDetails.price.toFixed(2)} • 30-min consultation
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Secure payment powered by Stripe. Your card information is never stored.
              </p>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>🔒 All payments are processed securely. Your data is protected.</p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        appointmentDetails={appointmentDetails}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}