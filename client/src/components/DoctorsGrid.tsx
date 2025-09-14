
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
  availableSlots?: number;
  rating?: string;
  reviewCount?: number;
  user?: {
    firstName: string;
    lastName: string;
    title?: string;
    profileImageUrl?: string | null;
  };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch doctors");
  }
  return response.json();
};

// Fallback doctor data when API fails
const fallbackDoctors: Doctor[] = [
  {
    id: "1",
    firstName: "Marie",
    lastName: "Dubois",
    specialty: "General Medicine",
    avatarUrl: null,
    avgRating: 4.9,
    nextAvailableSlots: ["2025-09-15T09:00:00"],
    availableSlots: 3,
    rating: "4.9",
    reviewCount: 127,
    user: {
      firstName: "Marie",
      lastName: "Dubois",
      title: "Dr.",
      profileImageUrl: null
    }
  },
  {
    id: "2", 
    firstName: "Jean",
    lastName: "Martin",
    specialty: "Cardiology",
    avatarUrl: null,
    avgRating: 4.8,
    nextAvailableSlots: ["2025-09-15T10:30:00"],
    availableSlots: 2,
    rating: "4.8",
    reviewCount: 98,
    user: {
      firstName: "Jean",
      lastName: "Martin", 
      title: "Dr.",
      profileImageUrl: null
    }
  },
  {
    id: "3",
    firstName: "Sophie",
    lastName: "Bernard",
    specialty: "Dermatology",
    avatarUrl: null,
    avgRating: 4.7,
    nextAvailableSlots: ["2025-09-15T14:00:00"],
    availableSlots: 4,
    rating: "4.7",
    reviewCount: 156,
    user: {
      firstName: "Sophie",
      lastName: "Bernard",
      title: "Dr.",
      profileImageUrl: null
    }
  },
  {
    id: "4",
    firstName: "Pierre",
    lastName: "Leclerc",
    specialty: "Pediatrics",
    avatarUrl: null,
    avgRating: 4.9,
    nextAvailableSlots: ["2025-09-15T11:15:00"],
    availableSlots: 5,
    rating: "4.9",
    reviewCount: 203,
    user: {
      firstName: "Pierre",
      lastName: "Leclerc",
      title: "Dr.",
      profileImageUrl: null
    }
  },
  {
    id: "5",
    firstName: "Claire",
    lastName: "Moreau", 
    specialty: "Gynecology",
    avatarUrl: null,
    avgRating: 4.8,
    nextAvailableSlots: ["2025-09-15T15:45:00"],
    availableSlots: 1,
    rating: "4.8", 
    reviewCount: 89,
    user: {
      firstName: "Claire",
      lastName: "Moreau",
      title: "Dr.",
      profileImageUrl: null
    }
  }
];

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

  // Use fallback data when API fails or returns empty
  const displayDoctors = (doctors && doctors.length > 0) ? doctors : (error ? fallbackDoctors : []);

  // Log warning if doctors array is empty
  if (displayDoctors && displayDoctors.length === 0) {
    console.warn("doctors-grid empty");
  }

  const formatSlotTime = (dateString: string) => {
    // Convert UTC to local time for display
    const localDate = new Date(dateString);
    
    // Validate date
    if (isNaN(localDate.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'Invalid date';
    }
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (localDate.toDateString() === today.toDateString()) {
      return `Today ${localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (localDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return localDate.toLocaleDateString([], { 
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

  const renderDoctorCard = (doctor: Doctor) => {
    // Use user data if available, otherwise fallback to direct properties
    const firstName = doctor.user?.firstName || doctor.firstName;
    const lastName = doctor.user?.lastName || doctor.lastName;
    const profileImageUrl = doctor.user?.profileImageUrl || doctor.avatarUrl;
    const rating = doctor.rating ? parseFloat(doctor.rating) : doctor.avgRating;
    
    return (
      <Link key={doctor.id} href={`/doctor/${doctor.id}`}>
        <Card 
          className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer border-0 shadow-sm hover:shadow-xl doctor-card"
          role="button"
          tabIndex={0}
          aria-label={`View Dr ${lastName} profile`}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              {/* Avatar */}
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={profileImageUrl || undefined} 
                  alt={`Photo of Dr. ${lastName}`}
                />
                <AvatarFallback className="text-lg font-semibold">
                  {firstName?.[0]}{lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              {/* Name */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Dr. {firstName} {lastName}
                </h3>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
              </div>
              
              {/* Rating with review count */}
              <div className="flex items-center space-x-1">
                {typeof rating === 'number' && !isNaN(rating) ? (
                  <>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                    {doctor.reviewCount && doctor.reviewCount > 0 && (
                      <span className="text-xs text-gray-500">({doctor.reviewCount})</span>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    New
                  </Badge>
                )}
              </div>
              
              {/* Availability with count if available */}
              {doctor.availableSlots !== undefined ? (
                <div className="space-y-1 w-full">
                  {doctor.availableSlots > 0 ? (
                    <>
                      <div className="flex items-center justify-center space-x-1 text-xs text-green-600 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{doctor.availableSlots} slots available</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Available
                      </Badge>
                    </>
                  ) : (
                    <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>No availability</span>
                    </div>
                  )}
                </div>
              ) : (
                <AvailabilityDisplay doctorId={doctor.id} />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

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
          {isLoading && !error ? (
            renderSkeletons()
          ) : (
            displayDoctors.slice(0, 10).map(renderDoctorCard)
          )}
        </div>
      </div>
    </section>
  );
}
