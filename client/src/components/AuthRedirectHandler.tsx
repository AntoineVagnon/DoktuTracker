import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function AuthRedirectHandler() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Check for stored redirects after authentication
      const authRedirect = sessionStorage.getItem('auth_redirect');
      const bookingRedirect = sessionStorage.getItem('booking_redirect');
      
      if (bookingRedirect) {
        // Booking flow - redirect to payment
        sessionStorage.removeItem('booking_redirect');
        window.location.href = bookingRedirect;
        return;
      }
      
      if (authRedirect) {
        // General auth flow - redirect to stored location
        sessionStorage.removeItem('auth_redirect');
        window.location.href = authRedirect;
        return;
      }
      
      // Role-based default redirect for authenticated users
      if (user.role === 'doctor') {
        window.location.href = '/doctor-dashboard';
      } else if (user.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else {
        // Default to patient dashboard
        window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Not authenticated, redirect to home
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}