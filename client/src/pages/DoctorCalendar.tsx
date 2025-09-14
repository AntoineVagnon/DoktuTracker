import React from "react";
import GoogleStyleCalendar from "@/components/GoogleStyleCalendar";
import DoctorLayout from "@/components/DoctorLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function DoctorCalendar() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect unauthenticated users to home page
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('DoctorCalendar: Unauthenticated access blocked, redirecting to home');
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Redirect non-doctors to appropriate dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'patient') {
        setLocation('/dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (user.role !== 'doctor') {
        setLocation('/');
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DoctorLayout>
    );
  }

  // Block access for unauthenticated users
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Block access for non-doctors
  if (user?.role !== 'doctor') {
    return null; // Will redirect via useEffect
  }
  
  return (
    <DoctorLayout>
      <GoogleStyleCalendar doctorId="10" />
    </DoctorLayout>
  );
}