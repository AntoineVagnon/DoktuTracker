import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, UserCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Login() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const role = urlParams.get('role') || 'patient';

  const handleNewPatient = () => {
    // Only show for patient role
    if (role !== 'patient') return;
    
    // Go to register page without redirect parameters
    window.location.href = '/register';
  };

  const handleLogin = () => {
    // All roles use Replit Auth (OIDC)
    sessionStorage.setItem('loginRole', role);
    // After login, go to dashboard by default
    sessionStorage.setItem('loginRedirect', '/dashboard');
    window.location.href = "/api/login";
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'doctor': return 'Doctor Portal';
      case 'admin': return 'Admin Portal';
      default: return 'Patient Portal';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'doctor': return 'Access your doctor dashboard and manage appointments';
      case 'admin': return 'Access administrative controls and system management';
      default: return 'Please choose how you\'d like to continue';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{getRoleTitle()}</h1>
            <p className="mt-2 text-gray-600">
              {getRoleDescription()}
            </p>
          </div>

          <div className="space-y-4">
            {role === 'patient' && (
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleNewPatient}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">New Patient</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-gray-600 mb-4">
                    First time using Doktu? Create your patient account to book your consultation.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Sign Up as New Patient
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleLogin}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">
                  {role === 'patient' ? 'Returning Patient' : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <p className="text-gray-600 mb-4">
                  {role === 'patient' 
                    ? 'Already have a Doktu account? Sign in to access your medical history and book appointments.'
                    : `Access your ${role} dashboard and manage your responsibilities.`
                  }
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Sign In to Account
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              By continuing, you agree to our{" "}
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
      </div>

      <Footer />
    </div>
  );
}