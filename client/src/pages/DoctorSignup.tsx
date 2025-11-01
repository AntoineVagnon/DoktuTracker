import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import { ArrowLeft, ArrowRight, Stethoscope, Shield, Clock, Users, CheckCircle2, AlertCircle, Check, X, Loader2, Save, Upload } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { CountrySearchSelect } from '@/components/CountrySearchSelect';
import { DoctorDocumentUpload } from '@/components/doctor/DoctorDocumentUpload';
import {
  formatPhoneNumber,
  isValidEmail,
  getBioStats,
  getEstimatedTime,
  AVAILABLE_LANGUAGES,
  AVAILABILITY_PREFERENCES,
  saveFormProgress,
  loadFormProgress,
  clearFormProgress,
} from '@/lib/signupHelpers';

// Available countries for doctor registration (27 EU + 7 non-EU Balkan = 34 total)
// Note: All 12 Balkan countries are included (5 are EU members + 7 non-EU)
const ELIGIBLE_COUNTRIES = [
  // EU Countries (including 5 Balkan EU members: BG, HR, GR, RO, SI)
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' }, // Balkan + EU
  { code: 'HR', name: 'Croatia' }, // Balkan + EU
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' }, // Balkan + EU
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' }, // Balkan + EU
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' }, // Balkan + EU
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  // Non-EU Balkan Countries
  { code: 'AL', name: 'Albania' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'TR', name: 'Turkey' },
];

const SPECIALTIES = [
  'General Medicine',
  'Pediatrics',
  'Dermatology',
  'Cardiology',
  'Cardiac Surgery',
  'Psychology',
  'Psychiatry',
  'Gynecology',
  'Obstetrics',
  'Orthopedics',
  'Orthopedic Surgery',
  'Ophthalmology',
  'ENT (Otolaryngology)',
  'Neurology',
  'Neurosurgery',
  'Endocrinology',
  'Gastroenterology',
  'General Surgery',
  'Pulmonology',
  'Thoracic Surgery',
  'Rheumatology',
  'Urology',
  'Oncology',
  'Surgical Oncology',
  'Nephrology',
  'Hematology',
  'Infectious Disease',
  'Anesthesiology',
  'Radiology',
  'Pathology',
  'Emergency Medicine',
  'Internal Medicine',
  'Family Medicine',
  'Sports Medicine',
  'Physical Medicine and Rehabilitation',
  'Plastic Surgery',
  'Vascular Surgery',
  'Pediatric Surgery',
  'Allergy and Immunology',
  'Geriatrics',
  'Palliative Care',
  'Occupational Medicine',
  'Preventive Medicine',
  'Nuclear Medicine',
];

// Step 1: Personal Information - Enhanced with autocomplete attributes
const step1Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 2: Medical Credentials - Enhanced with years of experience and languages
const step2Schema = z.object({
  specialty: z.string().min(1, 'Please select your specialty'),
  primaryCountry: z.string().min(1, 'Please select your primary country of practice'),
  additionalCountries: z.array(z.string()).optional(),
  yearsOfExperience: z.string().min(1, 'Please enter your years of experience'),
  languages: z.array(z.string()).min(1, 'Please select at least one language'),
});

// Step 3: Professional Details - Enhanced with availability preference
const step3Schema = z.object({
  bio: z.string().optional(),
  consultationPrice: z.string().optional(),
  availabilityPreference: z.string().optional(),
});

// Step 4: Document Upload
const step4Schema = z.object({
  // Documents are optional in schema since user can skip
  // But we'll show UI warnings if they skip
  approbationUploaded: z.boolean().optional(),
  facharzturkundeUploaded: z.boolean().optional(),
  zusatzbezeichnungUploaded: z.boolean().optional(),
});

