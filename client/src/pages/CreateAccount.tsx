import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

export default function CreateAccount() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Use window.location.search directly to get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Extract booking parameters if present
  const doctorId = urlParams.get('doctorId');
  const slot = urlParams.get('slot');
  const price = urlParams.get('price');
  const redirect = urlParams.get('redirect'); // Get redirect parameter for membership flow
  
  console.log('CreateAccount page loaded with booking params:', { doctorId, slot, price });
  console.log('CreateAccount redirect param:', redirect);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTermsChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreeToTerms: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    // Validate required fields
    if (!formData.firstName || formData.firstName.length < 2) {
      toast({
        title: "Invalid Name",
        description: "First name must be at least 2 characters",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!formData.lastName || formData.lastName.length < 2) {
      toast({
        title: "Invalid Name", 
        description: "Last name must be at least 2 characters",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate platform conditions acceptance
    if (!formData.agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the platform conditions to proceed",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Create account with Supabase Auth API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'patient'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setResult(data);
      toast({
        title: "Account Created!",
        description: `Account created successfully for ${data.user?.email || formData.email}`,
      });

      // Handle redirect after successful registration
      console.log('Registration successful, session data:', data.session);
      
      if (data.session) {
        // User is immediately signed in (no email confirmation required)
        toast({
          title: "Registration Complete!",
          description: redirect ? "Redirecting to complete membership..." : "Redirecting to checkout...",
        });
        
        setTimeout(() => {
          if (redirect) {
            // Redirect to membership flow or other specified redirect
            console.log('Redirecting to:', redirect);
            setLocation(redirect);
          } else if (doctorId && slot && price) {
            // Redirect to checkout with booking parameters
            console.log('Redirecting to checkout with booking params');
            setLocation(`/checkout?doctorId=${doctorId}&slot=${encodeURIComponent(slot)}&price=${price}`);
          } else {
            // No booking context, go to dashboard
            console.log('Redirecting to dashboard');
            setLocation('/dashboard');
          }
        }, 1500);
      } else {
        // Email confirmation required - show message to user
        console.log('Email confirmation required');
        toast({
          title: "Check Your Email",
          description: "Please check your email and click the confirmation link to complete your registration.",
        });
      }

    } catch (error) {
      console.error('Registration error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Registration failed' });
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
                Create Supabase Account
              </CardTitle>
              <p className="text-gray-600 text-center">
                Create your account in the Supabase Auth system
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>

                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={handleTermsChange}
                    className="mt-1"
                  />
                  <div className="space-y-1 leading-none">
                    <Label 
                      htmlFor="agreeToTerms"
                      className="text-sm cursor-pointer"
                    >
                      I agree to the{' '}
                      <a 
                        href="/terms" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500 underline"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a 
                        href="/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-500 underline"
                      >
                        Privacy Policy
                      </a>
                    </Label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              {result && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-medium mb-2">Result:</h3>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <a href="/test-login" className="text-blue-600 hover:underline">
                    Sign In
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