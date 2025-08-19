import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ConsentManager } from "@/components/ConsentManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ConsentManagement() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get user ID from auth context
    if (user?.id) {
      setUserId(Number(user.id));
    }
  }, [user]);

  const handleBack = () => {
    // Navigate back to dashboard or settings
    if (user?.role === 'doctor') {
      setLocation('/doctor-settings');
    } else {
      setLocation('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {user?.role === 'doctor' ? 'Settings' : 'Dashboard'}
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Privacy & Consent Management</h1>
          <p className="text-muted-foreground">
            Control how your data is used and processed in compliance with GDPR regulations
          </p>
        </div>

        {userId ? (
          <ConsentManager userId={userId} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-muted-foreground">
              Please log in to manage your privacy preferences
            </p>
            <Button
              className="mt-4"
              onClick={() => setLocation('/login-form')}
            >
              Log In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}