import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { CheckCircle } from 'lucide-react';

export default function TestLogin() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get URL parameters for booking context - use window.location.search
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  // Check for success message in URL params and debug logging (only run once on mount)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMessage = urlParams.get('message');
    if (urlMessage) {
      setMessage(urlMessage);
    }

    // Debug logging - only once on mount
    console.log('TestLogin - URL params:', {
      fullUrl: window.location.href,
      search: window.location.search,
      doctorId,
      slot,
      price
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginResult(null);

    try {
      // Test Supabase Auth API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setLoginResult(data);
      toast({
        title: "Login Successful!",
        description: `Welcome back ${data.user?.email || 'User'}`,
      });

      // Handle redirect after successful login - use window.location for full page refresh
      // This ensures the session is properly established before navigating
      console.log('Login successful - preparing redirect:', {
        hasBookingContext: !!(doctorId && slot && price),
        doctorId,
        slot,
        price
      });
      
      setTimeout(() => {
        if (doctorId && slot && price) {
          // Redirect to checkout with booking parameters
          const checkoutUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`;
          console.log('Redirecting to checkout:', checkoutUrl);
          window.location.href = checkoutUrl;
        } else {
          // No booking context, go to dashboard
          console.log('No booking context - redirecting to dashboard');
          window.location.href = '/dashboard';
        }
      }, 500);

    } catch (error) {
      console.error('Login error:', error);
      setLoginResult({ error: error instanceof Error ? error.message : 'Login failed' });
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();
      setLoginResult({ currentUser: data });
    } catch (error) {
      setLoginResult({ error: 'Failed to fetch current user' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Welcome to Doktu
              </CardTitle>
              <p className="text-gray-600 text-center">
                Book a meeting in 2 min
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {message && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {message}
                  </AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign"}
                </Button>
              </form>
              

              {loginResult && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-medium mb-2">Result:</h3>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(loginResult, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need to create an account?{' '}
                  <a href="/create-account" className="text-blue-600 hover:underline">
                    Create Account
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}