import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Euro, UserPlus, LogIn } from 'lucide-react';

export default function BookAppointmentChoice() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/book/:doctorId/:slot');
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    // Get booking data from sessionStorage
    const savedBooking = sessionStorage.getItem('pendingBooking');
    if (savedBooking) {
      setBookingData(JSON.parse(savedBooking));
    } else if (params) {
      // Create booking data from URL params if not in sessionStorage
      const data = {
        doctorId: params.doctorId,
        slot: params.slot,
        price: '3.00' // Default price
      };
      setBookingData(data);
      sessionStorage.setItem('pendingBooking', JSON.stringify(data));
    }
  }, [params]);

  const handleNewPatient = () => {
    setLocation('/sign-up?booking=true');
  };

  const handleExistingPatient = () => {
    setLocation('/sign-in?booking=true');
  };

  const handleBackToProfile = () => {
    if (bookingData?.doctorId) {
      setLocation(`/doctor/${bookingData.doctorId}`);
    } else {
      setLocation('/');
    }
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading booking information...</p>
          <Button onClick={() => setLocation('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  const formatSlotTime = (slot: string) => {
    // Format the slot time for display
    const [date, time] = slot.split(' ');
    return { date: '28/07/2025', time: '08:00' }; // Mock formatting
  };

  const { date, time } = formatSlotTime(bookingData.slot || '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToProfile}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to profile
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Book appointment</h1>
              <p className="text-sm text-gray-600">with Dr. David Martin</p>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Booking Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">€{bookingData.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Choice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">Continue with your booking</CardTitle>
            <p className="text-center text-gray-600">Choose an option to proceed</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Patient Option */}
            <Button
              onClick={handleNewPatient}
              className="w-full h-auto p-6 bg-blue-500 hover:bg-blue-600"
            >
              <div className="flex items-center space-x-4">
                <UserPlus className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold text-lg">I'm a new patient</div>
                  <div className="text-sm text-blue-100">Create a new account to book this appointment</div>
                </div>
              </div>
            </Button>

            {/* Existing Patient Option */}
            <Button
              onClick={handleExistingPatient}
              variant="outline"
              className="w-full h-auto p-6 border-2"
            >
              <div className="flex items-center space-x-4">
                <LogIn className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold text-lg">I already have an account</div>
                  <div className="text-sm text-gray-600">Sign in to continue with booking</div>
                </div>
              </div>
            </Button>

            <div className="text-center text-sm text-gray-500 mt-6">
              Your information is secure and HIPAA compliant.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}