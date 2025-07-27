import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function PatientLogin() {
  const [, setLocation] = useLocation();
  const [bookingData, setBookingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // Get booking data from sessionStorage
    const savedBooking = sessionStorage.getItem('pendingBooking');
    if (savedBooking) {
      setBookingData(JSON.parse(savedBooking));
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Mock login - in real app this would call Supabase auth
      console.log('Login attempt:', data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After successful login, redirect to payment page
      setLocation('/payment');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToBooking = () => {
    setLocation('/book-appointment-choice');
  };

  const handleRegister = () => {
    setLocation('/patient-registration');
  };

  const formatSlotTime = (slot: string) => {
    return { date: '28/07/2025', time: '08:00' };
  };

  const { date, time } = bookingData ? formatSlotTime(bookingData.slot || '') : { date: '', time: '' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleBackToBooking}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to booking
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Patient Login</h1>
              <p className="text-sm text-gray-600">Sign in to complete your booking</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-lg px-4 py-8">
        {/* Booking Summary */}
        {bookingData && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-sm bg-blue-50 p-3 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  Booking with Dr. David Martin on {date} at {time}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Login Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={handleRegister}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Register
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}