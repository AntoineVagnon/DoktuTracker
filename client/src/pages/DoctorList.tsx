import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Star, Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Doctor = {
  id: string;
  specialty: string;
  bio: string;
  rating: number;
  reviewCount: number;
  consultationPrice: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

export default function DoctorList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('anytime');

  const { data: doctors, isLoading, error } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const filteredDoctors = doctors?.filter(doctor => {
    const matchesSearch = !searchQuery || 
      doctor.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !specialtyFilter || specialtyFilter === 'all' || doctor.specialty === specialtyFilter;
    
    return matchesSearch && matchesSpecialty;
  }) || [];

  const specialties = Array.from(new Set(doctors?.map(d => d.specialty) || []));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatDoctorName = (doctor: Doctor) => {
    if (doctor.user.firstName && doctor.user.lastName) {
      return `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;
    }
    return `Dr. ${doctor.user.email?.split('@')[0] || 'Médecin'}`;
  };

  const getNextAvailableSlots = () => {
    // Simulating next available slots - in real app this would come from API
    const slots = ['Tomorrow 08:00', 'Tomorrow 09:30'];
    return slots;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load doctors. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Find Your Perfect Doctor</h1>
                <p className="text-gray-600">Search by specialty, availability, or location</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">Log In</Button>
              <Button size="sm">Sign Up Free</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or specialty"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Anytime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Anytime</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex justify-end">
            <Button className="px-8">
              Search Doctors
            </Button>
          </div>
        </div>
      </div>

      {/* Doctor Grid */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-20 w-full mt-4" />
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Doctor Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {formatDoctorName(doctor).charAt(3)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {formatDoctorName(doctor)}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{doctor.specialty}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="font-medium">
                            {typeof doctor.rating === 'number' && !isNaN(doctor.rating) 
                              ? doctor.rating.toFixed(1)
                              : 'No rating'
                            }
                          </span>
                          <span className="text-gray-500 ml-1">
                            ({typeof doctor.reviewCount === 'number' ? doctor.reviewCount : 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {doctor.bio || `${doctor.specialty} specialist providing comprehensive medical care with expertise in clinical experience and patient-centered treatment approaches.`}
                  </p>

                  {/* Next Available Slots */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Next slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {getNextAvailableSlots().map((slot, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {slot}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Book Button */}
                  <Link href={`/doctor/${doctor.id}`}>
                    <Button className="w-full">
                      Book Consultation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredDoctors.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or browse all available doctors.</p>
          </div>
        )}
      </div>
    </div>
  );
}