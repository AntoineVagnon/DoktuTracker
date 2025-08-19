import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConsentType {
  id: string;
  type: 'health_data_processing' | 'marketing' | 'cookies' | 'data_sharing';
  title: string;
  description: string;
  legalBasis: 'article_9_2_h' | 'article_9_2_a' | 'article_6_1_a' | 'article_6_1_b';
  required: boolean;
  granular: boolean;
  purposes: string[];
}

interface ConsentRecord {
  consentType: string;
  consentGiven: boolean;
  consentDate: string;
  legalBasis: string;
}

interface ConsentManagerProps {
  userId: number;
  onConsentUpdate?: (consents: ConsentRecord[]) => void;
  context?: 'registration' | 'settings' | 'consultation';
}

const consentTypes: ConsentType[] = [
  {
    id: 'health_data_essential',
    type: 'health_data_processing',
    title: 'Essential Health Data Processing',
    description: 'Processing of your health data for medical consultations and healthcare provision.',
    legalBasis: 'article_9_2_h',
    required: true,
    granular: false,
    purposes: [
      'Medical diagnosis and treatment',
      'Healthcare service provision',
      'Communication with healthcare professionals',
      'Medical record management'
    ]
  },
  {
    id: 'health_data_enhanced',
    type: 'health_data_processing',
    title: 'Enhanced Health Services',
    description: 'Additional processing for improved healthcare services and continuity of care.',
    legalBasis: 'article_9_2_a',
    required: false,
    granular: true,
    purposes: [
      'Sharing with specialist doctors for referrals',
      'Long-term medical history storage',
      'Treatment outcome tracking',
      'Healthcare quality improvement'
    ]
  },
  {
    id: 'marketing',
    type: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive updates about new services, health tips, and promotional offers.',
    legalBasis: 'article_6_1_a',
    required: false,
    granular: true,
    purposes: [
      'Service updates and newsletters',
      'Health and wellness tips',
      'Promotional offers',
      'Survey invitations'
    ]
  },
  {
    id: 'data_sharing',
    type: 'data_sharing',
    title: 'Anonymized Data for Research',
    description: 'Use of anonymized health data for medical research and service improvement.',
    legalBasis: 'article_9_2_a',
    required: false,
    granular: true,
    purposes: [
      'Medical research',
      'Service quality improvement',
      'Statistical analysis',
      'Healthcare trend analysis'
    ]
  }
];

export default function ConsentManager({ userId, onConsentUpdate, context = 'settings' }: ConsentManagerProps) {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch existing consents
  const { data: existingConsents, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/consents`],
    enabled: !!userId,
  });

  // Update consents mutation
  const updateConsentsMutation = useMutation({
    mutationFn: async (consentData: ConsentRecord[]) => {
      const response = await fetch(`/api/users/${userId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ consents: consentData }),
      });
      if (!response.ok) throw new Error('Failed to update consents');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/consents`] });
      toast({
        title: "Consent Preferences Updated",
        description: "Your consent preferences have been saved successfully.",
      });
      
      // Prepare consent records for parent component
      const consentRecords = Object.entries(consents).map(([id, given]) => {
        const consentType = consentTypes.find(ct => ct.id === id);
        return {
          consentType: id,
          consentGiven: given,
          consentDate: new Date().toISOString(),
          legalBasis: consentType?.legalBasis || '',
        };
      });
      
      onConsentUpdate?.(consentRecords);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update consent preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize consents from existing data
  useEffect(() => {
    if (existingConsents) {
      const consentMap: Record<string, boolean> = {};
      existingConsents.forEach((consent: any) => {
        consentMap[consent.consentType] = consent.consentGiven;
      });
      
      // Set required consents to true by default
      consentTypes.forEach(ct => {
        if (ct.required && !(ct.id in consentMap)) {
          consentMap[ct.id] = true;
        }
      });
      
      setConsents(consentMap);
    } else {
      // Initialize with default values for new users
      const defaultConsents: Record<string, boolean> = {};
      consentTypes.forEach(ct => {
        defaultConsents[ct.id] = ct.required;
      });
      setConsents(defaultConsents);
    }
  }, [existingConsents]);

  const handleConsentChange = (consentId: string, checked: boolean) => {
    const consentType = consentTypes.find(ct => ct.id === consentId);
    
    // Don't allow unchecking required consents
    if (consentType?.required && !checked) {
      toast({
        title: "Required Consent",
        description: "This consent is required to use our healthcare services.",
        variant: "destructive",
      });
      return;
    }
    
    setConsents(prev => ({ ...prev, [consentId]: checked }));
  };

  const handleSaveConsents = () => {
    const consentRecords = Object.entries(consents).map(([id, given]) => {
      const consentType = consentTypes.find(ct => ct.id === id);
      return {
        consentType: id,
        consentGiven: given,
        consentDate: new Date().toISOString(),
        legalBasis: consentType?.legalBasis || '',
      };
    });
    
    updateConsentsMutation.mutate(consentRecords);
  };

  const getLegalBasisLabel = (basis: string) => {
    switch (basis) {
      case 'article_9_2_h':
        return 'GDPR Article 9(2)(h) - Healthcare Provision';
      case 'article_9_2_a':
        return 'GDPR Article 9(2)(a) - Explicit Consent';
      case 'article_6_1_a':
        return 'GDPR Article 6(1)(a) - Consent';
      case 'article_6_1_b':
        return 'GDPR Article 6(1)(b) - Contract Performance';
      default:
        return basis;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading consent preferences...</div>;
  }

  return (
    <div className="space-y-6">
      {context === 'registration' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            We take your privacy seriously. Please review and accept our data processing 
            agreements to proceed with registration.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {consentTypes.map(consentType => (
          <Card key={consentType.id} className={consentType.required ? 'border-blue-200' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {consentType.title}
                    {consentType.required && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {consentType.description}
                  </CardDescription>
                  <p className="text-xs text-gray-500 mt-2">
                    Legal Basis: {getLegalBasisLabel(consentType.legalBasis)}
                  </p>
                </div>
                <Checkbox
                  checked={consents[consentType.id] || false}
                  onCheckedChange={(checked) => 
                    handleConsentChange(consentType.id, checked as boolean)
                  }
                  disabled={consentType.required}
                  className="mt-1"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="mb-2">
                    <Info className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{consentType.title}</DialogTitle>
                    <DialogDescription>
                      Detailed information about this data processing activity
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Purposes:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {consentType.purposes.map((purpose, index) => (
                          <li key={index} className="text-sm">{purpose}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Legal Information:</h4>
                      <p className="text-sm text-gray-600">
                        This processing is conducted under {getLegalBasisLabel(consentType.legalBasis)}.
                        {!consentType.required && ' You can withdraw this consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.'}
                      </p>
                    </div>
                    {consentType.type === 'health_data_processing' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Health data is special category data under GDPR. We implement enhanced 
                          security measures to protect this sensitive information.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              {consentType.granular && consents[consentType.id] && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Specific purposes you consent to:</p>
                  <ul className="text-sm space-y-1">
                    {consentType.purposes.map((purpose, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs">{purpose}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-gray-600">
          You can update your consent preferences at any time in your account settings.
        </p>
        <Button 
          onClick={handleSaveConsents}
          disabled={updateConsentsMutation.isPending}
        >
          {updateConsentsMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}