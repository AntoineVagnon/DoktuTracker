import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function PaymentSuccess() {
  const [location, navigate] = useLocation();
  const [isConfirming, setIsConfirming] = useState(true);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');
    const clientSecret = urlParams.get('payment_intent_client_secret');

    console.log('Payment Success page loaded with:', { paymentIntentId, clientSecret });

    if (paymentIntentId) {
      confirmPayment(paymentIntentId);
    } else {
      setIsConfirming(false);
      toast({
        title: "Payment Confirmation Error",
        description: "No payment information found in URL",
        variant: "destructive"
      });
    }
  }, []);

  const confirmPayment = async (paymentIntentId: string) => {
    try {
      console.log('Confirming payment with ID:', paymentIntentId);

      const response = await apiRequest('POST', '/api/payment/confirm', { paymentIntentId });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Payment confirmation result:', result);

      if (result.success) {
        // Get appointment details if available
        if (result.appointmentDetails) {
          setAppointmentDetails(result.appointmentDetails);
        }
        
        // Invalidate appointments cache to refresh banner system
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
        
        toast({
          title: "Payment Successful!",
          description: "Your appointment has been confirmed.",
        });
      } else {
        throw new Error(result.error || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Payment Confirmation Error",
        description: "There was an issue confirming your payment. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isConfirming) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Confirming your payment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Your appointment has been confirmed and you will receive a confirmation email shortly.
          </CardDescription>
        </CardHeader>

        {appointmentDetails && (
          <CardContent className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Appointment Details</h3>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Dr. {appointmentDetails.doctorName}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  <span>{formatDate(appointmentDetails.slot)}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span>{formatTime(appointmentDetails.slot)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className="pt-0">
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}