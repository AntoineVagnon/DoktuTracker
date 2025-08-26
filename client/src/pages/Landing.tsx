import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["/api/doctors"],
  });

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
      title: "GDPR Compliant",
      description: "Your medical data is protected with the highest security standards and European privacy regulations.",
      color: "green",
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Access healthcare professionals around the clock, including weekends and holidays.",
      color: "blue",
    },
    {
      icon: UserCheck,
      title: "Verified Doctors",
      description: "All our healthcare providers are licensed, certified, and regularly reviewed by our medical board.",
      color: "purple",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      description: "Access consultations from any device - desktop, tablet, or smartphone with seamless experience.",
      color: "yellow",
    },
    {
      icon: History,
      title: "Medical Records",
      description: "Keep track of your consultation history, prescriptions, and medical records in one secure place.",
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
      name: "Pay-per-visit",
      price: "€35",
      period: "per consultation",
      features: [
        "30-minute video consultation",
        "Book certified doctors",
        "Secure, private call",
        "No subscription required",
      ],
      buttonText: "Book Consultation",
      buttonVariant: "outline" as const,
    },
    {
      name: "Monthly Membership",
      price: "€45",
      period: "per month",
      features: [
        "2 × 30-minute consultations per month",
        "Book any eligible doctor",
        "Upload & share health data",
        "All Basic plan benefits included",
      ],
      buttonText: "Choose Monthly",
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      name: "6-Month Membership",
      price: "€219",
      period: "per 6 months",
      features: [
        "12 consultations (2 per month)",
        "23% savings vs monthly",
        "Book any eligible doctor",
        "All Basic plan benefits included",
      ],
      buttonText: "Choose 6-Month",
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
                Book one of our hand-picked doctors in{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
                  under 2 minutes
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Connect with certified healthcare professionals for secure video consultations. Available 24/7 across Europe.
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
                  Book Appointment
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 hover:border-[hsl(207,100%,52%)] hover:text-[hsl(207,100%,52%)] text-lg px-8 py-4"
                  asChild
                >
                  <a href="#how-it-works">
                    <Play className="mr-3 h-5 w-5" />
                    See How it Works
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
                    <span className="font-semibold text-gray-900">50,000+</span> patients treated
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">4.9/5 rating</span>
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
              Our Most Picked Medical Team
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with certified specialists across various medical fields. All our doctors are verified and highly rated by patients.
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
                See All Doctors <ArrowRight className="ml-2 h-4 w-4 inline" />
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
              Simple booking process—set if available doctors first
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get professional medical care from the comfort of your home in just three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Find Your Doctor</h3>
              <p className="text-gray-600">
                Browse our verified specialists and check their real-time availability. Filter by specialty, language, and rating.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Book Instantly</h3>
              <p className="text-gray-600">
                Select an available time slot and complete your booking in under 2 minutes. Secure payment processing included.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Start Consultation</h3>
              <p className="text-gray-600">
                Join your secure video consultation at the scheduled time. Get professional medical advice and prescriptions.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] hover:shadow-xl transition-all duration-200 text-lg px-8 py-4"
              asChild
            >
              <a href="#doctors">Start Booking Now</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why choose Doktu?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience healthcare the modern way with our comprehensive telemedicine platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gray-50 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 bg-${feature.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
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
              What Our Patients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of satisfied patients who have experienced quality healthcare through our platform.
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
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent pricing with no hidden fees. Choose the plan that works best for you.
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
                    <Badge className="bg-white text-[hsl(207,100%,52%)] px-3 py-1">Most popular</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center">
                    <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h3>
                    <div className={`text-4xl font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </div>
                    <p className={`mb-6 ${plan.popular ? "text-blue-100" : "text-gray-600"}`}>
                      {plan.period}
                    </p>

                    <ul className="text-left space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <CheckCircle 
                            className={`mr-3 h-5 w-5 flex-shrink-0 ${plan.popular ? "text-white" : "text-green-500"}`}
                            aria-hidden="true"
                          />
                          <span className={`leading-normal ${plan.popular ? "text-white" : "text-gray-600"}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.popular ? "secondary" : plan.buttonVariant}
                      className={`w-full ${
                        plan.popular 
                          ? "bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50" 
                          : plan.buttonVariant === "outline" 
                            ? "border-2 border-[hsl(207,100%,52%)] text-[hsl(207,100%,52%)] hover:bg-[hsl(207,100%,97%)]"
                            : ""
                      }`}
                      aria-label={`${plan.buttonText} – ${plan.price} ${plan.period}`}
                      onClick={() => {
                        // Track pricing card CTA click
                        const cardType = plan.name === "Pay-per-visit" ? 'pay_per_visit' : 
                                        plan.name === "Monthly Membership" ? 'monthly' : 'six_month';
                        analytics.track('pricing_card_cta_click', {
                          card: cardType,
                          price_eur: parseInt(plan.price.replace('€', ''))
                        });
                        
                        if (plan.name === "Pay-per-visit") {
                          // Scroll to doctors section for booking
                          const doctorsSection = document.getElementById('doctors');
                          if (doctorsSection) {
                            doctorsSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        } else {
                          // Check if user is authenticated
                          const planParam = plan.name === "Monthly Membership" ? 'monthly' : 'semiannual';
                          
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
                      {plan.buttonText}
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
            Skip the waiting room. Book now.
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of patients who have already experienced the future of healthcare. Get started with your first consultation today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-[hsl(207,100%,52%)] hover:bg-gray-50 text-lg px-8 py-4"
              asChild
            >
              <a href="#doctors">
                <Calendar className="mr-3 h-5 w-5" />
                Book Your First Appointment
              </a>
            </Button>
            <Button
              size="lg"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[hsl(207,100%,52%)] hover:border-[hsl(207,100%,52%)] text-lg px-8 py-4 transition-all duration-200"
              asChild
            >
              <a href="tel:+33123456789">
                <Phone className="mr-3 h-5 w-5" />
                Call Us: +33 1 23 45 67 89
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
