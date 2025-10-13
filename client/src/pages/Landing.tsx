import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Star, Search, Calendar, Video, Shield, Clock, UserCheck, Smartphone, History, CheckCircle, Phone, ArrowRight, Play } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DoctorCard from "@/components/DoctorCard";
import AuthModal from "@/components/AuthModal";
import { analytics } from "@/lib/analytics";
import telemedicineImage from "@assets/generated_images/Patient_telehealth_consultation_97dad641.png";
import patientPhoto1 from "@assets/generated_images/Professional_woman_headshot_cb8ff331.png";
import patientPhoto2 from "@assets/generated_images/Professional_man_headshot_541d0770.png";
import patientPhoto3 from "@assets/generated_images/Young_professional_woman_headshot_5d562695.png";

export default function Landing() {
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [, setLocation] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('landing');

  // Log to verify new deployment (will remove after testing)
  console.log('🚀 Landing page loaded - CORS fix v2 - ' + new Date().toISOString());

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["/api/doctors"],
    staleTime: 0, // Force fresh data
  });

  // Get subscription data to disable buttons for current/inferior plans
  const { data: subscriptionData } = useQuery<{
    hasSubscription: boolean;
    subscription?: {
      id: string;
      status: string;
      planId: string;
      planName: string;
      interval: string;
      intervalCount: number;
    };
  }>({
    queryKey: ["/api/membership/subscription"],
    enabled: isAuthenticated,
  });

  // Helper function to determine if a pricing button should be disabled
  const isButtonDisabled = (planName: string): boolean => {
    if (!isAuthenticated || !subscriptionData?.hasSubscription) {
      return false; // No subscription, enable all buttons
    }

    const subscription = subscriptionData.subscription;
    if (!subscription) return false;

    // Get current subscription type
    const hasMonthlySubscription = subscription.intervalCount === 1;
    const hasSixMonthSubscription = subscription.intervalCount === 6;

    // Disable logic:
    if (hasMonthlySubscription) {
      // User has monthly subscription - disable pay-per-visit and monthly
      return planName === "Pay-per-visit" || planName === "Monthly Membership";
    }
    
    if (hasSixMonthSubscription) {
      // User has 6-month subscription - disable all buttons (they have the highest plan)
      return true;
    }

    return false;
  };

  useEffect(() => {
    // Track homepage visit
    analytics.trackPageView('homepage');
    analytics.trackDiscovery('homepage_loaded', {
      source: new URLSearchParams(window.location.search).get('utm_source') || 'direct',
      doctorsShown: doctors.length
    });
    
    // Track pricing card impressions when section is visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          ['pay_per_visit', 'monthly', 'six_month'].forEach((card, index) => {
            analytics.track('pricing_card_impression', {
              card: card,
              position: index + 1
            });
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      observer.observe(pricingSection);
    }

    console.log('Landing page loaded, checking for password reset tokens');
    console.log('Current URL hash:', window.location.hash);
    
    // Check if this is a password reset redirect from Supabase
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    console.log('Hash params:', { type, accessToken: !!accessToken });
    console.log('All hash params:', Array.from(hashParams.entries()));
    
    if (type === 'recovery' && accessToken) {
      console.log('✅ Detected password reset redirect, redirecting to password reset page');
      // Preserve the hash params when redirecting
      const fullHash = window.location.hash;
      window.location.href = `/password-reset${fullHash}`;
      return;
    } else {
      console.log('❌ No password reset tokens found, loading normal landing page');
    }

    // Check for password reset success redirect
    const urlParams = new URLSearchParams(window.location.search);
    const resetSuccess = urlParams.get('reset');
    
    if (resetSuccess === 'success') {
      toast({
        title: "Password Updated Successfully",
        description: "You can now log in with your new password",
      });
      
      // Open login modal automatically
      setAuthModalTab("login");
      setIsAuthModalOpen(true);
      
      // Clean up URL without causing refresh
      window.history.replaceState({}, '', '/');
    }

    try {
      const img = new Image();
      img.onload = () => setHeroImageLoaded(true);
      img.onerror = () => {
        console.warn('Hero image failed to load, continuing without image');
        setHeroImageLoaded(true); // Allow the component to render normally
      };
      img.src = telemedicineImage;
    } catch (error) {
      console.warn('Error creating image element:', error);
      setHeroImageLoaded(true);
    }
  }, [setLocation, toast]);

  // Transform the doctor data to match DoctorCard interface
  const featuredDoctors = doctors.slice(0, 5).map((doctor: any) => ({
    id: doctor.id || doctor.doctors?.id,
    user: doctor.user || doctor.users,
    specialty: doctor.specialty || doctor.doctors?.specialty,
    rating: doctor.rating || doctor.doctors?.rating || "4.5",
    reviewCount: doctor.reviewCount || 20,
    consultationPrice: doctor.consultationPrice || doctor.doctors?.consultationPrice || "€35",
    isOnline: doctor.isOnline !== undefined ? doctor.isOnline : (doctor.doctors?.isOnline || true)
  }));

  const features = [
    {
      icon: Shield,
      titleKey: "landing.features.feature_1_title",
      descriptionKey: "landing.features.feature_1_description",
      color: "green",
    },
    {
      icon: Clock,
      titleKey: "landing.features.feature_2_title",
      descriptionKey: "landing.features.feature_2_description",
      color: "blue",
    },
    {
      icon: UserCheck,
      titleKey: "landing.features.feature_3_title",
      descriptionKey: "landing.features.feature_3_description",
      color: "purple",
    },
    {
      icon: Smartphone,
      titleKey: "landing.features.feature_4_title",
      descriptionKey: "landing.features.feature_4_description",
      color: "yellow",
    },
    {
      icon: History,
      titleKey: "landing.features.feature_5_title",
      descriptionKey: "landing.features.feature_5_description",
      color: "indigo",
    },
  ];

  const testimonials = [
    {
      name: "Maria Kowalski",
      location: "Berlin, Germany",
      rating: 5,
      comment: "Outstanding service! I was able to consult with a specialist within minutes. The doctor was professional and provided excellent care.",
      initials: "MK",
    },
    {
      name: "Jean Dubois",
      location: "Paris, France",
      rating: 5,
      comment: "Very convenient and secure platform. The video quality was excellent and I received my prescription immediately after the consultation.",
      initials: "JD",
    },
    {
      name: "Anna Rodriguez",
      location: "Madrid, Spain",
      rating: 5,
      comment: "Perfect for busy professionals. I was able to get medical advice during my lunch break without leaving the office.",
      initials: "AR",
    },
  ];

  const pricingPlans = [
    {
      nameKey: "landing.pricing.plan_1_name",
      priceKey: "landing.pricing.plan_1_price",
      periodKey: "landing.pricing.plan_1_period",
      featureKeys: [
        "landing.pricing.plan_1_feature_1",
        "landing.pricing.plan_1_feature_2",
        "landing.pricing.plan_1_feature_3",
        "landing.pricing.plan_1_feature_4",
      ],
      buttonTextKey: "landing.pricing.plan_1_button",
      buttonVariant: "outline" as const,
    },
    {
      nameKey: "landing.pricing.plan_2_name",
      priceKey: "landing.pricing.plan_2_price",
      periodKey: "landing.pricing.plan_2_period",
      featureKeys: [
        "landing.pricing.plan_2_feature_1",
        "landing.pricing.plan_2_feature_2",
        "landing.pricing.plan_2_feature_3",
        "landing.pricing.plan_2_feature_4",
      ],
      buttonTextKey: "landing.pricing.plan_2_button",
      badgeKey: "landing.pricing.plan_2_badge",
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      nameKey: "landing.pricing.plan_3_name",
      priceKey: "landing.pricing.plan_3_price",
      periodKey: "landing.pricing.plan_3_period",
      featureKeys: [
        "landing.pricing.plan_3_feature_1",
        "landing.pricing.plan_3_feature_2",
        "landing.pricing.plan_3_feature_3",
        "landing.pricing.plan_3_feature_4",
      ],
      buttonTextKey: "landing.pricing.plan_3_button",
      buttonVariant: "outline" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[hsl(207,100%,97%)] to-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div className="lg:pr-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {t('landing.hero.title')}
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] hover:shadow-xl transition-all duration-200 text-lg px-8 py-4"
                  onClick={() => {
                    analytics.trackDiscovery('cta_clicked', { location: 'hero', action: 'book_appointment' });
                    analytics.trackBookingFunnel('interest_shown', undefined, { source: 'hero_cta' });
                    document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  {t('landing.hero.button_1')}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 hover:border-[hsl(207,100%,52%)] hover:text-[hsl(207,100%,52%)] text-lg px-8 py-4"
                  asChild
                >
                  <a href="#how-it-works">
                    <Play className="mr-3 h-5 w-5" />
                    {t('landing.hero.button_2')}
                  </a>
                </Button>
              </div>

              <div className="mt-8 flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img
                      src={patientPhoto1}
                      alt="Patient testimonial"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                    <img
                      src={patientPhoto2}
                      alt="Patient testimonial"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                    <img
                      src={patientPhoto3}
                      alt="Patient testimonial"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    />
                  </div>
                  <span className="ml-3 text-sm text-gray-600">
                    {t('landing.hero.stats_patients')}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">{t('landing.hero.stats_rating')}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 lg:mt-0">
              {heroImageLoaded ? (
                <img
                  src={telemedicineImage}
                  alt="Professional medical consultation"
                  className="rounded-2xl shadow-2xl w-full h-auto"
                />
              ) : (
                <div className="rounded-2xl shadow-2xl w-full h-[400px] bg-gray-200 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section id="doctors" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {featuredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  availableSlots={["08:00", "08:30"]}
                  onBookClick={(doctorId) => {
                    window.location.href = `/doctor/${doctorId}`;
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Button
              variant="ghost"
              className="text-[hsl(207,100%,52%)] font-semibold hover:text-[hsl(225,99%,52%)] transition-colors"
              asChild
            >
              <a href="/doctors">
                {t('landing.features.see_all_doctors')} <ArrowRight className="ml-2 h-4 w-4 inline" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.how_it_works.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.how_it_works.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.how_it_works.step_1_title')}</h3>
              <p className="text-gray-600">
                {t('landing.how_it_works.step_1_description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.how_it_works.step_2_title')}</h3>
              <p className="text-gray-600">
                {t('landing.how_it_works.step_2_description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.how_it_works.step_3_title')}</h3>
              <p className="text-gray-600">
                {t('landing.how_it_works.step_3_description')}
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] hover:shadow-xl transition-all duration-200 text-lg px-8 py-4"
              asChild
            >
              <a href="#doctors">{t('landing.how_it_works.start_booking_cta')}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.why_choose.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.why_choose.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gray-50 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 bg-${feature.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(feature.titleKey)}</h3>
                  <p className="text-gray-600">{t(feature.descriptionKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-[hsl(207,100%,97%)] to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white shadow-sm hover:shadow-lg transition-all duration-200">
                <CardContent className="p-8">
                  <div className="flex text-yellow-400 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">"{testimonial.comment}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold">{testimonial.initials}</span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-600">{testimonial.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('landing.pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${
                  plan.popular 
                    ? "bg-gradient-to-br from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] text-white transform scale-105 shadow-xl" 
                    : "bg-white border-2 border-gray-200 hover:border-[hsl(207,100%,52%)]/30"
                } transition-all duration-200`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-white text-[hsl(207,100%,52%)] px-3 py-1">{t(plan.badgeKey!)}</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center">
                    <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      {t(plan.nameKey)}
                    </h3>
                    <div className={`text-4xl font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      {t(plan.priceKey)}
                    </div>
                    <p className={`mb-6 ${plan.popular ? "text-blue-100" : "text-gray-600"}`}>
                      {t(plan.periodKey)}
                    </p>

                    <ul className="text-left space-y-3 mb-8">
                      {plan.featureKeys.map((featureKey, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <CheckCircle
                            className={`mr-3 h-5 w-5 flex-shrink-0 ${plan.popular ? "text-white" : "text-green-500"}`}
                            aria-hidden="true"
                          />
                          <span className={`leading-normal ${plan.popular ? "text-white" : "text-gray-600"}`}>{t(featureKey)}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.popular ? "secondary" : plan.buttonVariant}
                      disabled={isButtonDisabled(t(plan.nameKey))}
                      className={`w-full ${
                        plan.popular
                          ? "bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50"
                          : plan.buttonVariant === "outline"
                            ? "border-2 border-[hsl(207,100%,52%)] text-[hsl(207,100%,52%)] hover:bg-[hsl(207,100%,97%)]"
                            : ""
                      } ${isButtonDisabled(t(plan.nameKey)) ? "opacity-50 cursor-not-allowed" : ""}`}
                      aria-label={`${t(plan.buttonTextKey)} – ${t(plan.priceKey)} ${t(plan.periodKey)}`}
                      onClick={() => {
                        // Track pricing card CTA click
                        const planName = t(plan.nameKey);
                        const cardType = planName === "Pay-per-visit" ? 'pay_per_visit' :
                                        planName === "Monthly Membership" ? 'monthly' : 'six_month';
                        analytics.track('pricing_card_cta_click', {
                          card: cardType,
                          price_eur: parseInt(t(plan.priceKey).replace('€', ''))
                        });

                        if (planName === "Pay-per-visit") {
                          // Scroll to doctors section for booking
                          const doctorsSection = document.getElementById('doctors');
                          if (doctorsSection) {
                            doctorsSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        } else {
                          // Check if user is authenticated
                          const planParam = planName === "Monthly Membership" ? 'monthly' : 'semiannual';

                          if (isAuthenticated) {
                            // User is logged in, go directly to membership page
                            setLocation(`/membership-start?plan=${planParam}`);
                          } else {
                            // User not logged in, go to registration with redirect
                            setLocation(`/register?redirect=/membership-start?plan=${planParam}`);
                          }
                        }
                      }}
                    >
                      {t(plan.buttonTextKey)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50 text-lg px-8 py-4"
              asChild
            >
              <a href="#doctors">
                <Calendar className="mr-3 h-5 w-5" />
                {t('landing.cta.button_1')}
              </a>
            </Button>
            <Button
              size="lg"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[hsl(207,100%,52%)] hover:border-[hsl(207,100%,52%)] text-lg px-8 py-4 transition-all duration-200"
              asChild
            >
              <a href="tel:+33123456789">
                <Phone className="mr-3 h-5 w-5" />
                {t('landing.cta.button_2')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
