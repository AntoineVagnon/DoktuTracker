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

export default function RegisterForm() {
  // No need for navigate since we're using window.location for simplicity
  const [location] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  
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

  // Prepare booking data with fallbacks
  const slotDate = slot ? new Date(slot) : null;
  const displayPrice = price ?? '0';

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
      // For now, use Replit Auth directly since we're using OIDC
      // Store the checkout URL for post-auth redirect
      const checkoutUrl = `/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot || '')}&price=${price}`;
      sessionStorage.setItem('loginRedirect', checkoutUrl);
      
      // Redirect to Replit Auth
      window.location.href = "/api/login";
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Please try again or contact support.",
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

            {/* Registration Form */}
            <div className="order-1 lg:order-2">
              <Card className="rounded-2xl shadow-lg p-6">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Create Your Account
                  </CardTitle>
                  <p className="text-gray-600 mt-2">
                    Join Doktu to book your consultation
                  </p>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="space-y-6">
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                    >
                      {isLoading ? "Creating Account..." : "Create Account & Continue"}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={() => window.location.href = '/api/login'}
                        className="text-gray-600 hover:text-gray-900 text-sm border border-gray-300 hover:bg-gray-50 w-full py-3 rounded-lg"
                      >
                        Already have an account? Sign in instead
                      </button>
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
                  </div>
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