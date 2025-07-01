import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MapPin, 
  Award, 
  Languages, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Calendar,
  ArrowLeft,
  Heart,
  Shield,
  Stethoscope,
  AlertTriangle as Alert
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { format } from "date-fns";

interface Doctor {
  id: string;
  specialty: string;
  avg_rating: number;
  review_count: number;
  avatar_url?: string;
  location: string;
  rpps_number?: string;
  consultation_price: string;
  is_online: boolean;
  user: {
    firstName: string;
    lastName: string;
    bio: string;
  };
  education: string;
  experience: string;
  languages: string[];
  availability: string[];
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function DoctorProfile() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: doctor, isLoading: doctorLoading, error: doctorError } = useQuery<Doctor>({
    queryKey: [`/api/public/doctors/${id}`],
    enabled: !!id,
  });



  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/doctors/${id}/reviews`],
    enabled: !!id,
  });

  const lockSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      await apiRequest("POST", `/api/time-slots/${slotId}/lock`);
    },
    onSuccess: (_, slotId) => {
      // Store booking context
      sessionStorage.setItem("bookingContext", JSON.stringify({
        doctorId: id,
        slotId,
        timestamp: Date.now(),
      }));
      
      // Navigate to booking page
      window.location.href = `/book/${id}`;
    },
    onError: (error) => {
      toast({
        title: "Booking Error",
        description: "Failed to reserve this time slot. Please try another slot.",
        variant: "destructive",
      });
    },
  });

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white rounded-xl p-8 space-y-6">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="space-y-3 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Doctor Not Found</h1>
              <p className="text-gray-600 mb-6">The doctor profile you're looking for doesn't exist.</p>
              <Button asChild>
                <a href="/">Back to Home</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const doctorName = `Dr. ${doctor?.user?.firstName || ''} ${doctor?.user?.lastName || ''}`;
  const initials = `${doctor?.user?.firstName?.[0] || ''}${doctor?.user?.lastName?.[0] || ''}`.toUpperCase();



  const handleSlotClick = (slot: TimeSlot) => {
    const slotTime = `${slot.date}T${slot.startTime}:00Z`;
    const price = doctor?.consultation_price || '35.00';
    
    if (isAuthenticated) {
      // User is already logged in, go directly to checkout
      const checkoutUrl = `/checkout?doctorId=${id}&slot=${encodeURIComponent(slotTime)}&price=${price}`;
      window.location.href = checkoutUrl;
    } else {
      // User not logged in, go to booking page for auth flow
      const bookingUrl = `/book?doctorId=${id}&slot=${encodeURIComponent(slotTime)}&price=${price}`;
      window.location.href = bookingUrl;
    }
  };



  const areas = [
    { label: "General consultations", icon: Stethoscope },
    { label: "Chronic care", icon: Heart },
    { label: "Prevention", icon: Shield },
    { label: "Telemedicine", icon: Clock },
    { label: "Minor emergencies", icon: Alert },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <a href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to doctors
          </a>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Doctor Header */}
            <Card className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] text-white">
              <CardContent className="p-8">
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24 border-4 border-white/20">
                    <AvatarImage src={doctor?.avatar_url || ''} alt={doctorName} />
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{doctorName}</h1>
                    <p className="text-blue-100 text-lg mb-3">{doctor?.specialty || ''}</p>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="flex text-yellow-300">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(doctor?.avg_rating || 0) ? "fill-current" : ""
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-blue-100">
                          {doctor?.avg_rating || 0} ({doctor?.review_count || 0} reviews)
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-blue-100">{doctor?.location || 'Paris, France'}</span>
                      </div>
                      
                      <Badge className="bg-white/20 text-white border-white/20">
                        RPPS {doctor?.rpps_number || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Tabs defaultValue="about" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                {/* About Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-gray-600 leading-relaxed">
                      {doctor?.user?.bio || "No biography available."}
                    </p>

                    <Separator />

                    {/* Education and Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <GraduationCap className="h-5 w-5 mr-2" />
                          Education and experience
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li>• Doctor of Medicine - Université Paris Descartes</li>
                          <li>• Specialized Studies Diploma in Psychiatry</li>
                          <li>• 15+ years of clinical experience</li>
                          <li>• Continuing education in telemedicine</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <Award className="h-5 w-5 mr-2" />
                          Areas of expertise
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {areas.map((area, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {area.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Languages */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Languages className="h-5 w-5 mr-2" />
                        Languages spoken
                      </h3>
                      <div className="flex space-x-4">
                        <Badge className="bg-blue-100 text-blue-800">🇫🇷 French (Native)</Badge>
                        <Badge className="bg-blue-100 text-blue-800">🇬🇧 English (Fluent)</Badge>
                        <Badge className="bg-blue-100 text-blue-800">🇪🇸 Spanish (Intermediate)</Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Medical Approach */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Medical approach</h3>
                      <p className="text-gray-600 leading-relaxed">
                        I favor human and accessible medicine, taking the time to listen to each patient. My approach combines scientific rigor and kindness to provide personalized care adapted to your specific needs.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No reviews yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map((review: any) => (
                          <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback>
                                  {review.patient.firstName?.[0]}{review.patient.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="font-medium text-gray-900">
                                    {review.patient.firstName} {review.patient.lastName?.[0]}.
                                  </h4>
                                  <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < review.rating ? "fill-current" : ""
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                                  </span>
                                </div>
                                <p className="text-gray-600">{review.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faq">
                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">What are Dr. Martin's office hours?</h4>
                      <p className="text-gray-600">I offer consultations Monday through Friday from 9:00 AM to 6:00 PM, and Saturday mornings from 9:00 AM to 1:00 PM.</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Does Dr. Martin accept new patients?</h4>
                      <p className="text-gray-600">Yes, I welcome new patients and strive to offer appointments within a reasonable timeframe.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-[hsl(207,100%,52%)]">
                    €{doctor?.consultation_price || '35'}
                  </CardTitle>
                  <p className="text-sm text-gray-600">30 min consultation</p>
                </CardHeader>
              </Card>
              
              {/* New Availability Calendar */}
              {doctor?.availability && doctor.availability.length > 0 ? (
                <AvailabilityCalendar 
                  doctorId={id!} 
                  availableSlots={doctor.availability.map((timestamp: string) => ({
                    id: timestamp,
                    date: timestamp.split('T')[0],
                    startTime: timestamp.split('T')[1].split(':').slice(0, 2).join(':'),
                    endTime: '', // Will be calculated in the component
                    isAvailable: true
                  }))}
                  onSlotSelect={handleSlotClick}
                />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No availability found for this doctor</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
