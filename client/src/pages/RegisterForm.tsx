import { useState, useEffect } from "react";
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

export default function RegisterForm() {
  const { toast } = useToast();
  // Use window.location.search to get query params reliably
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract booking parameters
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);

  // Fetch doctor information if booking parameters exist
  useEffect(() => {
    if (doctorId) {
      fetch(`/api/doctors/${doctorId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => setDoctor(data))
        .catch(err => console.error('Error fetching doctor:', err));
    }
  }, [doctorId]);

  // Prepare booking data with fallbacks - handle null/undefined gracefully
  const getSlotDate = () => {
    if (!slot || slot === 'null' || slot === 'undefined') return null;
    
    // Try to parse as full datetime first (YYYY-MM-DDTHH:mm format)
    try {
      const date = new Date(slot);
      if (!isNaN(date.getTime())) return date;
    } catch {}
    
    // If slot looks like just a time (HH:mm or HH:mm:ss), create a date for today as fallback
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(slot)) {
      const today = new Date();
      const timeParts = slot.split(':');
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      const seconds = timeParts[2] ? parseInt(timeParts[2]) : 0;
      today.setHours(hours, minutes, seconds, 0);
      return today;
    }
    
    return null;
  };
  
  const slotDate = getSlotDate();
  const displayPrice = price && price !== 'null' && price !== 'undefined' ? price : '0';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Redirect directly to authentication with booking parameters
      window.location.href = `/api/login?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;

    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please try again or contact support.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = `/auth-choice?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Booking Summary Panel */}
            <div className="order-2 lg:order-1">
              <div className="booking-summary border rounded-lg p-4 mb-6 max-w-sm">
                <h2 className="text-lg font-medium mb-2">Booking Summary</h2>
                
                {doctor && (
                  <p className="flex justify-between mb-2">
                    <span>Doctor:</span>
                    <span>Dr. {doctor.user?.firstName} {doctor.user?.lastName}</span>
                  </p>
                )}
                
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
                      : slot || '—'}
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

            {/* Registration Form */}
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
                    Create Your Account
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Join Doktu to book your consultation
                  </p>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1"
                        required
                        minLength={8}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Must be at least 8 characters long
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                    >
                      {isLoading ? "Creating Account..." : "Create Account & Continue to Payment"}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => window.location.href = `/login-book?doctorId=${doctorId}&slot=${slot}&price=${price}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>

                    <div className="text-center text-sm text-gray-500">
                      <p>
                        By creating an account, you agree to our{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </a>
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