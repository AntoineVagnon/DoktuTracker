import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Cookie, Heart, Share2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConsentType {
  id: string;
  type: 'health_data_processing' | 'marketing' | 'cookies' | 'data_sharing';
  title: string;
  description: string;
  legalBasis: string;
  required: boolean;
  purposes: string[];
  consentGiven: boolean;
  documentVersion: string;
}

interface ConsentManagerProps {
  userId: number;
  onConsentUpdate?: (consents: ConsentType[]) => void;
}

const consentConfig: ConsentType[] = [
  {
    id: 'health_data',
    type: 'health_data_processing',
    title: 'Health Data Processing',
    description: 'Allow us to process your health data for medical consultations and healthcare services.',
    legalBasis: 'article_9_2_h',
    required: true,
    purposes: ['Medical diagnosis', 'Treatment provision', 'Healthcare management'],
    consentGiven: false,
    documentVersion: '1.0',
  },
  {
    id: 'marketing',
    type: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive updates about our services, health tips, and promotional offers.',
    legalBasis: 'article_6_1_a',
    required: false,
    purposes: ['Service updates', 'Health newsletters', 'Promotional offers'],
    consentGiven: false,
    documentVersion: '1.0',
  },
  {
    id: 'cookies',
    type: 'cookies',
    title: 'Analytics & Performance Cookies',
    description: 'Help us improve our services by allowing analytics and performance tracking.',
    legalBasis: 'article_6_1_a',
    required: false,
    purposes: ['Service improvement', 'Usage analytics', 'Performance monitoring'],
    consentGiven: false,
    documentVersion: '1.0',
  },
  {
    id: 'data_sharing',
    type: 'data_sharing',
    title: 'Data Sharing with Specialists',
    description: 'Share your medical data with specialist doctors for referrals when needed.',
    legalBasis: 'article_9_2_a',
    required: false,
    purposes: ['Specialist referrals', 'Second opinions', 'Collaborative care'],
    consentGiven: false,
    documentVersion: '1.0',
  },
];

export function ConsentManager({ userId, onConsentUpdate }: ConsentManagerProps) {
  const [consents, setConsents] = useState<ConsentType[]>(consentConfig);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current consents
  const { data: userConsents, isLoading, error } = useQuery({
    queryKey: [`/api/consents/${userId}`],
    enabled: !!userId,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('Access token required') || error?.message?.includes('Not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update consent mutation
  const updateConsentMutation = useMutation({
    mutationFn: async (consent: ConsentType) => {
      return apiRequest('POST', `/api/consents/${userId}`, {
        consentType: consent.type,
        legalBasis: consent.legalBasis,
        consentGiven: consent.consentGiven,
        documentVersion: consent.documentVersion,
        purposes: consent.purposes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/consents/${userId}`] });
      toast({
        title: "Consent Updated",
        description: "Your privacy preferences have been saved.",
      });
    },
    onError: (error: any) => {
      let message = "Failed to update consent. Please try again.";
      let title = "Error";
      
      if (error?.message?.includes('Access token required') || error?.message?.includes('Not authenticated')) {
        title = "Authentication Required";
        message = "Please log in again to update your privacy preferences.";
      }
      
      toast({
        title,
        description: message,
        variant: "destructive",
      });
    },
  });

  // Withdraw consent mutation
  const withdrawConsentMutation = useMutation({
    mutationFn: async (consentType: string) => {
      return apiRequest('POST', `/api/consents/${userId}/withdraw`, {
        consentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/consents/${userId}`] });
      toast({
        title: "Consent Withdrawn",
        description: "Your consent has been withdrawn successfully.",
      });
    },
    onError: (error: any) => {
      let message = "Failed to withdraw consent. Please try again.";
      let title = "Error";
      
      if (error?.message?.includes('Access token required') || error?.message?.includes('Not authenticated')) {
        title = "Authentication Required";
        message = "Please log in again to update your privacy preferences.";
      }
      
      toast({
        title,
        description: message,
        variant: "destructive",
      });
    },
  });

  // Update local state when user consents are fetched
  useEffect(() => {
    if (userConsents && Array.isArray(userConsents)) {
      const updatedConsents = consentConfig.map(config => {
        const userConsent = userConsents.find(
          (uc: any) => uc.consentType === config.type
        );
        return {
          ...config,
          consentGiven: userConsent?.consentGiven ?? false,
        };
      });
      setConsents(updatedConsents);
      onConsentUpdate?.(updatedConsents);
    }
  }, [userConsents, onConsentUpdate]);

  const handleConsentToggle = async (consentId: string) => {
    const consent = consents.find(c => c.id === consentId);
    if (!consent) return;

    // Don't allow disabling required consents
    if (consent.required && consent.consentGiven) {
      toast({
        title: "Required Consent",
        description: "This consent is required to use our healthcare services.",
        variant: "destructive",
      });
      return;
    }

    const updatedConsent = {
      ...consent,
      consentGiven: !consent.consentGiven,
    };

    // Update local state immediately for better UX
    setConsents(prev =>
      prev.map(c => (c.id === consentId ? updatedConsent : c))
    );

    // Send update to server
    if (updatedConsent.consentGiven) {
      await updateConsentMutation.mutateAsync(updatedConsent);
    } else {
      await withdrawConsentMutation.mutateAsync(consent.type);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'health_data_processing':
        return <Heart className="h-5 w-5" />;
      case 'marketing':
        return <Share2 className="h-5 w-5" />;
      case 'cookies':
        return <Cookie className="h-5 w-5" />;
      case 'data_sharing':
        return <Shield className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Check for authentication errors
  const isAuthError = error?.message?.includes('Access token required') || error?.message?.includes('Not authenticated');
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading privacy preferences...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (isAuthError) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Your session has expired. Please log in again to manage your privacy preferences.
            </p>
            <Button onClick={() => window.location.href = '/login-form'}>
              Log In Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy & Consent Management</CardTitle>
        <CardDescription>
          Manage how we use your data in compliance with GDPR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {consents.map(consent => (
          <div key={consent.id} className="space-y-4 pb-4 border-b last:border-0">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  {getIcon(consent.type)}
                  <Label htmlFor={consent.id} className="text-base font-medium">
                    {consent.title}
                    {consent.required && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {consent.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium">Legal Basis: {consent.legalBasis}</p>
                  <p className="mt-1">Purposes:</p>
                  <ul className="list-disc list-inside ml-2">
                    {consent.purposes.map((purpose, idx) => (
                      <li key={idx}>{purpose}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <Switch
                id={consent.id}
                checked={consent.consentGiven}
                onCheckedChange={() => handleConsentToggle(consent.id)}
                disabled={consent.required && consent.consentGiven}
              />
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                You can withdraw your consent at any time for optional data processing.
                Required consents are necessary for using our healthcare services.
              </p>
              <p className="mt-2">
                For more information, please read our{' '}
                <a href="/privacy" className="underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/gdpr-compliance" className="underline">
                  GDPR Compliance Statement
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}