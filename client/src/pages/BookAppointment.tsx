import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Euro, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

interface Doctor {
  id: string;
  specialty: string;
  avg_rating: number;
  review_count: number;
  avatar_url: string;
  location: string;
  consultation_price: string;
  user: {
    firstName: string;
    lastName: string;
    bio: string;
  };
}

export default function BookAppointment() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');

  const { data: doctor, isLoading: doctorLoading } = useQuery<Doctor>({
    queryKey: ['/api/public/doctors', doctorId],
    enabled: !!doctorId,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = `/booking?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}`;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [isAuthenticated, isLoading, doctorId, slot]);

  const handleBookAppointment = () => {
    // This would integrate with your booking flow
    console.log('Booking appointment:', { doctorId, slot, patient: user });
    // You could trigger a mutation here to create the appointment
  };

  const formatSlotTime = (slotString: string) => {
    try {
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
    } catch {
      return { date: 'Invalid date', time: 'Invalid time' };
    }
  };

  if (isLoading || doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!doctorId || !slot || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Booking Request</h1>
            <p className="text-gray-600 mb-8">
              The booking information is incomplete or invalid.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const slotTime = formatSlotTime(slot);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
            <p className="text-gray-600 mt-2">Confirm your consultation details</p>
          </div>

          <div className="space-y-6">
            {/* Doctor Information */}
            <Card>
              <CardHeader>
                <CardTitle>Doctor Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <img
                    src={doctor.avatar_url}
                    alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Dr. {doctor.user.firstName} {doctor.user.lastName}
                    </h3>
                    <Badge variant="secondary" className="mb-2">
                      {doctor.specialty}
                    </Badge>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">{doctor.avg_rating}</span>
                        <span className="ml-1">({doctor.review_count} reviews)</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {doctor.location}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{slotTime.date}</p>
                    <p className="text-sm text-gray-600">Consultation date</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{slotTime.time}</p>
                    <p className="text-sm text-gray-600">30-minute video consultation</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Euro className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">€{doctor.consultation_price}</p>
                    <p className="text-sm text-gray-600">Consultation fee</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Booking Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Before your consultation:</strong> You'll receive a confirmation email 
                      with video call instructions and preparation guidelines.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Total: €{doctor.consultation_price}
                      </p>
                      <p className="text-sm text-gray-600">
                        Payment processed securely via Stripe
                      </p>
                    </div>
                    <Button 
                      size="lg" 
                      onClick={handleBookAppointment}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Confirm & Pay
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}