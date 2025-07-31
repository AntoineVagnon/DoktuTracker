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
    // Only redirect to home if there's no valid user session and no loading state
    // Avoid aggressive redirects that can interrupt navigation
    console.log('AuthRedirectHandler: User not authenticated, checking if redirect is needed');
    
    // Don't redirect if we're already on an auth-related page
    const currentPath = window.location.pathname;
    const authPages = ['/', '/login', '/register', '/auth', '/password-reset'];
    const isOnAuthPage = authPages.some(page => currentPath.startsWith(page));
    
    if (!isOnAuthPage) {
      console.log('AuthRedirectHandler: Redirecting to home from', currentPath);
      setTimeout(() => {
        window.location.href = '/';
      }, 100); // Small delay to prevent interrupting navigation
    }
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