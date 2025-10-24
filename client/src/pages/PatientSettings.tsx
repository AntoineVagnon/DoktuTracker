import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { getLanguageName, type SupportedLocale } from "@/utils/languageDetection";
import { Globe, Save } from "lucide-react";

export default function PatientSettings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>('en');

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('PatientSettings: Unauthenticated access blocked, redirecting to login');
      setLocation('/test-login');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Fetch current notification preferences
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchPreferences();
    }
  }, [authLoading, isAuthenticated, user]);

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      console.log('📋 Current notification preferences:', data);

      if (data.locale) {
        setSelectedLocale(data.locale as SupportedLocale);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          locale: selectedLocale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      console.log('✅ Updated notification preferences:', data);

      toast({
        title: "Settings Saved",
        description: "Your language preference has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="text-gray-500">Loading your settings...</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences</p>
          </div>

          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <CardTitle>Language & Notifications</CardTitle>
              </div>
              <CardDescription>
                Choose your preferred language for emails and notifications
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={selectedLocale}
                  onValueChange={(value) => setSelectedLocale(value as SupportedLocale)}
                >
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      🇬🇧 English
                    </SelectItem>
                    <SelectItem value="bs">
                      🇧🇦 Bosanski (Bosnian)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  This affects the language used in emails, notifications, and communications.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation('/dashboard')}
              className="text-blue-600 hover:text-blue-500"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
