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
  Stethoscope
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format, addDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface Doctor {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  specialty: string;
  bio: string;
  education: string;
  experience: string;
  languages: string[];
  rppsNumber: string;
  consultationPrice: string;
  rating: string;
  reviewCount: number;
  isOnline: boolean;
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: [`/api/doctors/${id}`],
    enabled: !!id,
  });

  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: [`/api/doctors/${id}/time-slots`, format(selectedDate, "yyyy-MM-dd")],
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

  if (!doctor) {
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

  const doctorName = `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;
  const initials = `${doctor.user.firstName[0]}${doctor.user.lastName[0]}`.toUpperCase();

  const currentWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  }).slice(0, 7);

  const getAvailableSlotsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return timeSlots.filter((slot: TimeSlot) => 
      slot.date === dateStr && slot.isAvailable
    );
  };

  const handleSlotClick = (slotId: string) => {
    if (!isAuthenticated) {
      // Store booking context for unauthenticated users
      sessionStorage.setItem("bookingContext", JSON.stringify({
        doctorId: id,
        slotId,
        timestamp: Date.now(),
      }));
      window.location.href = "/api/login";
      return;
    }

    lockSlotMutation.mutate(slotId);
  };

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
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
                    <AvatarImage src={doctor.user.profileImageUrl} alt={doctorName} />
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{doctorName}</h1>
                    <p className="text-blue-100 text-lg mb-3">{doctor.specialty}</p>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="flex text-yellow-300">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(parseFloat(doctor.rating)) ? "fill-current" : ""
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-blue-100">
                          {doctor.rating} ({doctor.reviewCount} reviews)
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-blue-100">Paris, France</span>
                      </div>
                      
                      <Badge className="bg-white/20 text-white border-white/20">
                        RPPS {doctor.rppsNumber}
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
                      {doctor.bio || "Psychiatrist specialised in cognitive behavioral therapy and anxiety management. Over 15 years of clinical experience helping patients overcome mental health challenges through evidence-based treatment approaches."}
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
            <Card className="sticky top-8">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-[hsl(207,100%,52%)]">
                  €{doctor.consultationPrice}
                </CardTitle>
                <p className="text-sm text-gray-600">30 min consultation</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreviousWeek}
                    disabled={weekOffset <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <h3 className="font-medium">
                    Week of {format(currentWeekStart, "MMM d")}
                  </h3>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Calendar */}
                <div className="space-y-4">
                  {weekDays.map((day) => {
                    const availableSlots = getAvailableSlotsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isPast = day < new Date() && !isToday;
                    
                    return (
                      <div key={day.toISOString()} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`font-medium ${isToday ? "text-[hsl(207,100%,52%)]" : "text-gray-900"}`}>
                            {format(day, "EEE")}
                          </div>
                          <div className={`text-sm ${isToday ? "text-[hsl(207,100%,52%)]" : "text-gray-600"}`}>
                            {format(day, "d")}
                          </div>
                        </div>
                        
                        {isPast ? (
                          <div className="text-xs text-gray-400">Past date</div>
                        ) : availableSlots.length === 0 ? (
                          <div className="text-xs text-gray-500">No slots available</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {availableSlots.slice(0, 6).map((slot: TimeSlot) => (
                              <Button
                                key={slot.id}
                                size="sm"
                                variant="outline"
                                className="text-xs hover:bg-[hsl(207,100%,52%)] hover:text-white hover:border-[hsl(207,100%,52%)]"
                                onClick={() => handleSlotClick(slot.id)}
                                disabled={lockSlotMutation.isPending}
                              >
                                {slot.startTime.slice(0, 5)}
                              </Button>
                            ))}
                            {availableSlots.length > 6 && (
                              <div className="text-xs text-gray-500 col-span-2 text-center">
                                +{availableSlots.length - 6} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer Note */}
                <div className="text-xs text-gray-500 text-center">
                  Times in German time (GMT+1). Dr. David Martin practices according to Dr. David Martin policies.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
