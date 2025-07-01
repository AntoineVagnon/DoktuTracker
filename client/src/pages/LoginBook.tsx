import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoginBook() {
  const { toast } = useToast();
  // Use window.location.search to get query params reliably
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract booking parameters
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Prepare booking data with fallbacks - handle null/undefined gracefully
  const slotDate = slot && slot !== 'null' && slot !== 'undefined' ? new Date(slot) : null;
  const displayPrice = price && price !== 'null' && price !== 'undefined' ? price : '0';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBack = () => {
    window.location.href = `/auth-choice?doctorId=${doctorId}&slot=${slot}&price=${price}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Direct redirect to Replit Auth with booking parameters
      // The server will store these in session and redirect to /payment after auth
      const authUrl = `/api/login?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Booking Summary Panel */}
            <div className="order-2 lg:order-1">
              <div className="booking-summary border rounded-lg p-4 mb-6 max-w-sm">
                <h2 className="text-lg font-medium mb-2">Booking Summary</h2>
                <p className="flex justify-between">
                  <span>Date:</span>
                  <span>
                    {slotDate
                      ? format(slotDate, 'dd/MM/yyyy')
                      : '—'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Time:</span>
                  <span>
                    {slotDate
                      ? format(slotDate, 'HH:mm')
                      : '—'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Price:</span>
                  <span>€{displayPrice}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Your appointment will be confirmed after payment
                </p>
              </div>
            </div>

            {/* Login Form */}
            <div className="order-1 lg:order-2">
              <Card className="rounded-2xl shadow-lg p-6">
                <CardHeader className="p-0 mb-6">
                  <button 
                    onClick={handleBack}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to patient choice
                  </button>
                  
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Sign In to Your Account
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Welcome back! Sign in to continue with your booking
                  </p>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Password
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          className="mt-1"
                          placeholder="Enter your password"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing In..." : "Sign In & Continue to Booking"}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => window.location.href = `/register-form?doctorId=${doctorId}&slot=${slot}&price=${price}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Create one here
                        </button>
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}