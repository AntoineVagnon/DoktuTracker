import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already set cookie preferences
    const savedPreferences = localStorage.getItem('cookiePreferences');
    const hasConsented = localStorage.getItem('cookieConsent');
    
    if (!hasConsented) {
      setShowBanner(true);
    } else if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  const savePreferences = async (acceptAll: boolean = false) => {
    const newPreferences = acceptAll
      ? { essential: true, functional: true, analytics: true, marketing: true }
      : preferences;

    // Save to localStorage
    localStorage.setItem('cookiePreferences', JSON.stringify(newPreferences));
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());

    // If user is logged in, save to backend
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        await apiRequest(`/api/consents/${user.id}`, {
          method: 'POST',
          body: JSON.stringify({
            consentType: 'cookies',
            legalBasis: 'article_6_1_a',
            consentGiven: true,
            documentVersion: '1.0',
            purposes: Object.entries(newPreferences)
              .filter(([_, value]) => value)
              .map(([key]) => key),
          }),
        });
      } catch (error) {
        console.error('Failed to save cookie consent to backend:', error);
      }
    }

    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    savePreferences(true);
  };

  const handleAcceptSelected = () => {
    savePreferences(false);
  };

  const handleRejectAll = () => {
    setPreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
    savePreferences(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t">
      <Card className="max-w-6xl mx-auto p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Cookie className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Cookie Preferences</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBanner(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Content */}
          <p className="text-sm text-muted-foreground">
            We use cookies and similar technologies to help personalize content, tailor and measure ads,
            and provide a better experience. By clicking accept, you agree to this, as outlined in our{' '}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>

          {/* Details Section */}
          {showDetails && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid gap-3">
                {/* Essential Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Essential Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Required for the website to function properly
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.essential}
                    disabled
                    className="h-4 w-4"
                  />
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Functional Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Enable enhanced functionality and personalization
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) =>
                      setPreferences({ ...preferences, functional: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Analytics Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Help us understand how visitors interact with our website
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Marketing Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Used to deliver relevant advertisements
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {!showDetails ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(true)}
                  className="sm:mr-auto"
                >
                  Manage Preferences
                </Button>
                <Button variant="outline" onClick={handleRejectAll}>
                  Reject All
                </Button>
                <Button onClick={handleAcceptAll}>Accept All</Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="sm:mr-auto"
                >
                  Hide Details
                </Button>
                <Button variant="outline" onClick={handleRejectAll}>
                  Reject Optional
                </Button>
                <Button onClick={handleAcceptSelected}>Save Preferences</Button>
                <Button onClick={handleAcceptAll}>Accept All</Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}