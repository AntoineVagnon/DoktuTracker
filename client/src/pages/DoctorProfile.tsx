import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Star, Calendar, MapPin, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { formatUserFullName, getUserInitials } from "@/lib/nameUtils";
import { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import { analytics } from "@/lib/analytics";
import { convertSlotTimeToLocal } from "@/lib/dateUtils";
import { BannerSystem } from "@/components/BannerSystem";

// Helper function to translate French specialties to English
function translateSpecialty(specialty: string): string {
  const translations: Record<string, string> = {
    'Médecine Générale': 'General Medicine',
    'Pédiatrie': 'Pediatrics',
    'Cardiologie': 'Cardiology',
    'Dermatologie': 'Dermatology',
    'Gynécologie': 'Gynecology',
    'Psychiatrie': 'Psychiatry',
    'Ophtalmologie': 'Ophthalmology',
    'Orthopédie': 'Orthopedics',
    'Radiologie': 'Radiology',
    'Neurologie': 'Neurology'
  };
  
  return translations[specialty] || specialty;
}

interface Doctor {
  id: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
  } | null;
  specialty: string;
  rating: string;
  reviewCount: number;
  consultationPrice: string;
  bio?: string;
  education?: string;
  experience?: string;
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function DoctorProfile() {
  const params = useParams();
  const doctorId = params.id;
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [isNewBookingInProgress, setIsNewBookingInProgress] = useState(false);
  
  console.log('DoctorProfile - Raw params:', params);
  console.log('DoctorProfile - Doctor ID:', doctorId);
  
  // Track doctor profile view
  useEffect(() => {
    if (doctorId) {
      analytics.trackPageView(`doctor_profile/${doctorId}`);
      analytics.trackDiscovery('doctor_profile_viewed', { 
        doctorId,
        source: 'direct'
      });
    }
  }, [doctorId]);
  
  // Initialize availability sync for real-time updates
  useAvailabilitySync();
  
  // Ensure doctorId is valid before making API calls
  const isValidDoctorId = Boolean(doctorId && doctorId.trim() && !isNaN(Number(doctorId)));
  
  // Fetch doctor details
  const { data: doctor, isLoading: doctorLoading, error: doctorError } = useQuery<Doctor>({
    queryKey: [`/api/doctors/${doctorId}`],
    enabled: isValidDoctorId, // Only run query if we have a valid doctor ID
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch availability (only when needed)
  const { data: timeSlots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/doctors/${doctorId}/slots`],
    enabled: isValidDoctorId, // Only run query if we have a valid doctor ID
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  // Auto-navigate to first available future date when slots are loaded
  useEffect(() => {
    if (timeSlots && timeSlots.length > 0) {
      const now = new Date();
      const leadTimeMinutes = 60;
      
      // Filter future slots with 60-minute lead time (same logic as in the component)
      const futureSlots = timeSlots.filter((slot: TimeSlot) => {
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
        const diffMinutes = (slotDateTime.getTime() - now.getTime()) / (1000 * 60);
        return diffMinutes >= leadTimeMinutes && slot.isAvailable;
      }).sort((a: TimeSlot, b: TimeSlot) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      
      if (futureSlots.length > 0) {
        const firstFutureSlot = futureSlots[0];
        const firstFutureDate = new Date(firstFutureSlot.date);
        
        // Check if current selected date has any future slots
        const selectedDateHasFutureSlots = futureSlots.some(slot => 
          isSameDay(new Date(slot.date), selectedDate)
        );
        
        // Only navigate if current selected date has no future slots
        if (!selectedDateHasFutureSlots) {
          setSelectedDate(firstFutureDate);
          // Also update week start to include this date
          const newWeekStart = startOfWeek(firstFutureDate, { weekStartsOn: 1 });
          setWeekStart(newWeekStart);
        }
      }
    }
  }, [timeSlots]); // Only depend on timeSlots, not selectedDate to avoid loops

  // Show debug info for invalid doctor ID
  if (!isValidDoctorId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Invalid Doctor ID</h2>
          <p className="text-gray-600">Doctor ID: {doctorId || 'undefined'}</p>
          <p className="text-gray-600">Params: {JSON.stringify(params)}</p>
          <p className="text-gray-600">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (doctorError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Error Loading Doctor</h2>
          <p className="text-gray-600">Error: {doctorError.message}</p>
          <p className="text-gray-600">Doctor ID: {doctorId}</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Doctor not found</h2>
          <p className="text-gray-600">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const doctorName = doctor.user ? formatUserFullName({ ...doctor.user, role: 'doctor' }) : 'Unknown Doctor';
  const initials = doctor.user ? getUserInitials(doctor.user) : 'DR';
  
  // Get user initials for header avatar
  const userInitials = user ? getUserInitials(user) : 'U';

  // Filter and sort available slots for the selected date
  const availableSlots = timeSlots?.filter((slot: TimeSlot) => slot.isAvailable) || [];
  
  // Helper function to filter past slots with 60-minute lead time
  const filterFutureSlots = (slots: TimeSlot[]) => {
    const now = new Date();
    const leadTimeMinutes = 60;
    
    return slots.filter((slot: TimeSlot) => {
      const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
      const diffMinutes = (slotDateTime.getTime() - now.getTime()) / (1000 * 60);
      
      // Only show slots that are at least 60 minutes in the future
      return diffMinutes >= leadTimeMinutes;
    });
  };
  
  // Get all future available slots sorted by date and time
  const allFutureSlots = filterFutureSlots(availableSlots).sort((a: TimeSlot, b: TimeSlot) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
  
  // Get the next available slot
  const nextSlot = allFutureSlots[0];
  
  const selectedDateSlots = filterFutureSlots(
    availableSlots.filter((slot: TimeSlot) => 
      isSameDay(new Date(slot.date), selectedDate)
    )
  ).sort((a: TimeSlot, b: TimeSlot) => a.startTime.localeCompare(b.startTime));

  // Generate week days for the week picker
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Check which days have availability (excluding past/too-soon slots)
  const daysWithSlots = new Set(
    filterFutureSlots(availableSlots).map((slot: TimeSlot) => slot.date)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use the exact same Header component as homepage */}
      <Header />
      
      {/* Back to doctors link */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to doctors
          </Link>
        </div>
      </div>

      {/* Priority Banner System for logged users - Hide during new booking */}
      {user && !isNewBookingInProgress && (
        <div className="bg-white px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <BannerSystem />
          </div>
        </div>
      )}

      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-white/20 text-white font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-bold mb-2">{doctorName}</h1>
              <p className="text-xl text-blue-100 mb-3">{translateSpecialty(doctor.specialty)}</p>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>Paris, France</span>
                </div>
                
                <div className="flex items-center">
                  {doctor.reviewCount > 0 ? (
                    <>
                      <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                      <span>{doctor.rating} ({doctor.reviewCount} reviews)</span>
                    </>
                  ) : (
                    <span>No ratings yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - About (66% on desktop) */}
          <div className="lg:col-span-2 space-y-8">
            {/* About section */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {doctor.bio || "Specialist focused on providing excellent patient care with years of experience in medical practice. Committed to delivering personalized treatment approaches tailored to each patient's unique needs."}
                </p>
              </CardContent>
            </Card>

            {/* Education and Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Education and Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                    <span>Doctor of Medicine - Medical University</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                    <span>Specialized certification in {translateSpecialty(doctor.specialty)}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                    <span>Licensed medical practitioner</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
                    <span>Continuing education in telemedicine</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Areas of expertise */}
            <Card>
              <CardHeader>
                <CardTitle>Areas of Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">General consultations</Badge>
                  <Badge variant="secondary">Preventive care</Badge>
                  <Badge variant="secondary">Chronic conditions</Badge>
                  <Badge variant="secondary">Telemedicine</Badge>
                  <Badge variant="secondary">Patient education</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Languages Spoken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center">🇬🇧 English (Native)</span>
                  <span className="flex items-center">🇫🇷 French (Fluent)</span>
                  <span className="flex items-center">🇪🇸 Spanish (Conversational)</span>
                </div>
              </CardContent>
            </Card>

            {/* Medical approach */}
            <Card>
              <CardHeader>
                <CardTitle>Medical Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  I believe in providing compassionate, evidence-based medical care. My approach focuses on listening to patients, understanding their concerns, and working together to develop the best treatment plan for their individual needs.
                </p>
              </CardContent>
            </Card>

            {/* Doctor ID Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{doctorName}</p>
                    <p className="text-sm text-gray-600">{translateSpecialty(doctor.specialty)}</p>
                    <p className="text-sm text-gray-500">Medical ID: DOC-{doctor.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="hours">
                    <AccordionTrigger>What are Dr. {doctor.user?.firstName || "Doctor"}'s office hours?</AccordionTrigger>
                    <AccordionContent>
                      Available consultation times are shown in real-time in the booking calendar. Appointment availability may vary based on schedule and demand.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="new-patients">
                    <AccordionTrigger>Does Dr. {doctor.user?.firstName || "Doctor"} accept new patients?</AccordionTrigger>
                    <AccordionContent>
                      Yes, new patients are welcome. You can book your consultation directly through our online platform by selecting an available time slot.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Sticky Available slots card (33% on desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Available slots</CardTitle>
                  <div className="text-center">
                    <Badge variant="outline" className="text-lg font-semibold text-blue-600">
                      €{parseFloat(doctor.consultationPrice).toFixed(2)} - 30 min consultation
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Week navigation */}
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Week of {format(weekStart, 'MMM d')}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Day pills */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day, index) => {
                      const isSelected = isSameDay(day, selectedDate);
                      const hasSlots = daysWithSlots.has(format(day, 'yyyy-MM-dd'));
                      const dayNum = format(day, 'd');
                      const dayName = format(day, 'EEE');
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day)}
                          className={`p-2 text-xs rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : hasSlots 
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={!hasSlots}
                        >
                          <div className="text-center">
                            <div className="font-medium">{dayName}</div>
                            <div>{dayNum}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected day header */}
                  <div className="text-center pt-2">
                    <h3 className="font-medium">Today {format(selectedDate, 'dd MMM')}</h3>
                    <p className="text-xs text-gray-500">{selectedDateSlots.length} available slots</p>
                    <p className="text-xs text-gray-400">Times in Central European Time (GMT+1)</p>
                  </div>

                  {/* Time slots for selected day */}
                  <div className="space-y-2">
                    {selectedDateSlots.length > 0 ? (
                      selectedDateSlots.map((slot: TimeSlot) => (
                        <Button
                          key={slot.id}
                          variant="outline"
                          className="w-full justify-center"
                          onClick={async () => {
                            // Hide banner when starting new booking flow
                            setIsNewBookingInProgress(true);
                            
                            // Handle slot booking - include both date and time
                            const fullSlotDateTime = `${slot.date}T${slot.startTime}`;
                            console.log('Slot clicked:', { doctorId, slot: fullSlotDateTime, price: doctor.consultationPrice });
                            
                            try {
                              // Hold the slot for 15 minutes before redirecting to auth
                              // Construct full API URL to ensure we hit the backend (Railway), not frontend (Vercel)
                              const apiUrl = import.meta.env.VITE_API_URL ||
                                (import.meta.env.PROD ? 'https://web-production-b2ce.up.railway.app' : '');
                              const holdUrl = apiUrl ? `${apiUrl}/api/slots/hold` : '/api/slots/hold';

                              const response = await fetch(holdUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include', // Ensure cookies are sent
                                body: JSON.stringify({
                                  slotId: slot.id,
                                  sessionId: undefined // Let server use session ID
                                })
                              });
                              
                              if (response.ok) {
                                const holdData = await response.json();
                                console.log('Slot held successfully:', holdData);

                                // Store the slot ID in sessionStorage as backup
                                sessionStorage.setItem('heldSlotId', slot.id);
                                sessionStorage.setItem('heldSlotExpiry', holdData.expiresAt);

                                // Check authentication - use both useAuth hook and localStorage
                                const hasLocalStorageAuth = !!localStorage.getItem('doktu_auth');
                                const isAuthenticated = user || hasLocalStorageAuth;

                                console.log('Auth check:', { user: !!user, hasLocalStorageAuth, isAuthenticated });

                                // Slot successfully held - redirect based on authentication status
                                if (isAuthenticated) {
                                  // User is authenticated - go directly to checkout
                                  const checkoutUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(fullSlotDateTime)}&price=${doctor.consultationPrice}&slotId=${slot.id}`;
                                  console.log('Slot held successfully, user authenticated, redirecting to checkout:', checkoutUrl);
                                  window.location.href = checkoutUrl;
                                } else {
                                  // User not authenticated - go to register page
                                  const registerUrl = `/register?doctorId=${doctorId}&slot=${encodeURIComponent(fullSlotDateTime)}&price=${doctor.consultationPrice}&slotId=${slot.id}`;
                                  console.log('Slot held successfully, user not authenticated, redirecting to register:', registerUrl);
                                  window.location.href = registerUrl;
                                }
                              } else {
                                // Slot couldn't be held (probably taken by another user)
                                const error = await response.json();
                                setIsNewBookingInProgress(false); // Reset if error
                                alert(error.error || 'This slot is no longer available. Please select another time.');
                                window.location.reload(); // Refresh to show updated availability
                              }
                            } catch (error) {
                              console.error('Failed to hold slot:', error);
                              setIsNewBookingInProgress(false); // Reset if error
                              alert('Unable to reserve this slot. Please try again.');
                            }
                          }}
                        >
                          {format(new Date(`2000-01-01T${slot.startTime}`), 'HH:mm')}
                        </Button>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No slots available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}