// Step 5: Terms & Conditions (moved from step 4)
const step5Schema = z.object({
  agreeToTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must accept the privacy policy'),
  agreeToGDPR: z.boolean().refine(val => val === true, 'You must acknowledge GDPR compliance'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;
type Step5Data = z.infer<typeof step5Schema>;

export default function DoctorSignup() {
  const { t } = useTranslation('doctors');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Document upload state tracking
  const [approbationUploaded, setApprobationUploaded] = useState(false);
  const [facharzturkundeUploaded, setFacharzturkundeUploaded] = useState(false);
  const [zusatzbezeichnungUploaded, setZusatzbezeichnungUploaded] = useState(false);

  // Refs for focus management
  const step1FirstFieldRef = useRef<HTMLInputElement>(null);
  const step2FirstFieldRef = useRef<HTMLButtonElement>(null);
  const step3FirstFieldRef = useRef<HTMLTextAreaElement>(null);
  const step4FirstFieldRef = useRef<HTMLDivElement>(null);
  const step5FirstFieldRef = useRef<HTMLButtonElement>(null);

  // Form for Step 1
  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Form for Step 2
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      specialty: '',
      primaryCountry: '',
      additionalCountries: [],
      yearsOfExperience: '',
      languages: [],
    },
  });

  // Form for Step 3
  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      bio: '',
      consultationPrice: '',
      availabilityPreference: '',
    },
  });

  // Form for Step 4 (Document Upload)
  const form4 = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      approbationUploaded: false,
      facharzturkundeUploaded: false,
      zusatzbezeichnungUploaded: false,
    },
  });

  // Form for Step 5 (Terms & Conditions - moved from step 4)
  const form5 = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      agreeToTerms: false,
      agreeToPrivacy: false,
      agreeToGDPR: false,
    },
  });

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = loadFormProgress();
    if (savedProgress && savedProgress.step > 1) {
      const shouldRestore = window.confirm(
        'We found a saved draft of your registration. Would you like to continue where you left off?'
      );

      if (shouldRestore) {
        setCurrentStep(savedProgress.step);
        setFormData(savedProgress.data);

        // Restore form values
        if (savedProgress.data.firstName) form1.reset(savedProgress.data);
        if (savedProgress.data.specialty) form2.reset(savedProgress.data);
        if (savedProgress.data.bio) form3.reset(savedProgress.data);
        if (savedProgress.data.selectedCountries) setSelectedCountries(savedProgress.data.selectedCountries);
        if (savedProgress.data.selectedLanguages) setSelectedLanguages(savedProgress.data.selectedLanguages);

        toast({
          title: 'Draft restored',
          description: 'Your previous progress has been restored.',
        });
      } else {
        clearFormProgress();
      }
    }
  }, []);

  const progressPercentage = (currentStep / 5) * 100;

  // Watch password for strength indicator
  const password = form1.watch('password');
  const email = form1.watch('email');
  const bio = form3.watch('bio') || '';

  // Get bio statistics
  const bioStats = getBioStats(bio);

  // Auto-save progress
  useEffect(() => {
    const autoSave = () => {
      if (currentStep > 1) {
        setIsAutoSaving(true);
        const currentData = {
          ...formData,
          selectedCountries,
          selectedLanguages,
        };
        saveFormProgress(currentStep, currentData);
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    };

    const timer = setTimeout(autoSave, 3000);
    return () => clearTimeout(timer);
  }, [formData, selectedCountries, selectedLanguages, currentStep]);

  // Focus management - auto-focus first field on step change
  useEffect(() => {
    setTimeout(() => {
      if (currentStep === 1 && step1FirstFieldRef.current) {
        step1FirstFieldRef.current.focus();
      } else if (currentStep === 2 && step2FirstFieldRef.current) {
        step2FirstFieldRef.current.focus();
      } else if (currentStep === 3 && step3FirstFieldRef.current) {
        step3FirstFieldRef.current.focus();
      } else if (currentStep === 4 && step4FirstFieldRef.current) {
        step4FirstFieldRef.current.focus();
      } else if (currentStep === 5 && step5FirstFieldRef.current) {
        step5FirstFieldRef.current.focus();
      }
    }, 100);
  }, [currentStep]);

  const handleStep1Submit = (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
    // Announce step change for screen readers
    announceStepChange(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(3);
    announceStepChange(3);
  };

  const handleStep3Submit = (data: Step3Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(4);
    announceStepChange(4);
  };

  const handleStep4Submit = (data: Step4Data) => {
    // Check if required documents uploaded
    if (!approbationUploaded || !facharzturkundeUploaded) {
      // Show warning but allow continue
      toast({
        title: "Documents recommended",
        description: "You can upload documents later, but your account won't be active until verified.",
        variant: "default",
      });
    }
    setFormData({ ...formData, ...data });
    setCurrentStep(5);
    announceStepChange(5);
  };

  const handleStep5Submit = async (data: Step5Data) => {
    setIsSubmitting(true);
    const finalData = { ...formData, ...data };

    try {
      // Prepare request body matching backend API expectations
      const allCountries = [
        finalData.primaryCountry,
        ...(finalData.additionalCountries && finalData.additionalCountries.length > 0
          ? finalData.additionalCountries.filter((c: string) => c !== finalData.primaryCountry)
          : [])
      ];

      const requestBody = {
        email: finalData.email,
        password: finalData.password,
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        phone: finalData.phone,
        specialty: finalData.specialty,
        additionalCountries: allCountries,
        ...(finalData.bio && { bio: finalData.bio }),
        ...(finalData.consultationPrice && { consultationPrice: finalData.consultationPrice }),
        ...(finalData.yearsOfExperience && { yearsOfExperience: parseInt(finalData.yearsOfExperience) }),
        ...(finalData.languages && { languages: finalData.languages }),
        ...(finalData.availabilityPreference && { availabilityPreference: finalData.availabilityPreference }),
      };

      // Call registration API
      const response = await fetch('/api/doctor-registration/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Show success animation
      setShowSuccessAnimation(true);

      // Clear saved progress
      clearFormProgress();

      // Auto-login after successful registration
      setIsLoggingIn(true);
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: finalData.email,
          password: finalData.password,
        }),
        credentials: 'include',
      });

      if (!loginResponse.ok) {
        setIsLoggingIn(false);
        toast({
          title: 'Registration successful',
          description: 'Please login to continue',
        });
        setTimeout(() => {
          setLocation('/login');
        }, 2000);
        return;
      }

      // Parse login response
      const loginData = await loginResponse.json();
      console.log('✅ Auto-login successful:', loginData);

      // FIXED: Directly set the auth data in React Query cache using the login response
      // This avoids the cookie propagation timing issue that causes 401 errors on refetch
      if (loginData.user) {
        queryClient.setQueryData(['/api/auth/user'], loginData.user);
        console.log('✅ Auth data set directly in cache:', loginData.user);
      } else {
        console.error('❌ No user data in login response:', loginData);
      }

      // Verify the cache was updated
      const cachedAuthData = queryClient.getQueryData(['/api/auth/user']);
      console.log('🔍 Verifying cached auth data:', cachedAuthData);

      if (cachedAuthData && typeof cachedAuthData === 'object' && 'id' in cachedAuthData) {
        console.log('✅ Auth state verified - user is authenticated');
      } else {
        console.warn('⚠️ Auth data not found in cache after setting');
      }

      // Show success message
      toast({
        title: t('doctors.signup.toasts.success_title'),
        description: 'Your registration is complete and documents are under review',
        variant: 'default',
      });

      // Redirect to dashboard with full page reload to ensure cookies are sent
      // Using window.location.href instead of setLocation to force browser to send session cookies
      setTimeout(() => {
        console.log('🚀 Redirecting to doctor dashboard with full page reload...');
        window.location.href = '/doctor-dashboard';
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      setShowSuccessAnimation(false);
      announceError(error.message || 'Registration failed');
      toast({
        title: t('doctors.signup.toasts.error_title'),
        description: error.message || t('doctors.signup.toasts.error_description'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      announceStepChange(currentStep - 1);
    }
  };

  // Handle step navigation by clicking on progress steps
  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      announceStepChange(step);
    }
  };

  const toggleCountrySelection = (countryCode: string) => {
    setSelectedCountries(prev =>
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const toggleLanguageSelection = (languageCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(languageCode)
        ? prev.filter(l => l !== languageCode)
        : [...prev, languageCode]
    );
  };

  // Update form2 when countries/languages change
  useEffect(() => {
    form2.setValue('additionalCountries', selectedCountries);
    form2.setValue('languages', selectedLanguages);
  }, [selectedCountries, selectedLanguages]);

  // Accessibility: Announce step changes
  const announceStepChange = (step: number) => {
    const stepTitles = {
      1: 'Step 1: Personal Information',
      2: 'Step 2: Medical Credentials',
      3: 'Step 3: Professional Details',
      4: 'Step 4: Document Upload',
      5: 'Step 5: Terms and Conditions',
    };

    const announcement = document.getElementById('step-announcement');
    if (announcement) {
      announcement.textContent = `Now on ${stepTitles[step as keyof typeof stepTitles]}`;
    }
  };

  // Accessibility: Announce errors
  const announceError = (message: string) => {
    const announcement = document.getElementById('error-announcement');
    if (announcement) {
      announcement.textContent = `Error: ${message}`;
    }
  };

  // Handle save and continue later
  const handleSaveAndContinueLater = () => {
    const currentData = {
      ...formData,
      ...form1.getValues(),
      ...form2.getValues(),
      ...form3.getValues(),
      selectedCountries,
      selectedLanguages,
    };
    saveFormProgress(currentStep, currentData);
    toast({
      title: 'Progress saved',
      description: 'Your progress has been saved. You can continue later from where you left off.',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Accessibility: Live regions for announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true" id="step-announcement"></div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" id="error-announcement"></div>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 animate-in zoom-in duration-700" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            {isLoggingIn ? (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>Logging you in...</p>
              </div>
            ) : (
              <p className="text-gray-600">Redirecting you to your dashboard...</p>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-8 transition-all hover:scale-105">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('doctors.signup.back_to_home')}
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('doctors.signup.hero_title')}
          </h1>
          <p className="text-xl text-green-100">
            {t('doctors.signup.hero_subtitle')}
          </p>
        </div>
      </div>

      {/* Benefits Section with hover effects */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.new_patients_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.new_patients_desc')}</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.flexible_schedule_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.flexible_schedule_desc')}</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.secure_platform_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.secure_platform_desc')}</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:-translate-y-1 duration-300">
            <CardContent className="pt-6">
              <Stethoscope className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.modern_tech_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.modern_tech_desc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Multi-Step Registration Form */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>{t('doctors.signup.progress.title', { step: currentStep })}</CardTitle>
                <div className="flex items-center gap-2">
                  {isAutoSaving && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Save className="h-3 w-3 animate-pulse" />
                      Saving...
                    </div>
                  )}
                  <span className="text-sm text-gray-500">{t('doctors.signup.progress.percentage', { percent: Math.round(progressPercentage) })}</span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="relative">
                <Progress value={progressPercentage} className="w-full h-3 transition-all duration-500" />
                {progressPercentage === 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse opacity-50"></div>
                )}
              </div>

              {/* Clickable Step Indicators */}
              <div className="flex justify-between items-center">
                {[1, 2, 3, 4, 5].map((step) => (
                  <button
                    key={step}
                    onClick={() => handleStepClick(step)}
                    disabled={step > currentStep}
                    className={cn(
                      'flex flex-col items-center gap-1 transition-all duration-300',
                      step < currentStep ? 'cursor-pointer hover:scale-110' : '',
                      step > currentStep ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                    aria-label={`Step ${step}`}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                      step < currentStep ? 'bg-green-600 text-white' : '',
                      step === currentStep ? 'bg-green-600 text-white ring-4 ring-green-200' : '',
                      step > currentStep ? 'bg-gray-200 text-gray-500' : ''
                    )}>
                      {step < currentStep ? <Check className="h-4 w-4" /> : step}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">
                      {step === 1 && 'Personal'}
                      {step === 2 && 'Credentials'}
                      {step === 3 && 'Details'}
                      {step === 4 && 'Documents'}
                      {step === 5 && 'Terms'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <CardDescription>
                  {currentStep === 1 && t('doctors.signup.progress.step1_title')}
                  {currentStep === 2 && t('doctors.signup.progress.step2_title')}
                  {currentStep === 3 && t('doctors.signup.progress.step3_title')}
                  {currentStep === 4 && 'Upload Medical Credentials'}
                  {currentStep === 5 && t('doctors.signup.progress.step4_title')}
                </CardDescription>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {getEstimatedTime(currentStep)} remaining
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(handleStep1Submit)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form1.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            {t('doctors.signup.step1.first_name_label')}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('doctors.signup.step1.first_name_placeholder')}
                              autoComplete="given-name"
                              ref={step1FirstFieldRef}
                              className="transition-all focus:ring-2 focus:ring-green-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form1.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            {t('doctors.signup.step1.last_name_label')}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('doctors.signup.step1.last_name_placeholder')}
                              autoComplete="family-name"
                              className="transition-all focus:ring-2 focus:ring-green-500"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form1.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step1.email_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder={t('doctors.signup.step1.email_placeholder')}
                              autoComplete="email"
                              className="transition-all focus:ring-2 focus:ring-green-500 pr-10"
                              {...field}
                            />
                            {/* Email Validation Icon */}
                            {field.value && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isValidEmail(field.value) ? (
                                  <Check className="h-5 w-5 text-green-600 animate-in zoom-in" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600 animate-in zoom-in" />
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step1.phone_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+49 30 12345678"
                            autoComplete="tel"
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Format: +[country code] [area] [number]
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step1.password_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t('doctors.signup.step1.password_placeholder')}
                            autoComplete="new-password"
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            {...field}
                          />
                        </FormControl>
                        {/* Password Strength Indicator */}
                        <PasswordStrengthIndicator password={password || ''} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step1.confirm_password_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={t('doctors.signup.step1.confirm_password_placeholder')}
                            autoComplete="new-password"
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveAndContinueLater}
                      className="transition-all hover:scale-105"
                    >
                      <Save className="mr-2 h-4 w-4" /> Save & Continue Later
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105">
                      {t('doctors.signup.step1.next_button')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2: Medical Credentials */}
            {currentStep === 2 && (
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(handleStep2Submit)} className="space-y-4">
                  <FormField
                    control={form2.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step2.specialty_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger ref={step2FirstFieldRef} className="transition-all focus:ring-2 focus:ring-green-500">
                              <SelectValue placeholder={t('doctors.signup.step2.specialty_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {SPECIALTIES.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {t(`doctors.specialties.${specialty}`, specialty)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Years of Experience
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="70"
                            placeholder="e.g., 5"
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Total years of medical practice
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Languages Spoken */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Languages Spoken
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {AVAILABLE_LANGUAGES.map((language) => (
                        <div key={language.code} className="flex items-center space-x-2">
                          <Checkbox
                            id={`language-${language.code}`}
                            checked={selectedLanguages.includes(language.code)}
                            onCheckedChange={() => toggleLanguageSelection(language.code)}
                            className="transition-all"
                          />
                          <label
                            htmlFor={`language-${language.code}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {language.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Select all languages you can use for consultations
                    </p>
                    {form2.formState.errors.languages && (
                      <p className="text-sm text-red-600">{form2.formState.errors.languages.message}</p>
                    )}
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      After registration, you'll be able to upload your medical credential documents (Approbationsurkunde, Facharzturkunde) in your dashboard.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form2.control}
                    name="primaryCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step2.primary_country_label')}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <CountrySearchSelect
                            countries={ELIGIBLE_COUNTRIES}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('doctors.signup.step2.primary_country_placeholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      {t('doctors.signup.step2.additional_countries_label')}
                      <span className="text-gray-500 text-xs">(Optional)</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {ELIGIBLE_COUNTRIES.map((country) => (
                        <div key={country.code} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country.code}`}
                            checked={selectedCountries.includes(country.code)}
                            onCheckedChange={() => toggleCountrySelection(country.code)}
                            className="transition-all"
                          />
                          <label
                            htmlFor={`country-${country.code}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {country.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('doctors.signup.step2.additional_countries_help')}
                    </p>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="transition-all hover:scale-105">
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step2.back_button')}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveAndContinueLater}
                        className="transition-all hover:scale-105"
                      >
                        <Save className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105">
                        {t('doctors.signup.step2.next_button')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Professional Details */}
            {currentStep === 3 && (
              <Form {...form3}>
                <form onSubmit={form3.handleSubmit(handleStep3Submit)} className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('doctors.signup.step3.optional_notice')}
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form3.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step3.bio_label')}
                          <span className="text-gray-500 text-xs">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('doctors.signup.step3.bio_placeholder')}
                            rows={6}
                            ref={step3FirstFieldRef}
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            maxLength={2000}
                            {...field}
                          />
                        </FormControl>
                        {/* Bio Character Counter */}
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn(
                            bioStats.status === 'optimal' && 'text-green-600 font-medium',
                            bioStats.status === 'short' && 'text-gray-500',
                            bioStats.status === 'long' && 'text-yellow-600',
                            bioStats.status === 'too-long' && 'text-red-600'
                          )}>
                            {bioStats.length} / {bioStats.max} characters
                            {bioStats.status === 'optimal' && ' - Perfect length!'}
                            {bioStats.status === 'short' && bioStats.length > 0 && ` - Recommended: ${bioStats.optimal} chars`}
                          </span>
                          {bioStats.length > 0 && (
                            <div className="flex gap-1">
                              <div className={cn('w-2 h-2 rounded-full', bioStats.length >= 100 ? 'bg-green-500' : 'bg-gray-300')}></div>
                              <div className={cn('w-2 h-2 rounded-full', bioStats.length >= bioStats.optimal ? 'bg-green-500' : 'bg-gray-300')}></div>
                              <div className={cn('w-2 h-2 rounded-full', bioStats.length >= 500 ? 'bg-yellow-500' : 'bg-gray-300')}></div>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form3.control}
                    name="consultationPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('doctors.signup.step3.price_label')}
                          <span className="text-gray-500 text-xs">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t('doctors.signup.step3.price_placeholder')}
                            className="transition-all focus:ring-2 focus:ring-green-500"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {t('doctors.signup.step3.price_help')}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Availability Preference */}
                  <FormField
                    control={form3.control}
                    name="availabilityPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Availability Preference
                          <span className="text-gray-500 text-xs">(Optional)</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="transition-all focus:ring-2 focus:ring-green-500">
                              <SelectValue placeholder="Select your general availability..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AVAILABILITY_PREFERENCES.map((pref) => (
                              <SelectItem key={pref.value} value={pref.value}>
                                {pref.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          This helps us suggest optimal time slots. You can set specific hours later.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      {t('doctors.signup.step3.after_approval_title')}
                    </p>
                    <ul className="text-sm text-blue-800 ml-4 list-disc space-y-1">
                      <li>{t('doctors.signup.step3.after_approval_photo')}</li>
                      <li>{t('doctors.signup.step3.after_approval_iban')}</li>
                      <li>{t('doctors.signup.step3.after_approval_schedule')}</li>
                    </ul>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="transition-all hover:scale-105">
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step3.back_button')}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveAndContinueLater}
                        className="transition-all hover:scale-105"
                      >
                        <Save className="mr-2 h-4 w-4" /> Save
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105">
                        {t('doctors.signup.step3.next_button')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 4: Document Upload */}
            {currentStep === 4 && (
              <Form {...form4}>
                <form onSubmit={form4.handleSubmit(handleStep4Submit)} className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200 animate-in slide-in-from-top">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Upload Medical Credentials</p>
                      <p>Upload your medical documents now for faster account activation. You can also upload them later from your dashboard.</p>
                    </AlertDescription>
                  </Alert>

                  {/* Document Upload Progress Indicator */}
                  <div className="bg-gray-50 border rounded-lg p-4 space-y-2" ref={step4FirstFieldRef}>
                    <h3 className="font-semibold text-sm mb-3">Document Upload Status</h3>
                    <div className="flex items-center gap-2 text-sm">
                      {approbationUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={approbationUploaded ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        Approbationsurkunde
                      </span>
                      {!approbationUploaded && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {facharzturkundeUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={facharzturkundeUploaded ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        Facharzturkunde
                      </span>
                      {!facharzturkundeUploaded && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {zusatzbezeichnungUploaded ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={zusatzbezeichnungUploaded ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        Zusatzbezeichnung
                      </span>
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    </div>
                  </div>

                  {/* Document Upload Components */}
                  <div className="space-y-4">
                    <DoctorDocumentUpload
                      documentType="approbation"
                      title="Approbationsurkunde"
                      description="Your medical license certificate (required)"
                      required={true}
                      onUploadSuccess={() => {
                        setApprobationUploaded(true);
                        form4.setValue('approbationUploaded', true);
                      }}
                    />

                    <DoctorDocumentUpload
                      documentType="facharzturkunde"
                      title="Facharzturkunde"
                      description="Your specialist certificate (required)"
                      required={true}
                      onUploadSuccess={() => {
                        setFacharzturkundeUploaded(true);
                        form4.setValue('facharzturkundeUploaded', true);
                      }}
                    />

                    <DoctorDocumentUpload
                      documentType="zusatzbezeichnung"
                      title="Zusatzbezeichnung"
                      description="Additional qualifications (optional)"
                      required={false}
                      onUploadSuccess={() => {
                        setZusatzbezeichnungUploaded(true);
                        form4.setValue('zusatzbezeichnungUploaded', true);
                      }}
                    />
                  </div>

                  {/* Warning if documents not uploaded */}
                  {(!approbationUploaded || !facharzturkundeUploaded) && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Documents not yet uploaded</p>
                        <p>You can continue without uploading documents now, but your account won't be activated until they are verified. We recommend uploading them now.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="transition-all hover:scale-105">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105">
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 5: Terms & Conditions (moved from step 4) */}
            {currentStep === 5 && (
              <Form {...form5}>
                <form onSubmit={form5.handleSubmit(handleStep5Submit)} className="space-y-6">
                  <Alert className="animate-in slide-in-from-top">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {t('doctors.signup.step4.almost_done')}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <FormField
                      control={form5.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4 transition-all hover:bg-gray-50">
                          <FormControl>
                            <Checkbox
                              ref={step5FirstFieldRef}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="transition-all data-[state=checked]:animate-in data-[state=checked]:zoom-in"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              {t('doctors.signup.step4.agree_terms')}{' '}
                              <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium transition-colors"
                              >
                                {t('doctors.signup.step4.terms_link')}
                              </a>
                              {' '}{t('doctors.signup.step4.and')}{' '}
                              <a
                                href="/disclaimer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium transition-colors"
                              >
                                {t('doctors.signup.step4.medical_disclaimer_link')}
                              </a>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form5.control}
                      name="agreeToPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4 transition-all hover:bg-gray-50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="transition-all data-[state=checked]:animate-in data-[state=checked]:zoom-in"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              {t('doctors.signup.step4.agree_privacy')}{' '}
                              <a
                                href="/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium transition-colors"
                              >
                                {t('doctors.signup.step4.privacy_link')}
                              </a>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form5.control}
                      name="agreeToGDPR"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4 transition-all hover:bg-gray-50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="transition-all data-[state=checked]:animate-in data-[state=checked]:zoom-in"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              {t('doctors.signup.step4.agree_gdpr')}{' '}
                              <a
                                href="/gdpr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium transition-colors"
                              >
                                {t('doctors.signup.step4.gdpr_link')}
                              </a>
                              {' '}{t('doctors.signup.step4.requirements')}
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Document Status Summary */}
                  {(approbationUploaded && facharzturkundeUploaded) ? (
                    <Alert className="bg-green-50 border-green-200 animate-in slide-in-from-bottom">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800">
                        <p className="font-medium mb-1">Documents uploaded successfully</p>
                        <p>Your documents will be reviewed by our admin team within 24-48 hours.</p>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200 animate-in slide-in-from-bottom">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Documents not yet uploaded</p>
                        <p>You can upload your medical credentials later from your dashboard. However, your account won't be activated until they are verified.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      {t('doctors.signup.step4.what_next_title')}
                    </p>
                    <ol className="text-sm text-green-800 ml-4 list-decimal space-y-1">
                      <li>{t('doctors.signup.step4.what_next_step1')}</li>
                      <li>{t('doctors.signup.step4.what_next_step2')}</li>
                      <li>{t('doctors.signup.step4.what_next_step3')}</li>
                      <li>{t('doctors.signup.step4.what_next_step4')}</li>
                    </ol>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack} className="transition-all hover:scale-105">
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step4.back_button')}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105 min-w-[200px]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('doctors.signup.step4.submitting')}
                        </>
                      ) : (
                        <>
                          {t('doctors.signup.step4.submit_button')}
                          <CheckCircle2 className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section - Mobile Optimized with Collapsible */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('doctors.signup.faq.title')}</h2>

          <div className="space-y-4">
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.verification_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.verification_answer')}
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.fees_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.fees_answer')}
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.countries_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.countries_answer')}
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.documents_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.documents_answer')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile: Sticky footer with progress indicator on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {currentStep} of 5</span>
          <span className="text-xs text-gray-500">{getEstimatedTime(currentStep)} left</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
    </div>
  );
}
