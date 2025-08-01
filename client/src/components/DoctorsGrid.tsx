
import useSWR from "swr";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Star, Clock } from "lucide-react";
import { SkeletonCard } from "./SkeletonCard";
import { Link } from "wouter";
import { AvailabilityDisplay } from "./AvailabilityDisplay";

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  avatarUrl: string | null;
  avgRating: number | null;
  nextAvailableSlots: string[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch doctors");
  }
  return response.json();
};

export function DoctorsGrid() {
  const { data: doctors, error, isLoading } = useSWR<Doctor[]>(
    "/api/doctors", 
    fetcher,
    {
      refreshInterval: 0, // Disable auto-refresh to reduce API calls
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // Cache for 10 minutes
    }
  );

  // Log errors for observability
  if (error) {
    console.error("DoctorsGrid fetch error:", error);
  }

  // Log warning if doctors array is empty
  if (doctors && doctors.length === 0) {
    console.warn("doctors-grid empty");
  }

  const formatSlotTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderSkeletons = () => {
    return Array.from({ length: 10 }, (_, i) => (
      <SkeletonCard key={`skeleton-${i}`} />
    ));
  };

  const renderDoctorCard = (doctor: Doctor) => (
    <Link key={doctor.id} href={`/doctor/${doctor.id}`}>
      <Card 
        className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm hover:shadow-xl doctor-card"
        role="button"
        tabIndex={0}
        aria-label={`View Dr ${doctor.lastName} profile`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            {/* Avatar */}
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={doctor.avatarUrl || undefined} 
                alt={`Photo of Dr. ${doctor.lastName}`}
              />
              <AvatarFallback className="text-lg font-semibold">
                {doctor.firstName[0]}{doctor.lastName[0]}
              </AvatarFallback>
            </Avatar>
            
            {/* Name */}
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Dr. {doctor.firstName} {doctor.lastName}
              </h3>
              <p className="text-sm text-gray-600">{doctor.specialty}</p>
            </div>
            
            {/* Rating */}
            <div className="flex items-center space-x-1">
              {typeof doctor.avgRating === 'number' && !isNaN(doctor.avgRating) ? (
                <>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{doctor.avgRating.toFixed(1)}</span>
                </>
              ) : (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  New
                </Badge>
              )}
            </div>
            
            {/* Availability - Using real-time data */}
            <AvailabilityDisplay doctorId={doctor.id} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  // Always render the section with either doctor cards or skeletons
  return (
    <section id="doctors-grid" data-testid="doctors-grid" className="py-16 bg-white" role="grid">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Hand-Picked Medical Team
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Meet our carefully selected healthcare professionals, ready to provide you with expert medical care.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {isLoading || error || !doctors || doctors.length === 0 ? (
            renderSkeletons()
          ) : (
            doctors.slice(0, 10).map(renderDoctorCard)
          )}
        </div>
      </div>
    </section>
  );
}
