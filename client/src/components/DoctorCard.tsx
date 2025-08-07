import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatUserFullName, getUserInitials } from "@/lib/nameUtils";
import { useNextAvailableSlot } from "@/hooks/useNextAvailableSlot";
import { format } from "date-fns";
import { convertSlotTimeToLocal } from "@/lib/dateUtils";
import { analytics } from "@/lib/analytics";

// Import doctor profile images
import doctorPhoto1 from "@assets/generated_images/Male_doctor_professional_headshot_cea73805.png";
import doctorPhoto2 from "@assets/generated_images/Female_doctor_professional_headshot_6aeb3693.png";
import doctorPhoto3 from "@assets/generated_images/Medical_specialist_doctor_headshot_97855c74.png";
import doctorPhoto4 from "@assets/generated_images/Female_medical_specialist_headshot_8ccb39fa.png";
import doctorPhoto5 from "@assets/generated_images/Young_male_doctor_headshot_b7940384.png";
import doctorPhoto6 from "@assets/generated_images/Senior_male_doctor_headshot_141d1840.png";

interface Doctor {
  id: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    role?: string;
  } | null;
  specialty: string;
  rating: string;
  reviewCount: number;
  consultationPrice: string;
  isOnline?: boolean;
}

interface DoctorCardProps {
  doctor: Doctor;
  availableSlots?: string[];
  onBookClick?: (doctorId: string) => void;
}

export default function DoctorCard({ doctor, availableSlots = [], onBookClick }: DoctorCardProps) {
  // Use structured name functions for proper display
  const doctorName = doctor.user ? formatUserFullName({ ...doctor.user, role: 'doctor' }) : 'Unknown Doctor';
  const initials = doctor.user ? getUserInitials(doctor.user) : 'DR';
  
  // Get real-time next available slot
  const { nextSlot, hasAvailability, isLoading } = useNextAvailableSlot(doctor.id);
  
  // Array of doctor profile photos
  const doctorPhotos = [
    doctorPhoto1, doctorPhoto2, doctorPhoto3, 
    doctorPhoto4, doctorPhoto5, doctorPhoto6
  ];
  
  // Get a consistent photo for each doctor based on their ID
  const doctorPhotoIndex = parseInt(String(doctor.id).slice(-1), 16) % doctorPhotos.length;
  const doctorPhoto = doctorPhotos[doctorPhotoIndex];
  
  const gradientColors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-green-500 to-green-600",
    "from-red-500 to-red-600",
    "from-indigo-500 to-indigo-600",
    "from-yellow-500 to-yellow-600",
    "from-pink-500 to-pink-600",
  ];
  
  const gradientClass = gradientColors[parseInt(String(doctor.id).slice(-1), 16) % gradientColors.length];

  const handleBookClick = () => {
    analytics.trackDiscovery('doctor_card_clicked', { 
      doctorId: doctor.id,
      specialty: doctor.specialty,
      hasAvailability
    });
    analytics.trackBookingFunnel('doctor_selected', parseInt(doctor.id), {
      source: 'doctor_card',
      specialty: doctor.specialty
    });
    if (onBookClick) {
      onBookClick(doctor.id);
    } else {
      // Default behavior: redirect to doctor profile
      window.location.href = `/doctor/${doctor.id}`;
    }
  };

  return (
    <Card className="group hover:shadow-doctor-card transition-all duration-200 border-gray-200 hover:border-[hsl(207,100%,52%)]/30">
      <CardContent className="p-6">
        <div className="text-center">
          {/* Avatar */}
          <div className="mx-auto mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={doctorPhoto} 
                alt={`Dr. ${doctorName}`}
                className="object-cover"
              />
              <AvatarFallback className={`bg-gradient-to-br ${gradientClass} text-white font-bold text-xl`}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Doctor Info */}
          <h3 className="font-semibold text-gray-900 mb-1">{doctorName}</h3>
          <p className="text-sm text-gray-600 mb-3">{doctor.specialty}</p>

          {/* Rating */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex text-yellow-400 text-sm">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(parseFloat(doctor.rating)) ? "fill-current" : ""
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {doctor.rating} ({doctor.reviewCount})
            </span>
          </div>



          {/* Real-time Availability Badge */}
          <div className="flex items-center justify-center mb-3">
            {!isLoading && hasAvailability && nextSlot ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                <Clock className="h-3 w-3 mr-1" />
                Next: {format(new Date(`${nextSlot.date}T00:00:00`), 'MMM d')}, {convertSlotTimeToLocal(nextSlot.date, nextSlot.startTime)}
              </Badge>
            ) : !isLoading ? (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                No availability
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                <Clock className="h-3 w-3 mr-1 animate-spin" />
                Loading...
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="mb-4">
            <span className="text-lg font-bold text-gray-900">€{doctor.consultationPrice}</span>
            <span className="text-sm text-gray-500 ml-1">/ consultation</span>
          </div>

          {/* Book Button */}
          <div className="space-y-2">
            <Button
              onClick={handleBookClick}
              className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] hover:shadow-md transition-all duration-200"
            >
              Book Now
            </Button>
            
            <Button variant="ghost" size="sm" asChild className="w-full text-xs">
              <Link href={`/doctor/${doctor.id}`}>View Full Profile</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
