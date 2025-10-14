import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import { ArrowLeft, ArrowRight, Stethoscope, Shield, Clock, Users, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Available countries for doctor registration (27 EU + 7 Balkan)
const ELIGIBLE_COUNTRIES = [
  // EU Countries
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
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
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  // Balkan Countries
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
  'Psychology',
  'Psychiatry',
  'Gynecology',
  'Orthopedics',
  'Ophthalmology',
  'ENT (Otolaryngology)',
  'Neurology',
  'Endocrinology',
  'Gastroenterology',
  'Pulmonology',
  'Rheumatology',
  'Urology',
  'Oncology',
  'Nephrology',
  'Hematology',
  'Infectious Disease',
];

// Step 1: Personal Information
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

// Step 2: Medical Credentials
const step2Schema = z.object({
  specialty: z.string().min(1, 'Please select your specialty'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpirationDate: z.date({
    required_error: 'License expiration date is required',
  }).refine((date) => date > new Date(), {
    message: 'License must not be expired',
  }),
  primaryCountry: z.string().min(1, 'Please select your primary country of practice'),
  additionalCountries: z.array(z.string()).optional(),
  rppsNumber: z.string().optional(), // French RPPS number
});

// Step 3: Professional Details
const step3Schema = z.object({
  bio: z.string().optional(),
  consultationPrice: z.string().optional(),
});

// Step 4: Terms & Conditions
const step4Schema = z.object({
  agreeToTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must accept the privacy policy'),
  agreeToGDPR: z.boolean().refine(val => val === true, 'You must acknowledge GDPR compliance'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

export default function DoctorSignup() {
  const { t } = useTranslation('doctors');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

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
      licenseNumber: '',
      primaryCountry: '',
      additionalCountries: [],
      rppsNumber: '',
    },
  });

  // Form for Step 3
  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      bio: '',
      consultationPrice: '',
    },
  });

  // Form for Step 4
  const form4 = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      agreeToTerms: false,
      agreeToPrivacy: false,
      agreeToGDPR: false,
    },
  });

  const progressPercentage = (currentStep / 4) * 100;

  const handleStep1Submit = (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: Step2Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(3);
  };

  const handleStep3Submit = (data: Step3Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(4);
  };

  const handleStep4Submit = async (data: Step4Data) => {
    setIsSubmitting(true);
    const finalData = { ...formData, ...data };

    try {
      // Prepare request body matching backend API expectations
      const requestBody = {
        email: finalData.email,
        password: finalData.password,
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        phone: finalData.phone,
        specialty: finalData.specialty,
        licenseNumber: finalData.licenseNumber,
        licenseCountry: finalData.primaryCountry, // Backend expects 'licenseCountry' not 'primaryCountry'
        ...(finalData.bio && { bio: finalData.bio }),
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

      // Show success message
      toast({
        title: 'Application Submitted Successfully!',
        description: 'Your application is now under review. You will receive an email within 2-3 business days.',
        variant: 'default',
      });

      // Redirect to a success page or login
      setTimeout(() => {
        setLocation('/doctor-signup-success');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleCountrySelection = (countryCode: string) => {
    setSelectedCountries(prev =>
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  // Update form2 when countries change
  useEffect(() => {
    form2.setValue('additionalCountries', selectedCountries);
  }, [selectedCountries]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Join Doktu Platform
          </h1>
          <p className="text-xl text-green-100">
            Expand your practice and help patients across Europe
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">New Patients</h3>
              <p className="text-sm text-gray-600">Access patients across Europe</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Flexible Schedule</h3>
              <p className="text-sm text-gray-600">Work when it suits you</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Secure Platform</h3>
              <p className="text-sm text-gray-600">GDPR-compliant telemedicine</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Stethoscope className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Modern Technology</h3>
              <p className="text-sm text-gray-600">High-quality video consultations</p>
            </CardContent>
          </Card>
        </div>

        {/* Multi-Step Registration Form */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle>Doctor Registration - Step {currentStep} of 4</CardTitle>
                <span className="text-sm text-gray-500">{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
              <CardDescription>
                {currentStep === 1 && 'Personal Information'}
                {currentStep === 2 && 'Medical Credentials'}
                {currentStep === 3 && 'Professional Details'}
                {currentStep === 4 && 'Terms & Conditions'}
              </CardDescription>
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
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
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
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
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
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="doctor@example.com" {...field} />
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
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+33 1 23 45 67 89" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Min 8 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form1.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Re-enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
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
                        <FormLabel>Medical Specialty *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your specialty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPECIALTIES.map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
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
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical License Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your license number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="licenseExpirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>License Expiration Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick expiration date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="primaryCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Country of Practice *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your primary country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ELIGIBLE_COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Additional Licensed Countries (Optional)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {ELIGIBLE_COUNTRIES.map((country) => (
                        <div key={country.code} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country.code}`}
                            checked={selectedCountries.includes(country.code)}
                            onCheckedChange={() => toggleCountrySelection(country.code)}
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
                      Select countries where you hold valid medical licenses
                    </p>
                  </div>

                  <FormField
                    control={form2.control}
                    name="rppsNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RPPS Number (For France) - Optional</FormLabel>
                        <FormControl>
                          <Input placeholder="11-digit RPPS number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
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
                      These fields are optional but help complete your profile faster. You can also complete them later from your dashboard.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form3.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell patients about your experience, specializations, and approach to care..."
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form3.control}
                    name="consultationPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consultation Price (EUR) - Optional</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Set your consultation fee. Average range: €30-100
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      After approval, you'll need to complete:
                    </p>
                    <ul className="text-sm text-blue-800 ml-4 list-disc space-y-1">
                      <li>Profile photo upload</li>
                      <li>IBAN verification for payments</li>
                      <li>Availability schedule setup</li>
                    </ul>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 4: Terms & Conditions */}
            {currentStep === 4 && (
              <Form {...form4}>
                <form onSubmit={form4.handleSubmit(handleStep4Submit)} className="space-y-6">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Almost done! Please review and accept our terms to complete your application.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <FormField
                      control={form4.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I agree to the{' '}
                              <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
                              >
                                Terms of Service
                              </a>
                              {' '}and{' '}
                              <a
                                href="/medical-disclaimer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
                              >
                                Medical Disclaimer
                              </a>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="agreeToPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I acknowledge and accept the{' '}
                              <a
                                href="/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
                              >
                                Privacy Policy
                              </a>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="agreeToGDPR"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I have read and understand the{' '}
                              <a
                                href="/gdpr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
                              >
                                GDPR Compliance
                              </a>
                              {' '}requirements
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      What happens next?
                    </p>
                    <ol className="text-sm text-green-800 ml-4 list-decimal space-y-1">
                      <li>Your application will be reviewed by our team</li>
                      <li>You'll receive an email within 2-3 business days</li>
                      <li>Once approved, complete your profile to activate your account</li>
                      <li>Start accepting patient consultations!</li>
                    </ol>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      {!isSubmitting && <CheckCircle2 className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How long does the verification process take?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  The verification process typically takes 2-3 business days. We'll contact you as soon as we review your application.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are the platform fees?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  The platform takes a 15% commission from each consultation. You set your own consultation price.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I work with patients from different countries?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, our platform allows you to work with patients across Europe, in accordance with local regulations and your medical licenses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What documents do I need?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You'll need a valid medical license, proof of identity, and your professional credentials. Additional documents may be requested during the review process.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
