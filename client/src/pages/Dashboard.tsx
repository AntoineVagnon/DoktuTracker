import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Heart, Settings, CreditCard, Plus, Video, CalendarCheck, Star, AlertCircle, Upload, Edit2, Save, X, Activity, FileText, Shield, AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { formatAppointmentDateTimeUS, categorizeAppointmentsByTiming, getTimeUntilAppointment } from "@/lib/dateUtils";
import { formatAppointmentTime, utcToLocal } from "@/lib/timezoneUtils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { BannerSystem } from "@/components/BannerSystem";
import { HealthProfileSidebar } from "@/components/HealthProfileSidebar";
import { DocumentLibraryPanel } from "@/components/DocumentLibraryPanel";
import { PaymentMethodsTab } from "@/components/PaymentMethodsTab";
import { AppointmentActionsModal } from "@/components/AppointmentActionsModal";
import { PostConsultationSurvey } from "@/components/PostConsultationSurvey";
import { CalendarView } from "@/components/CalendarView";
import { PatientCalendar } from "@/pages/PatientCalendar";
import { calculateHealthProfileCompletion } from "@/lib/healthProfileUtils";
import { MembershipChip } from "@/components/MembershipChip";

// Function to check if appointment is currently joinable (within 5 minutes of start time)
function isAppointmentJoinable(appointmentDate: string): boolean {
  const now = new Date();
  const appointmentTime = new Date(appointmentDate);
  const minutesUntilStart = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);

  // Allow joining 5 minutes before appointment until 60 minutes after (for consultation duration)
  return minutesUntilStart <= 5 && minutesUntilStart >= -60;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('dashboard');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [verificationJustCompleted, setVerificationJustCompleted] = useState(false);
  const [healthProfileOpen, setHealthProfileOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [appointmentAction, setAppointmentAction] = useState<"reschedule" | "cancel" | null>(null);
  const [showPostCallSurvey, setShowPostCallSurvey] = useState(false);
  const [surveyAppointment, setSurveyAppointment] = useState<any>(null);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Check if user just completed verification or booking
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === '1') {
      setVerificationJustCompleted(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/dashboard');
    }

    // Check for booking success
    if (urlParams.get('booking') === 'success') {
      toast({
        title: t('dashboard.patient.toasts.booking_confirmed.title'),
        description: t('dashboard.patient.toasts.booking_confirmed.description'),
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', '/dashboard');
    }

    // Show banner if user is not email verified and didn't just complete verification
    // Note: email_verified property is not available in current user schema
    // This feature will be implemented when email verification is added
    if (user && !verificationJustCompleted) {
      // Placeholder for email verification check
      // setShowVerificationBanner(true);
    }
  }, [user, verificationJustCompleted, toast]);

  // Redirect unauthenticated users to home page immediately
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Dashboard: Unauthenticated access blocked, redirecting to home');
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Redirect non-patients to appropriate dashboards
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'doctor') {
        setLocation('/doctor-dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (user.role !== 'patient') {
        setLocation('/');
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
  });

  // Check subscription status for incomplete payments
  const { data: subscriptionData } = useQuery<{
    hasSubscription: boolean;
    subscription?: {
      id: string;
      status: string;
      plan: string;
      amount: number;
      currency: string;
    };
  }>({
    queryKey: ["/api/membership/subscription"],
    enabled: isAuthenticated,
  });



  // All appointments (past, present, future) 
  const allAppointments = appointments || [];

  // Change email mutation
  const changeEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('PUT', '/api/auth/change-email', { email });
    },
    onSuccess: () => {
      toast({
        title: t('dashboard.patient.toasts.email_change_requested.title'),
        description: t('dashboard.patient.toasts.email_change_requested.description'),
      });
      setShowEmailChange(false);
      setNewEmail('');
    },
    onError: (error: any) => {
      toast({
        title: t('dashboard.patient.toasts.error.title'),
        description: error.message || t('dashboard.patient.toasts.error.description'),
        variant: "destructive",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('PUT', '/api/auth/change-password', data);
    },
    onSuccess: () => {
      toast({
        title: t('dashboard.patient.toasts.password_changed.title'),
        description: t('dashboard.patient.toasts.password_changed.description'),
      });
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: t('dashboard.patient.toasts.error.title'),
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  });

  // Fetch document counts for appointments
  const { data: documentCounts = {} } = useQuery({
    queryKey: ["/api/appointments/document-counts"],
    enabled: isAuthenticated && allAppointments.length > 0,
    queryFn: async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        allAppointments.map(async (appointment: any) => {
          try {
            const response = await fetch(`/api/appointments/${appointment.id}/documents`, {
              credentials: 'include',
            });
            if (response.ok) {
              const docs = await response.json();
              counts[appointment.id] = docs.length;
            } else {
              counts[appointment.id] = 0;
            }
          } catch {
            counts[appointment.id] = 0;
          }
        })
      );
      return counts;
    },
  });

  // Auto-trigger post-consultation survey for recently completed appointments
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'patient' || allAppointments.length === 0) return;

    const now = new Date();

    // Find appointments that ended in the last 5 minutes (after 60-minute consultation window)
    const recentlyCompletedAppointments = allAppointments.filter((apt: any) => {
      if (apt.status !== 'paid') return false;

      const appointmentTime = new Date(apt.appointmentDate);
      const consultationEndTime = new Date(appointmentTime.getTime() + 60 * 60 * 1000); // 60 minutes after start
      const timeSinceEnd = now.getTime() - consultationEndTime.getTime();

      // Show survey if consultation ended within last 5 minutes
      return timeSinceEnd >= 0 && timeSinceEnd <= 5 * 60 * 1000;
    });

    if (recentlyCompletedAppointments.length > 0 && !showPostCallSurvey) {
      // Get the most recent completed appointment
      const mostRecent = recentlyCompletedAppointments.sort((a, b) =>
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      )[0];

      // Check if we've already shown survey for this appointment (using localStorage)
      const surveyShown = localStorage.getItem(`survey_shown_${mostRecent.id}`);
      if (!surveyShown) {
        setSurveyAppointment(mostRecent);
        setShowPostCallSurvey(true);
        localStorage.setItem(`survey_shown_${mostRecent.id}`, 'true');
      }
    }
  }, [allAppointments, isAuthenticated, user, showPostCallSurvey]);

  // Get unique doctors from appointments
  const uniqueDoctors = allAppointments.reduce((doctors: any[], appointment: any) => {
    const doctor = appointment.doctor;
    if (!doctor) return doctors;
    
    const existingDoctor = doctors.find(d => d.id === doctor.id);
    if (existingDoctor) {
      existingDoctor.appointmentCount += 1;
    } else {
      doctors.push({
        ...doctor,
        appointmentCount: 1
      });
    }
    return doctors;
  }, []);

  // Fetch health profile for banner system and profile tab
  const { data: healthProfile, isLoading: healthProfileLoading } = useQuery<{
    profileStatus: 'incomplete' | 'complete' | 'needs_review';
    lastUpdated?: string;
  }>({
    queryKey: ["/api/health-profile", user?.id],
    enabled: !!user?.id,
  });



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Block access for unauthenticated users
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Block access for non-patients
  if (user?.role !== 'patient') {
    return null; // Will redirect via useEffect
  }

  // Categorize appointments by timing
  const { upcoming, live, completed } = categorizeAppointmentsByTiming(appointments);
  
  // Filter out live video appointments from upcoming to avoid duplication
  const upcomingWithoutLive = upcoming.filter(apt => !live.some(liveApt => liveApt.id === apt.id));
  
  // Limit to 3 appointments for dashboard preview
  const upcomingAppointments = upcomingWithoutLive.slice(0, 3);
  const hasMoreAppointments = upcomingWithoutLive.length > 3;

  // Past appointments: completed appointments
  const pastAppointments = completed;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending", className: undefined },
      confirmed: { variant: "default" as const, label: "Confirmed", className: undefined },
      paid: { variant: "default" as const, label: "Paid", className: undefined },
      completed: { variant: "default" as const, label: "Completed", className: "bg-green-500" },
      cancelled: { variant: "destructive" as const, label: "Cancelled", className: undefined },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className={config.className || ""}>
        {config.label}
      </Badge>
    );
  };

  const canJoinVideo = (appointment: any) => {
    // Use proper timezone conversion for appointment time
    const appointmentTime = utcToLocal(appointment.appointmentDate);
    const now = new Date();
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff <= 5 && minutesDiff >= -60 && (appointment.status === "paid" || appointment.status === "confirmed");
  };



  const handleBookAppointment = () => {
    setLocation('/doctors');
  };

  // Editable Profile Form Component
  const EditableProfileForm = ({ user }: { user: any }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
      title: user?.title || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });

    // Keep form data in sync with user prop changes
    useEffect(() => {
      if (!isEditing) {
        setFormData({
          title: user?.title || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || ''
        });
      }
    }, [user, isEditing]);

    const updateProfileMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest("PATCH", "/api/auth/user", data);
        return response.json();
      },
      onSuccess: (updatedUser) => {
        // Optimistic update: immediately update the cache with new data
        queryClient.setQueryData(["/api/auth/user"], updatedUser);
        
        toast({
          title: t('dashboard.patient.toasts.profile_updated.title'),
          description: t('dashboard.patient.toasts.profile_updated.description'),
        });
        
        // Set editing to false after a brief delay to prevent double-click issue
        setTimeout(() => {
          setIsEditing(false);
        }, 50);
      },
      onError: (error: any) => {
        toast({
          title: t('dashboard.patient.toasts.update_failed.title'),
          description: error.message || t('dashboard.patient.toasts.update_failed.description'),
          variant: "destructive",
        });
      },
    });

    const handleSave = () => {
      updateProfileMutation.mutate(formData);
    };

    const handleCancel = () => {
      setFormData({
        title: user?.title || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || ''
      });
      setIsEditing(false);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t('dashboard.patient.profile.title')}</h3>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="h-10">
              <Edit2 className="h-4 w-4 mr-2" />
              {t('dashboard.patient.profile.edit')}
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                className="h-10"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                {t('dashboard.patient.profile.cancel')}
              </Button>
              <Button
                className="h-10"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {t('dashboard.patient.profile.save')}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-1">
            <Label htmlFor="title" className="text-sm font-medium">{t('dashboard.patient.profile.title_label')}</Label>
            {isEditing ? (
              <Select
                value={formData.title}
                onValueChange={(value) => setFormData({...formData, title: value})}
              >
                <SelectTrigger className="mt-1 h-11">
                  <SelectValue placeholder={t('dashboard.patient.profile.select_title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.title || t('dashboard.patient.profile.not_specified')}</p>
            )}
          </div>

          <div className="sm:col-span-1">
            <Label htmlFor="firstName" className="text-sm font-medium">{t('dashboard.patient.profile.first_name')}</Label>
            {isEditing ? (
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder={t('dashboard.patient.profile.enter_first_name')}
                className="mt-1 h-11"
              />
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.firstName || t('dashboard.patient.profile.not_specified')}</p>
            )}
          </div>

          <div className="sm:col-span-1">
            <Label htmlFor="lastName" className="text-sm font-medium">{t('dashboard.patient.profile.last_name')}</Label>
            {isEditing ? (
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder={t('dashboard.patient.profile.enter_last_name')}
                className="mt-1 h-11"
              />
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.lastName || t('dashboard.patient.profile.not_specified')}</p>
            )}
          </div>


        </div>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('dashboard.patient.title')}</h1>
            <p className="text-gray-600 text-sm sm:text-base">{t('dashboard.patient.welcome')}, {user?.firstName || "Patient"}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MembershipChip />
            <Button
              onClick={handleBookAppointment}
              className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] h-11 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('dashboard.patient.book_new_appointment')}</span>
              <span className="sm:hidden">{t('dashboard.patient.book_appointment')}</span>
            </Button>
          </div>
        </div>

        {/* Incomplete subscription banner */}
        {subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'incomplete' && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="flex items-center justify-between w-full">
              <div>
                <h4 className="font-semibold text-orange-900">{t('dashboard.patient.complete_membership_payment.title')}</h4>
                <p className="text-sm text-orange-800 mt-1">
                  {t('dashboard.patient.complete_membership_payment.description')}
                </p>
              </div>
              <Button
                onClick={() => setLocation('/complete-subscription')}
                className="bg-orange-600 hover:bg-orange-700 text-white ml-4"
              >
                {t('dashboard.patient.complete_membership_payment.button')}
              </Button>
            </div>
          </Alert>
        )}

        {/* Removed duplicate blue banner - BannerSystem now handles live appointments with green banner */}

        {/* Unified Banner System - Handles payment, live appointments, and health profile banners with proper priority */}
        {user && (
          <div className="mb-4">
            <BannerSystem 
              onOpenHealthProfile={() => setHealthProfileOpen(true)}
              onOpenDocumentUpload={(appointmentId) => {
                setSelectedAppointmentId(appointmentId);
                setDocumentUploadOpen(true);
              }}
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-0 sm:px-4">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="appointments" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
                <TabsTrigger value="appointments" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  <span className="hidden sm:inline">{t('dashboard.patient.tabs.appointments')}</span>
                  <span className="sm:hidden">{t('dashboard.patient.tabs.appointments_short')}</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs sm:text-sm py-2 px-2 sm:px-4">{t('dashboard.patient.tabs.calendar')}</TabsTrigger>
                <TabsTrigger value="doctors" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  <span className="hidden sm:inline">{t('dashboard.patient.tabs.doctors')}</span>
                  <span className="sm:hidden">{t('dashboard.patient.tabs.doctors_short')}</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 px-2 sm:px-4">{t('dashboard.patient.tabs.settings')}</TabsTrigger>
              </TabsList>

              <TabsContent value="appointments" className="space-y-6">
                {/* Upcoming Appointments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        {t('dashboard.patient.upcoming_appointments')}
                      </CardTitle>
                      {hasMoreAppointments && (
                        <Button variant="ghost" size="sm" onClick={() => setLocation('/doctors')}>
                          {t('dashboard.patient.appointments.see_all')} ({upcoming.length})
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {appointmentsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : upcomingAppointments.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">{t('dashboard.patient.no_appointments')}</p>
                        <Button onClick={handleBookAppointment} className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('dashboard.patient.book_appointment')}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingAppointments.map((appointment: any) => (
                          <div key={appointment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">
                                      {appointment.doctor?.user?.firstName?.[0]}{appointment.doctor?.user?.lastName?.[0]}
                                    </span>
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-gray-900">
                                      Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                                    </h3>
                                    <p className="text-sm text-gray-600">{appointment.doctor?.specialty}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Document count badge */}
                                  {documentCounts[appointment.id] > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-gray-200 text-xs"
                                      onClick={() => {
                                        setSelectedAppointmentId(appointment.id);
                                        setDocumentUploadOpen(true);
                                      }}
                                    >
                                      {t('dashboard.patient.appointments.docs_badge')} ({documentCounts[appointment.id]})
                                    </Badge>
                                  )}
                                  {getStatusBadge(appointment.status)}
                                </div>
                              </div>

                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
{formatAppointmentDateTimeUS(appointment.appointmentDate)}
                                </div>
                                <div className="flex items-center">
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  €{appointment.price}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                                {/* Video Consultation Button - only show when appointment is live/joinable */}
                                {(appointment.status === 'paid' || appointment.status === 'confirmed') && appointment.zoomMeetingId && isAppointmentJoinable(appointment.appointmentDate) && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-9 flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                    onClick={() => setLocation(`/video-consultation/${appointment.id}`)}
                                  >
                                    <Video className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">{t('dashboard.patient.appointments.join_video_call')}</span>
                                    <span className="sm:hidden">{t('dashboard.patient.appointments.video')}</span>
                                  </Button>
                                )}

                                {/* Show meeting info for future appointments */}
                                {(appointment.status === 'paid' || appointment.status === 'confirmed') && appointment.zoomMeetingId && !isAppointmentJoinable(appointment.appointmentDate) && (
                                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                                    <Video className="h-4 w-4 mr-2" />
                                    <span>{t('dashboard.patient.video_consultation.available_soon')}</span>
                                  </div>
                                )}

                                {/* Pre-consultation actions */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointmentId(appointment.id);
                                    setDocumentUploadOpen(true);
                                  }}
                                  className="h-9 flex-1 sm:flex-none"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">{t('dashboard.patient.appointments.upload_docs')}</span>
                                  <span className="sm:hidden">{t('dashboard.patient.appointments.upload_short')}</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 flex-1 sm:flex-none"
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setAppointmentAction("reschedule");
                                  }}
                                >
                                  {t('dashboard.patient.appointments.reschedule')}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setAppointmentAction("cancel");
                                  }}
                                  className="h-9 flex-1 sm:flex-none text-red-600 hover:text-red-700"
                                >
                                  {t('dashboard.patient.appointments.cancel')}
                                </Button>
                              </div>
                            </div>
                        ))}
                        {hasMoreAppointments && (
                          <div className="pt-4 border-t">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setLocation('/doctors')}
                            >
                              {t('dashboard.patient.appointments.book_more')} ({upcoming.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>


              </TabsContent>

              <TabsContent value="calendar">
                <PatientCalendar />
              </TabsContent>

              <TabsContent value="doctors">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      {t('dashboard.patient.my_doctors')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appointmentsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {uniqueDoctors.length === 0 ? (
                          <div className="text-center py-8">
                            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">{t('dashboard.patient.doctors.no_doctors')}</p>
                            <Button onClick={handleBookAppointment} className="mt-4 h-10 w-full sm:w-auto">
                              <Plus className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">{t('dashboard.patient.doctors.book_first')}</span>
                              <span className="sm:hidden">{t('dashboard.patient.doctors.book_first_short')}</span>
                            </Button>
                          </div>
                        ) : (
                          uniqueDoctors.map((doctor: any) => (
                            <Card key={doctor.id} className="border rounded-lg p-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                  <span className="text-white font-bold">
                                    {doctor.user?.firstName?.[0]}{doctor.user?.lastName?.[0]}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900">
                                    Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                                  </h3>
                                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                                  <p className="text-xs text-gray-500">
                                    {doctor.appointmentCount} {doctor.appointmentCount !== 1 ? t('dashboard.patient.doctors.appointments_count_plural') : t('dashboard.patient.doctors.appointments_count')}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLocation(`/doctor/${doctor.id}`)}
                                  className="h-9 px-3"
                                >
                                  <span className="hidden sm:inline">{t('dashboard.patient.doctors.view_profile')}</span>
                                  <span className="sm:hidden">{t('dashboard.patient.doctors.view_short')}</span>
                                </Button>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      {t('dashboard.patient.settings')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="profile" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
                        <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">{t('dashboard.patient.tabs_settings.profile')}</span>
                          <span className="sm:hidden">{t('dashboard.patient.tabs_settings.profile_short')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="health" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">{t('dashboard.patient.tabs_settings.health')}</span>
                          <span className="sm:hidden">{t('dashboard.patient.tabs_settings.health_short')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="payment" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">{t('dashboard.patient.tabs_settings.payment')}</span>
                          <span className="sm:hidden">{t('dashboard.patient.tabs_settings.payment_short')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="text-xs sm:text-sm py-2 px-1 sm:px-3">{t('dashboard.patient.tabs_settings.security')}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="profile">
                        <EditableProfileForm user={user} />
                      </TabsContent>

                      <TabsContent value="health">
                        {healthProfileLoading ? (
                          <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ) : !healthProfile ? (
                          <div className="text-center py-8">
                            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.patient.health_profile.complete_title')}</h3>
                            <p className="text-gray-600 mb-4">{t('dashboard.patient.health_profile.complete_description')}</p>
                            <Button onClick={() => setHealthProfileOpen(true)}>
                              <Heart className="h-4 w-4 mr-2" />
                              {t('dashboard.patient.health_profile.complete_button')}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Profile Status */}
                            <div className={`flex items-center justify-between p-4 rounded-lg border ${
                              calculateHealthProfileCompletion(healthProfile) === 100 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className="flex items-center space-x-2">
                                <Heart className={`h-5 w-5 ${
                                  calculateHealthProfileCompletion(healthProfile) === 100 
                                    ? 'text-green-600' 
                                    : 'text-yellow-600'
                                }`} />
                                <span className={`font-medium ${
                                  calculateHealthProfileCompletion(healthProfile) === 100
                                    ? 'text-green-900'
                                    : 'text-yellow-900'
                                }`}>
                                  {calculateHealthProfileCompletion(healthProfile) === 100
                                    ? t('dashboard.patient.health_profile.status_complete')
                                    : t('dashboard.patient.health_profile.status_in_progress')
                                  }
                                </span>
                              </div>
                              <Badge variant="secondary" className={
                                calculateHealthProfileCompletion(healthProfile) === 100
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }>
                                {calculateHealthProfileCompletion(healthProfile)}{t('dashboard.patient.health_profile.completion_percent')}
                              </Badge>
                            </div>



                            {/* Key Information */}
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">{t('dashboard.patient.health_profile.title')}</h3>
                                <Button
                                  variant="outline"
                                  onClick={() => setHealthProfileOpen(true)}
                                >
                                  {t('dashboard.patient.health_profile.edit_button')}
                                </Button>
                              </div>

                              {/* Basic Information */}
                              <div className="space-y-4">
                                <h4 className="font-medium text-gray-900">{t('dashboard.patient.health_profile.basic_info.title')}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('dashboard.patient.health_profile.basic_info.date_of_birth')}
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">
                                      {(healthProfile as any).dateOfBirth ?
                                        new Date((healthProfile as any).dateOfBirth).toLocaleDateString() :
                                        t('dashboard.patient.profile.not_specified')
                                      }
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('dashboard.patient.health_profile.basic_info.gender')}
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).gender || t('dashboard.patient.profile.not_specified')}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('dashboard.patient.health_profile.basic_info.height')}
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).height || t('dashboard.patient.profile.not_specified')}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('dashboard.patient.health_profile.basic_info.weight')}
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).weight || t('dashboard.patient.profile.not_specified')}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      {t('dashboard.patient.health_profile.basic_info.blood_type')}
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).bloodType || t('dashboard.patient.profile.not_specified')}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Documentation */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">{t('dashboard.patient.health_profile.documentation.title')}</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDocumentUploadOpen(true)}
                                    className="flex items-center gap-2"
                                    data-testid="button-view-document-library"
                                  >
                                    <FileText className="h-4 w-4" />
                                    {t('dashboard.patient.health_profile.documentation.view_library')}
                                  </Button>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border">
                                  <p className="text-sm text-gray-600 mb-2">
                                    {t('dashboard.patient.health_profile.documentation.description')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {t('dashboard.patient.health_profile.documentation.help_text')}
                                  </p>
                                </div>
                              </div>

                              {/* Medical Information */}
                              {((healthProfile as any).allergies?.length || (healthProfile as any).medications?.length || (healthProfile as any).medicalHistory?.length) && (
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">{t('dashboard.patient.health_profile.medical_info.title')}</h4>

                                  {(healthProfile as any).medicalHistory?.length > 0 && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('dashboard.patient.health_profile.medical_info.medical_history')}
                                      </label>
                                      <div className="p-2 bg-gray-50 rounded">
                                        {(healthProfile as any).medicalHistory.map((history: string, index: number) => (
                                          <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                            {history}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {(healthProfile as any).medications?.length > 0 && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('dashboard.patient.health_profile.medical_info.current_medications')}
                                      </label>
                                      <div className="p-2 bg-gray-50 rounded">
                                        {(healthProfile as any).medications.map((medication: string, index: number) => (
                                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                            {medication}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {(healthProfile as any).allergies?.length > 0 && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('dashboard.patient.health_profile.medical_info.allergies')}
                                      </label>
                                      <div className="p-2 bg-gray-50 rounded">
                                        {(healthProfile as any).allergies.map((allergy: string, index: number) => (
                                          <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                            {allergy}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Emergency Contact */}
                              {((healthProfile as any).emergencyContactName || (healthProfile as any).emergencyContactPhone) && (
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">{t('dashboard.patient.health_profile.emergency_contact.title')}</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('dashboard.patient.health_profile.emergency_contact.name')}
                                      </label>
                                      <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).emergencyContactName || t('dashboard.patient.profile.not_specified')}</p>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('dashboard.patient.health_profile.emergency_contact.phone')}
                                      </label>
                                      <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).emergencyContactPhone || t('dashboard.patient.profile.not_specified')}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Last Updated */}
                            <div className="text-sm text-gray-500 pt-4 border-t">
                              {t('dashboard.patient.health_profile.last_updated')} {(healthProfile as any).lastReviewedAt ?
                                new Date((healthProfile as any).lastReviewedAt).toLocaleDateString() :
                                t('dashboard.patient.health_profile.never')
                              }
                            </div>
                          </div>
                        )}
                      </TabsContent>



                      <TabsContent value="payment">
                        <PaymentMethodsTab />
                      </TabsContent>

                      <TabsContent value="security">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium">{t('dashboard.patient.security.title')}</h3>

                          <div className="space-y-4">
                            {/* Email Section */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('dashboard.patient.security.email.label')}
                              </label>
                              {!showEmailChange ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                  <span className="text-gray-900">{user?.email}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowEmailChange(true)}
                                  >
                                    {t('dashboard.patient.security.email.change_button')}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                                  <div>
                                    <Label htmlFor="newEmail">{t('dashboard.patient.security.email.new_label')}</Label>
                                    <Input
                                      id="newEmail"
                                      type="email"
                                      value={newEmail}
                                      onChange={(e) => setNewEmail(e.target.value)}
                                      placeholder={t('dashboard.patient.security.email.new_placeholder')}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (newEmail && newEmail !== user?.email) {
                                          changeEmailMutation.mutate(newEmail);
                                        }
                                      }}
                                      disabled={changeEmailMutation.isPending || !newEmail || newEmail === user?.email}
                                    >
                                      {changeEmailMutation.isPending ? t('dashboard.patient.security.email.updating') : t('dashboard.patient.security.email.update_button')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowEmailChange(false);
                                        setNewEmail('');
                                      }}
                                    >
                                      {t('dashboard.patient.security.email.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Password Section */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('dashboard.patient.security.password.label')}
                              </label>
                              {!showPasswordChange ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                  <span className="text-gray-500">{t('dashboard.patient.security.password.hidden')}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPasswordChange(true)}
                                  >
                                    {t('dashboard.patient.security.password.change_button')}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                                  <div>
                                    <Label htmlFor="currentPassword">{t('dashboard.patient.security.password.current_label')}</Label>
                                    <Input
                                      id="currentPassword"
                                      type="password"
                                      value={currentPassword}
                                      onChange={(e) => setCurrentPassword(e.target.value)}
                                      placeholder={t('dashboard.patient.security.password.current_placeholder')}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="newPassword">{t('dashboard.patient.security.password.new_label')}</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      placeholder={t('dashboard.patient.security.password.new_placeholder')}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="confirmPassword">{t('dashboard.patient.security.password.confirm_label')}</Label>
                                    <Input
                                      id="confirmPassword"
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder={t('dashboard.patient.security.password.confirm_placeholder')}
                                    />
                                  </div>
                                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-sm text-red-600">{t('dashboard.patient.security.password.mismatch')}</p>
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (currentPassword && newPassword && newPassword === confirmPassword) {
                                          changePasswordMutation.mutate({
                                            currentPassword,
                                            newPassword
                                          });
                                        }
                                      }}
                                      disabled={
                                        changePasswordMutation.isPending ||
                                        !currentPassword ||
                                        !newPassword ||
                                        !confirmPassword ||
                                        newPassword !== confirmPassword
                                      }
                                    >
                                      {changePasswordMutation.isPending ? t('dashboard.patient.security.password.updating') : t('dashboard.patient.security.password.update_button')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowPasswordChange(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                      }}
                                    >
                                      {t('dashboard.patient.security.password.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* GDPR & Privacy Section */}
                          <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">{t('dashboard.patient.security.privacy.title')}</h3>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 mb-3">
                                  {t('dashboard.patient.security.privacy.description')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation("/consent-management")}
                                  >
                                    <Settings className="h-4 w-4 mr-2" />
                                    {t('dashboard.patient.security.privacy.manage_consents')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation("/data-processing-records")}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('dashboard.patient.security.privacy.data_processing')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>


            </Tabs>
          </div>


        </div>
      </main>

      {/* Health Profile Sidebar */}
      <HealthProfileSidebar
        isOpen={healthProfileOpen}
        onClose={() => setHealthProfileOpen(false)}
      />

      {/* Document Library Panel */}
      <DocumentLibraryPanel
        isOpen={documentUploadOpen}
        onClose={() => {
          setDocumentUploadOpen(false);
          setSelectedAppointmentId(null);
        }}
        appointmentId={selectedAppointmentId || undefined}
      />

      {/* Appointment Actions Modal */}
      <AppointmentActionsModal
        appointment={selectedAppointment}
        action={appointmentAction}
        onClose={() => {
          setSelectedAppointment(null);
          setAppointmentAction(null);
        }}
      />

      {/* Post Consultation Survey */}
      {surveyAppointment && (
        <PostConsultationSurvey
          appointmentId={surveyAppointment.id}
          doctorName={`${surveyAppointment.doctor?.user?.firstName} ${surveyAppointment.doctor?.user?.lastName}`}
          isOpen={showPostCallSurvey}
          onClose={() => {
            setShowPostCallSurvey(false);
            setSurveyAppointment(null);
          }}
          userRole="patient"
        />
      )}
    </div>
  );
}