import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Register() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectParam = urlParams.get('redirect');
  
  const redirectUrl = redirectParam 
    ? decodeURIComponent(redirectParam) 
    : '/dashboard';

  const handleCreateAccount = () => {
    // Store redirect URL and proceed with Replit Auth registration
    if (redirectParam && redirectUrl !== '/dashboard') {
      sessionStorage.setItem('loginRedirect', redirectUrl);
    }
    window.location.href = "/api/login";
  };

  const handleBackToLogin = () => {
    // Go back to login page with redirect parameter
    const loginUrl = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login';
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="rounded-2xl shadow-lg p-6">
            <CardHeader className="p-0 mb-6">
              <button 
                onClick={handleBackToLogin}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login options
              </button>
              
              <CardTitle className="text-2xl font-bold text-gray-900">
                Create your account
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Join Doktu to book your first consultation
              </p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Quick registration:</strong> We'll create your secure account 
                    using Replit Auth. You'll be able to book appointments and access 
                    your medical history immediately.
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleCreateAccount}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg"
                    aria-label="Create new patient account with secure authentication"
                  >
                    Create Account & Continue
                  </Button>
                  
                  <Button
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="border border-gray-300 text-gray-800 hover:bg-gray-50 w-full py-3 rounded-lg"
                    aria-label="Return to login options"
                  >
                    Already have an account? Sign in instead
                  </Button>
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

      <Footer />
    </div>
  );
}