import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Calendar, Clock, User, Heart, Settings, CreditCard, Plus, Video, CalendarCheck, Star, AlertCircle, Upload, Edit2, Save, X, Activity, FileText, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatAppointmentDateTimeUS, categorizeAppointmentsByTiming, getTimeUntilAppointment } from "@/lib/dateUtils";
import { formatAppointmentTime, utcToLocal } from "@/lib/timezoneUtils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { BannerSystem } from "@/components/BannerSystem";
import { HealthProfileSidebar } from "@/components/HealthProfileSidebar";
import { DocumentLibraryPanel } from "@/components/DocumentLibraryPanel";
import { AppointmentActionsModal } from "@/components/AppointmentActionsModal";
import { VideoConsultation } from "@/components/VideoConsultation";
import { PostConsultationSurvey } from "@/components/PostConsultationSurvey";
import { CalendarView } from "@/components/CalendarView";
import { PatientCalendar } from "@/pages/PatientCalendar";
import { calculateHealthProfileCompletion } from "@/lib/healthProfileUtils";

// Function to check if appointment is currently joinable (within 10 minutes of start time)
function isAppointmentJoinable(appointmentDate: string): boolean {
  const now = new Date();
  const appointmentTime = new Date(appointmentDate);
  const minutesUntilStart = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
  
  // Allow joining 10 minutes before appointment until 60 minutes after (for consultation duration)
  return minutesUntilStart <= 10 && minutesUntilStart >= -60;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
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
        title: "Booking Confirmed!",
        description: "Your appointment has been successfully booked. You'll receive a confirmation email shortly.",
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

  // More gentle authentication check - avoid aggressive redirects during navigation
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Only redirect if we're sure the user is actually logged out
      // Add a delay to prevent interrupting navigation or temporary auth states
      const redirectTimer = setTimeout(() => {
        // Double-check auth state before redirecting
        if (!isAuthenticated) {
          console.log('Dashboard: User authentication lost, redirecting to login');
          toast({
            title: "Session Expired", 
            description: "Please log in again to continue.",
            variant: "destructive",
          });
          window.location.href = "/api/login";
        }
      }, 2000); // 2 second delay to prevent interrupting navigation
      
      return () => clearTimeout(redirectTimer);
    }

    // Role-based redirects
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'doctor') {
        setLocation('/doctor-dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      }
      // Patients stay on the regular dashboard
    }
  }, [isAuthenticated, isLoading, toast, user, setLocation]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
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
        title: "Email Change Requested",
        description: "Please check your new email address for a confirmation link.",
      });
      setShowEmailChange(false);
      setNewEmail('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change email",
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
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
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



  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
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

    return minutesDiff <= 5 && minutesDiff >= -30 && appointment.status === "paid";
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
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        
        // Set editing to false after a brief delay to prevent double-click issue
        setTimeout(() => {
          setIsEditing(false);
        }, 50);
      },
      onError: (error: any) => {
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update profile.",
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
          <h3 className="text-lg font-medium">Personal Information</h3>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="h-10">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
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
                Cancel
              </Button>
              <Button 
                className="h-10"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-1">
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            {isEditing ? (
              <Select 
                value={formData.title} 
                onValueChange={(value) => setFormData({...formData, title: value})}
              >
                <SelectTrigger className="mt-1 h-11">
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.title || 'Not specified'}</p>
            )}
          </div>
          
          <div className="sm:col-span-1">
            <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
            {isEditing ? (
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Enter first name"
                className="mt-1 h-11"
              />
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.firstName || 'Not specified'}</p>
            )}
          </div>

          <div className="sm:col-span-1">
            <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
            {isEditing ? (
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Enter last name"
                className="mt-1 h-11"
              />
            ) : (
              <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.lastName || 'Not specified'}</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base">Welcome back, {user?.firstName || "Patient"}</p>
          </div>

          <Button 
            onClick={handleBookAppointment}
            className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)] h-11 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Book New Appointment</span>
            <span className="sm:hidden">Book Appointment</span>
          </Button>
        </div>

        {/* Live Appointments Banner - Compact */}
        {live.length > 0 && (
          <div className="mb-4 space-y-4">
            {live.map((appointment: any) => (
              <VideoConsultation 
                key={appointment.id}
                appointment={appointment}
                userRole="patient"
                onStatusUpdate={(status) => {
                  if (status === 'ended') {
                    setSurveyAppointment(appointment);
                    setShowPostCallSurvey(true);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Health Profile Completion Banner - Always visible until 100% complete */}
        {user && healthProfile && !healthProfileLoading && calculateHealthProfileCompletion(healthProfile) < 100 && (
          <Card className="mb-4 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Complete Your Health Profile ({calculateHealthProfileCompletion(healthProfile)}% complete)
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Add the remaining information to unlock all features and enable appointment bookings
                    </p>
                  </div>
                </div>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => setHealthProfileOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Complete Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="max-w-4xl mx-auto px-0 sm:px-4">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="appointments" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1">
                <TabsTrigger value="appointments" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  <span className="hidden sm:inline">Appointments</span>
                  <span className="sm:hidden">Appts</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Calendar</TabsTrigger>
                <TabsTrigger value="doctors" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                  <span className="hidden sm:inline">My Doctors</span>
                  <span className="sm:hidden">Doctors</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="appointments" className="space-y-6">
                {/* Upcoming Appointments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Upcoming Appointments
                      </CardTitle>
                      {hasMoreAppointments && (
                        <Button variant="ghost" size="sm" onClick={() => setLocation('/doctors')}>
                          See All ({upcoming.length})
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
                        <p className="text-gray-600 mb-4">No upcoming appointments</p>
                        <Button onClick={handleBookAppointment} className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
                          <Plus className="h-4 w-4 mr-2" />
                          Book an appointment
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
                                      Docs ({documentCounts[appointment.id]})
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
                                {appointment.status === 'paid' && appointment.zoomMeetingId && isAppointmentJoinable(appointment.appointmentDate) && (
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="h-9 flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                    onClick={() => setLocation(`/video-consultation/${appointment.id}`)}
                                  >
                                    <Video className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">Join Video Call</span>
                                    <span className="sm:hidden">Video</span>
                                  </Button>
                                )}
                                
                                {/* Show meeting info for future appointments */}
                                {appointment.status === 'paid' && appointment.zoomMeetingId && !isAppointmentJoinable(appointment.appointmentDate) && (
                                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                                    <Video className="h-4 w-4 mr-2" />
                                    <span>Video call available 10 min before appointment</span>
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
                                  <span className="hidden sm:inline">Upload Docs</span>
                                  <span className="sm:hidden">Upload</span>
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
                                  Reschedule
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
                                  Cancel
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
                              Book more appointments ({upcoming.length})
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
                      My Doctors
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
                            <p className="text-gray-600">No doctor consultations yet</p>
                            <Button onClick={handleBookAppointment} className="mt-4 h-10 w-full sm:w-auto">
                              <Plus className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Book your first appointment</span>
                              <span className="sm:hidden">Book Appointment</span>
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
                                    {doctor.appointmentCount} appointment{doctor.appointmentCount !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/doctor/${doctor.id}`)}
                                  className="h-9 px-3"
                                >
                                  <span className="hidden sm:inline">View Profile</span>
                                  <span className="sm:hidden">View</span>
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
                      Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="profile" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
                        <TabsTrigger value="profile" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">My Profile</span>
                          <span className="sm:hidden">Profile</span>
                        </TabsTrigger>
                        <TabsTrigger value="health" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">Health Profile</span>
                          <span className="sm:hidden">Health</span>
                        </TabsTrigger>
                        <TabsTrigger value="payment" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                          <span className="hidden sm:inline">Payment Methods</span>
                          <span className="sm:hidden">Payment</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Security</TabsTrigger>
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
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Your Health Profile</h3>
                            <p className="text-gray-600 mb-4">Add your health information to enable appointment bookings</p>
                            <Button onClick={() => setHealthProfileOpen(true)}>
                              <Heart className="h-4 w-4 mr-2" />
                              Complete Profile
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
                                    ? 'Health Profile Complete' 
                                    : 'Health Profile In Progress'
                                  }
                                </span>
                              </div>
                              <Badge variant="secondary" className={
                                calculateHealthProfileCompletion(healthProfile) === 100 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }>
                                {calculateHealthProfileCompletion(healthProfile)}% Complete
                              </Badge>
                            </div>



                            {/* Key Information */}
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Health Information</h3>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setHealthProfileOpen(true)}
                                >
                                  Edit Health Profile
                                </Button>
                              </div>

                              {/* Basic Information */}
                              <div className="space-y-4">
                                <h4 className="font-medium text-gray-900">Basic Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Date of Birth
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">
                                      {(healthProfile as any).dateOfBirth ? 
                                        new Date((healthProfile as any).dateOfBirth).toLocaleDateString() : 
                                        'Not specified'
                                      }
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Gender
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).gender || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Height
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).height || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Weight
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).weight || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Blood Type
                                    </label>
                                    <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).bloodType || 'Not specified'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Medical Information */}
                              {((healthProfile as any).allergies?.length || (healthProfile as any).medications?.length || (healthProfile as any).medicalHistory?.length) && (
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">Medical Information</h4>
                                  
                                  {(healthProfile as any).medicalHistory?.length > 0 && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Medical History
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
                                        Current Medications
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
                                        Allergies
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
                                  <h4 className="font-medium text-gray-900">Emergency Contact</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Name
                                      </label>
                                      <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).emergencyContactName || 'Not specified'}</p>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact Phone
                                      </label>
                                      <p className="text-gray-900 p-2 bg-gray-50 rounded">{(healthProfile as any).emergencyContactPhone || 'Not specified'}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Last Updated */}
                            <div className="text-sm text-gray-500 pt-4 border-t">
                              Last updated: {(healthProfile as any).lastReviewedAt ? 
                                new Date((healthProfile as any).lastReviewedAt).toLocaleDateString() : 
                                'Never'
                              }
                            </div>
                          </div>
                        )}
                      </TabsContent>



                      <TabsContent value="payment">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Payment Methods</h3>
                          <p className="text-gray-600 mb-4">Manage your saved payment methods for faster checkout.</p>
                          
                          <div className="border rounded-lg p-4">
                            <div className="text-center py-8">
                              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600 mb-4">No payment methods saved</p>
                              <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Payment Method
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="security">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium">Security Settings</h3>
                          
                          <div className="space-y-4">
                            {/* Email Section */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Primary Email
                              </label>
                              {!showEmailChange ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                  <span className="text-gray-900">{user?.email}</span>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowEmailChange(true)}
                                  >
                                    Change Email
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                                  <div>
                                    <Label htmlFor="newEmail">New Email Address</Label>
                                    <Input
                                      id="newEmail"
                                      type="email"
                                      value={newEmail}
                                      onChange={(e) => setNewEmail(e.target.value)}
                                      placeholder="Enter new email address"
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
                                      {changeEmailMutation.isPending ? 'Updating...' : 'Update Email'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowEmailChange(false);
                                        setNewEmail('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Password Section */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                              </label>
                              {!showPasswordChange ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                  <span className="text-gray-500">••••••••••••</span>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowPasswordChange(true)}
                                  >
                                    Change Password
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                                  <div>
                                    <Label htmlFor="currentPassword">Current Password</Label>
                                    <Input
                                      id="currentPassword"
                                      type="password"
                                      value={currentPassword}
                                      onChange={(e) => setCurrentPassword(e.target.value)}
                                      placeholder="Enter current password"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      placeholder="Enter new password"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                      id="confirmPassword"
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder="Confirm new password"
                                    />
                                  </div>
                                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-sm text-red-600">Passwords do not match</p>
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
                                      {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
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
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* GDPR & Privacy Section */}
                          <div className="space-y-4">
                            <h3 className="font-medium text-gray-900">Privacy & Data Protection</h3>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-600 mb-3">
                                  Manage your privacy preferences and access your data rights under GDPR
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation("/consent-management")}
                                  >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage Consents
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation("/data-processing-records")}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Data Processing Records
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
      {selectedAppointmentId && (
        <DocumentLibraryPanel
          isOpen={documentUploadOpen}
          onClose={() => {
            setDocumentUploadOpen(false);
            setSelectedAppointmentId(null);
          }}
          appointmentId={selectedAppointmentId}
        />
      )}

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