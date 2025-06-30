import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, CreditCard, User, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface AppointmentBookingProps {
  doctor: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      profileImageUrl?: string;
    };
    specialty: string;
    consultationPrice: string;
  };
  timeSlot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AppointmentBooking({ 
  doctor, 
  timeSlot, 
  onSuccess, 
  onCancel 
}: AppointmentBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // Create appointment
      const appointmentDate = new Date(`${timeSlot.date}T${timeSlot.startTime}`);
      const appointmentResponse = await apiRequest("POST", "/api/appointments", {
        doctorId: doctor.id,
        slotId: timeSlot.id,
        appointmentDate: appointmentDate.toISOString(),
        price: doctor.consultationPrice,
        status: "pending",
      });
      
      const appointment = await appointmentResponse.json();
      
      // Create payment intent
      const paymentResponse = await apiRequest("POST", "/api/create-payment-intent", {
        amount: parseFloat(doctor.consultationPrice),
        appointmentId: appointment.id,
      });
      
      const { clientSecret } = await paymentResponse.json();
      
      return { appointment, clientSecret };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Created",
        description: "Your appointment has been created successfully. Proceeding to payment...",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Booking Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleConfirmBooking = () => {
    createAppointmentMutation.mutate();
  };

  const doctorName = `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;
  const initials = `${doctor.user.firstName[0]}${doctor.user.lastName[0]}`.toUpperCase();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Confirm Your Appointment</CardTitle>
        <p className="text-gray-600">Review your booking details before confirming</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Doctor Information */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <Avatar className="w-16 h-16">
            <AvatarImage src={doctor.user.profileImageUrl} alt={doctorName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{doctorName}</h3>
            <p className="text-gray-600">{doctor.specialty}</p>
            <Badge variant="secondary" className="mt-1">Verified Doctor</Badge>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Date</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(timeSlot.date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Time</p>
                <p className="text-sm text-gray-600">
                  {timeSlot.startTime.slice(0, 5)} - {timeSlot.endTime.slice(0, 5)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 border rounded-lg">
            <User className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium text-gray-900">Consultation Type</p>
              <p className="text-sm text-gray-600">30-minute video consultation</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Video Consultation (30 min)</span>
            <span className="font-medium">€{doctor.consultationPrice}</span>
          </div>
          <div className="border-t border-blue-200 pt-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">€{doctor.consultationPrice}</span>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> You can reschedule or cancel this appointment up to 1 hour before the scheduled time. 
            A video link will be provided 5 minutes before your appointment.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleConfirmBooking}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm & Pay €{doctor.consultationPrice}
              </>
            )}
          </Button>
        </div>

        {/* Security Note */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t">
          <CreditCard className="h-4 w-4 inline mr-1" />
          Your payment is secured by Stripe and your data is GDPR compliant
        </div>
      </CardContent>
    </Card>
  );
}
