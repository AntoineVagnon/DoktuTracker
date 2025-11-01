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
import { LicenseExpirationPicker } from '@/components/ui/license-expiration-picker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
        licenseExpirationDate: finalData.licenseExpirationDate ? finalData.licenseExpirationDate.toISOString() : null,
        ...(finalData.additionalCountries && finalData.additionalCountries.length > 0 && { additionalCountries: finalData.additionalCountries }),
        ...(finalData.rppsNumber && { rppsNumber: finalData.rppsNumber }),
        ...(finalData.bio && { bio: finalData.bio }),
        ...(finalData.consultationPrice && { consultationPrice: finalData.consultationPrice }),
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
        title: t('doctors.signup.toasts.success_title'),
        description: t('doctors.signup.toasts.success_description'),
        variant: 'default',
      });

      // Redirect to a success page or login
      setTimeout(() => {
        setLocation('/doctor-signup-success');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
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

      {/* Benefits Section */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.new_patients_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.new_patients_desc')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.flexible_schedule_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.flexible_schedule_desc')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('doctors.signup.benefits.secure_platform_title')}</h3>
              <p className="text-sm text-gray-600">{t('doctors.signup.benefits.secure_platform_desc')}</p>
            </CardContent>
          </Card>

          <Card>
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
                <span className="text-sm text-gray-500">{t('doctors.signup.progress.percentage', { percent: Math.round(progressPercentage) })}</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
              <CardDescription>
                {currentStep === 1 && t('doctors.signup.progress.step1_title')}
                {currentStep === 2 && t('doctors.signup.progress.step2_title')}
                {currentStep === 3 && t('doctors.signup.progress.step3_title')}
                {currentStep === 4 && t('doctors.signup.progress.step4_title')}
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
                          <FormLabel>{t('doctors.signup.step1.first_name_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('doctors.signup.step1.first_name_placeholder')} {...field} />
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
                          <FormLabel>{t('doctors.signup.step1.last_name_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('doctors.signup.step1.last_name_placeholder')} {...field} />
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
                        <FormLabel>{t('doctors.signup.step1.email_label')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('doctors.signup.step1.email_placeholder')} {...field} />
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
                        <FormLabel>{t('doctors.signup.step1.phone_label')}</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t('doctors.signup.step1.phone_placeholder')} {...field} />
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
                        <FormLabel>{t('doctors.signup.step1.password_label')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('doctors.signup.step1.password_placeholder')} {...field} />
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
                        <FormLabel>{t('doctors.signup.step1.confirm_password_label')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('doctors.signup.step1.confirm_password_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
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
                        <FormLabel>{t('doctors.signup.step2.specialty_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('doctors.signup.step2.specialty_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('doctors.signup.step2.license_number_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('doctors.signup.step2.license_number_placeholder')} {...field} />
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
                        <FormLabel>{t('doctors.signup.step2.license_expiration_label')}</FormLabel>
                        <FormControl>
                          <LicenseExpirationPicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('doctors.signup.step2.license_expiration_placeholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form2.control}
                    name="primaryCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('doctors.signup.step2.primary_country_label')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('doctors.signup.step2.primary_country_placeholder')} />
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
                    <Label>{t('doctors.signup.step2.additional_countries_label')}</Label>
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
                      {t('doctors.signup.step2.additional_countries_help')}
                    </p>
                  </div>

                  <FormField
                    control={form2.control}
                    name="rppsNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('doctors.signup.step2.rpps_label')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('doctors.signup.step2.rpps_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step2.back_button')}
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {t('doctors.signup.step2.next_button')} <ArrowRight className="ml-2 h-4 w-4" />
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
                      {t('doctors.signup.step3.optional_notice')}
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form3.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('doctors.signup.step3.bio_label')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('doctors.signup.step3.bio_placeholder')}
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
                        <FormLabel>{t('doctors.signup.step3.price_label')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t('doctors.signup.step3.price_placeholder')} {...field} />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {t('doctors.signup.step3.price_help')}
                        </p>
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
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step3.back_button')}
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      {t('doctors.signup.step3.next_button')} <ArrowRight className="ml-2 h-4 w-4" />
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
                      {t('doctors.signup.step4.almost_done')}
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
                              {t('doctors.signup.step4.agree_terms')}{' '}
                              <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
                              >
                                {t('doctors.signup.step4.terms_link')}
                              </a>
                              {' '}{t('doctors.signup.step4.and')}{' '}
                              <a
                                href="/disclaimer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
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
                              {t('doctors.signup.step4.agree_privacy')}{' '}
                              <a
                                href="/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
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
                              {t('doctors.signup.step4.agree_gdpr')}{' '}
                              <a
                                href="/gdpr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-500 underline font-medium"
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
                    <Button type="button" variant="outline" onClick={handleBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> {t('doctors.signup.step4.back_button')}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('doctors.signup.step4.submitting') : t('doctors.signup.step4.submit_button')}
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
          <h2 className="text-2xl font-bold mb-6 text-center">{t('doctors.signup.faq.title')}</h2>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.verification_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.verification_answer')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.fees_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.fees_answer')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('doctors.signup.faq.countries_question')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {t('doctors.signup.faq.countries_answer')}
                </p>
              </CardContent>
            </Card>

            <Card>
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
    </div>
  );
}
