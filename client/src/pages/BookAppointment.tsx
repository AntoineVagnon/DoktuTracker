import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Clock, Calendar, CreditCard, CheckCircle, User, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { format } from "date-fns";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface BookingContext {
  doctorId: string;
  slotId: string;
  timestamp: number;
}

function CheckoutForm({ 
  appointmentData, 
  onSuccess 
}: { 
  appointmentData: any; 
  onSuccess: () => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard",
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Your appointment has been confirmed!",
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? "Processing..." : `Pay €${appointmentData.price}`}
      </Button>
    </form>
  );
}

export default function BookAppointment() {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [step, setStep] = useState<"loading" | "auth" | "booking" | "payment" | "success">("loading");

  const { data: doctor } = useQuery({
    queryKey: [`/api/doctors/${id}`],
    enabled: !!id,
  });

  const { data: timeSlot } = useQuery({
    queryKey: [`/api/time-slots/${bookingContext?.slotId}`],
    enabled: !!bookingContext?.slotId,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: async (appointment) => {
      // Create payment intent
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: parseFloat(appointment.price),
          appointmentId: appointment.id,
        });
        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);
        setStep("payment");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Booking Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Check for booking context
    const stored = sessionStorage.getItem("bookingContext");
    if (stored) {
      try {
        const context = JSON.parse(stored);
        // Check if context is still valid (15 minutes)
        if (Date.now() - context.timestamp < 15 * 60 * 1000) {
          setBookingContext(context);
          
          if (authLoading) {
            setStep("loading");
          } else if (!isAuthenticated) {
            setStep("auth");
          } else {
            setStep("booking");
          }
        } else {
          sessionStorage.removeItem("bookingContext");
          toast({
            title: "Session Expired",
            description: "Your booking session has expired. Please select a new time slot.",
            variant: "destructive",
          });
        }
      } catch (error) {
        sessionStorage.removeItem("bookingContext");
      }
    } else {
      setStep("auth");
    }
  }, [authLoading, isAuthenticated, toast]);

  const handleCreateAccount = () => {
    // Store current context and redirect to login
    if (bookingContext) {
      sessionStorage.setItem("bookingContext", JSON.stringify(bookingContext));
    }
    window.location.href = "/api/login";
  };

  const handleExistingAccount = () => {
    // Store current context and redirect to login
    if (bookingContext) {
      sessionStorage.setItem("bookingContext", JSON.stringify(bookingContext));
    }
    window.location.href = "/api/login";
  };

  const handleConfirmBooking = () => {
    if (!bookingContext || !doctor || !timeSlot) return;

    const appointmentDate = new Date(`${timeSlot.date}T${timeSlot.startTime}`);
    
    createAppointmentMutation.mutate({
      doctorId: bookingContext.doctorId,
      slotId: bookingContext.slotId,
      appointmentDate: appointmentDate.toISOString(),
      price: doctor.consultationPrice,
      status: "pending",
    });
  };

  const handlePaymentSuccess = () => {
    sessionStorage.removeItem("bookingContext");
    setStep("success");
    
    // Redirect to dashboard after a delay
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 3000);
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <Card>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "auth") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" className="mb-6" asChild>
              <a href={`/doctor/${id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </a>
            </Button>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Book appointment</CardTitle>
                {doctor && (
                  <p className="text-gray-600">with Dr. {doctor.user.firstName} {doctor.user.lastName}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {doctor && timeSlot && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{format(new Date(timeSlot.date), "dd/MM/yyyy")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{timeSlot.startTime.slice(0, 5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>€{doctor.consultationPrice}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center space-y-4">
                  <h3 className="text-lg font-medium">Continue with your booking</h3>
                  <p className="text-gray-600">Choose an option to proceed</p>
                </div>

                <div className="space-y-4">
                  <Button 
                    className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                    onClick={handleCreateAccount}
                  >
                    <User className="h-4 w-4 mr-2" />
                    I'm a new patient - Create a new account to book this appointment
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleExistingAccount}
                  >
                    <User className="h-4 w-4 mr-2" />
                    I already have an account - Sign in to continue with booking
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-500">
                  Your information is secure and HIPAA compliant.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "booking") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" className="mb-6" asChild>
              <a href={`/doctor/${id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </a>
            </Button>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Confirm your appointment</CardTitle>
                {doctor && (
                  <p className="text-gray-600">with Dr. {doctor.user.firstName} {doctor.user.lastName}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {doctor && timeSlot && (
                  <>
                    {/* Doctor Info */}
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={doctor.user.profileImageUrl} />
                        <AvatarFallback>
                          {doctor.user.firstName[0]}{doctor.user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">Dr. {doctor.user.firstName} {doctor.user.lastName}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Appointment Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{format(new Date(timeSlot.date), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{timeSlot.startTime.slice(0, 5)} - {timeSlot.endTime.slice(0, 5)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Pricing */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Consultation (30 min)</span>
                        <span>€{doctor.consultationPrice}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total</span>
                        <span>€{doctor.consultationPrice}</span>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You can reschedule or cancel this appointment up to 1 hour before the scheduled time.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                      onClick={handleConfirmBooking}
                      disabled={createAppointmentMutation.isPending}
                    >
                      {createAppointmentMutation.isPending ? "Creating appointment..." : "Proceed to Payment"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment" && clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Complete your payment</CardTitle>
                <p className="text-gray-600">Secure payment processing</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {doctor && timeSlot && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium">Appointment Summary</span>
                      <Badge>€{doctor.consultationPrice}</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Doctor:</span>
                        <span>Dr. {doctor.user.firstName} {doctor.user.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{format(new Date(timeSlot.date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{timeSlot.startTime.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    appointmentData={{ price: doctor?.consultationPrice }}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>

                <div className="text-center text-xs text-gray-500">
                  <CreditCard className="h-4 w-4 inline mr-1" />
                  Your payment is secured by Stripe and encrypted
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Appointment Confirmed!
                </h1>
                <p className="text-gray-600 mb-6">
                  Your appointment has been successfully booked. You will receive a confirmation email shortly.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium mb-2">What's next?</h3>
                  <ul className="text-sm text-gray-600 text-left space-y-1">
                    <li>• Check your email for appointment details</li>
                    <li>• Join the video call 5 minutes before your appointment</li>
                    <li>• Prepare any questions you'd like to discuss</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/dashboard">Go to My Dashboard</a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/">Back to Home</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
