import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Star, Clock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import DoctorCard from '@/components/DoctorCard';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';

// Helper function to translate French specialties to English
const translateSpecialty = (specialty: string): string => {
  const translations: { [key: string]: string } = {
    'Médecine Générale': 'General Medicine',
    'Pédiatrie': 'Pediatrics',
    'Dermatologie': 'Dermatology',
    'Cardiologie': 'Cardiology',
    'Psychologie': 'Psychology',
    'Psychiatrie': 'Psychiatry',
    'Gynécologie': 'Gynecology',
    'Orthopédie': 'Orthopedics',
    'Ophtalmologie': 'Ophthalmology',
    'ORL': 'ENT (Ear, Nose, Throat)',
    'Neurologie': 'Neurology',
    'Endocrinologie': 'Endocrinology',
    'Gastro-entérologie': 'Gastroenterology',
    'Pneumologie': 'Pulmonology',
    'Rhumatologie': 'Rheumatology',
    'Urologie': 'Urology',
    'Néphrologie': 'Nephrology',
    'Hématologie': 'Hematology',
    'Oncologie': 'Oncology',
    'Radiologie': 'Radiology'
  };
  
  return translations[specialty] || specialty;
};

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
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    role?: string;
  };
};

export default function DoctorList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('anytime');
  const { user, isAuthenticated } = useAuth();
  
  // Force refresh auth state on mount
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, []);

  const { data: doctors, isLoading, error } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const filteredDoctors = doctors?.filter(doctor => {
    const matchesSearch = !searchQuery || 
      doctor.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !specialtyFilter || specialtyFilter === 'all' || doctor.specialty === specialtyFilter;
    
    return matchesSearch && matchesSpecialty;
  }) || [];

  const specialties = Array.from(new Set(doctors?.map(d => d.specialty) || []));



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
      <Header />
      
      {/* Page Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Find Your Perfect Doctor</h1>
            <p className="text-gray-600">Search by specialty, availability, or location</p>
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
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onBookClick={(doctorId) => {
                  window.location.href = `/doctor/${doctorId}`;
                }}
              />
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