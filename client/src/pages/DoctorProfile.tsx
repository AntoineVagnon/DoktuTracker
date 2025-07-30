import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Star, Calendar, MapPin } from "lucide-react";
import { formatUserFullName, getUserInitials } from "@/lib/nameUtils";
import { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
import { format } from "date-fns";

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
  const { doctorId } = useParams();
  
  // Initialize availability sync for real-time updates
  useAvailabilitySync();
  
  // Fetch doctor details
  const { data: doctor, isLoading: doctorLoading } = useQuery<Doctor>({
    queryKey: ["/api/doctors", doctorId],
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${doctorId}`);
      if (!response.ok) throw new Error('Failed to fetch doctor');
      return response.json();
    },
    refetchInterval: 30000, // Real-time sync every 30 seconds
  });

  // Fetch real-time availability
  const { data: timeSlots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/time-slots", doctorId],
    queryFn: async () => {
      const response = await fetch(`/api/doctors/${doctorId}/slots`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000, // Real-time sync every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  if (doctorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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

  // Filter and sort available slots
  const availableSlots = timeSlots?.filter(slot => slot.isAvailable) || [];
  const upcomingSlots = availableSlots
    .filter(slot => new Date(`${slot.date}T${slot.startTime}`) > new Date())
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
    .slice(0, 6); // Show next 6 available slots

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Doctor Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{doctorName}</h1>
                <p className="text-lg text-gray-600 mb-3">{doctor.specialty}</p>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <div className="flex text-yellow-400 mr-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(parseFloat(doctor.rating)) ? "fill-current" : ""
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {doctor.rating} ({doctor.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    €{doctor.consultationPrice} per consultation
                  </Badge>
                </div>
                
                {doctor.bio && (
                  <p className="text-gray-700">{doctor.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Slots - Real-time Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Available Appointments
              {slotsLoading && (
                <Clock className="h-4 w-4 ml-2 animate-spin text-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSlots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(`${slot.date}T${slot.startTime}`), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(`${slot.date}T${slot.startTime}`), 'h:mm a')} - {format(new Date(`${slot.date}T${slot.endTime}`), 'h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Available
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No availability</h3>
                <p className="text-gray-600">
                  {slotsLoading ? "Loading availability..." : "This doctor has no available appointment slots at the moment."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}