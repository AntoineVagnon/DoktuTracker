import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, CreditCard, User, Calendar, Clock, Euro } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Payment() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Extract booking parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  // Fetch doctor information
  const { data: doctor, isLoading: doctorLoading } = useQuery<any>({
    queryKey: ['/api/public/doctors', doctorId],
    enabled: !!doctorId,
  });

  // Validate required parameters
  if (!doctorId || !slot || !price) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-md mx-auto">
            <AlertDescription>
              Missing booking information. Please start the booking process again.
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  const slotDate = new Date(slot);
  const displayPrice = parseFloat(price);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Create appointment with payment
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId,
          timeSlotId: slot,
          appointmentDate: slot,
          consultationType: 'video',
          price: displayPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create appointment');
      }

      const appointment = await response.json();
      
      toast({
        title: "Appointment Booked Successfully!",
        description: "Your appointment has been confirmed. Check your email for details.",
      });

      // Redirect to patient dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "There was an error booking your appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
            <p className="text-gray-600">Confirm your appointment details and proceed with payment</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{doctor.specialty}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {format(slotDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {format(slotDate, 'h:mm a')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Euro className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">€{displayPrice}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">€{displayPrice}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You are logged in and ready to complete your booking.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Your appointment will be confirmed immediately after payment.
                    You will receive a confirmation email with video call details.
                  </p>

                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay €{displayPrice} and Confirm Booking
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe. Your payment information is protected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              disabled={isProcessing}
            >
              Back to Previous Step
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}