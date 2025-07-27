import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, User, CreditCard } from 'lucide-react';

export default function Payment() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Get booking data from URL or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const doctorId = urlParams.get('doctorId');
    const slot = urlParams.get('slot');
    const price = urlParams.get('price');

    if (doctorId && slot && price) {
      setBookingData({ doctorId, slot, price });
    } else {
      // Try to get from sessionStorage
      const savedBooking = sessionStorage.getItem('pendingBooking');
      if (savedBooking) {
        setBookingData(JSON.parse(savedBooking));
      } else {
        // No booking data found, redirect back
        setLocation('/doctors');
      }
    }
  }, [setLocation]);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Mock payment processing
      console.log('Processing payment:', bookingData);
      
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear pending booking data
      sessionStorage.removeItem('pendingBooking');
      
      // Redirect to dashboard with success message
      setLocation('/dashboard?booking=success');
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (bookingData?.doctorId) {
      setLocation(`/doctor/${bookingData.doctorId}`);
    } else {
      setLocation('/doctors');
    }
  };

  const formatSlotTime = (slot: string) => {
    if (!slot) return { date: '', time: '' };
    const [date, time] = slot.split('T');
    return {
      date: new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: time?.substring(0, 5) || ''
    };
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const { date, time } = formatSlotTime(bookingData.slot);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Payment</h1>
              <p className="text-sm text-gray-600">Complete your booking</p>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Booking Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Booking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Doctor</span>
                </div>
                <span className="font-medium">Dr. David Martin</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Date</span>
                </div>
                <span className="font-medium">{date}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Time</span>
                </div>
                <span className="font-medium">{time}</span>
              </div>
              
              <hr className="my-4" />
              
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-blue-600">€{bookingData.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Secure Payment:</strong> Your payment information is encrypted and processed securely.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                </div>
              </div>
              
              <Button
                onClick={handlePayment}
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing Payment...' : `Pay €${bookingData.price}`}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                By completing this payment, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}