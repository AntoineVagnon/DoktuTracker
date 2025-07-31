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
import { Calendar, Clock, User, Heart, Settings, CreditCard, Plus, Video, CalendarCheck, Star, AlertCircle, Upload, Edit2, Save, X, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatAppointmentDateTimeUS, categorizeAppointmentsByTiming, getTimeUntilAppointment } from "@/lib/dateUtils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { BannerSystem } from "@/components/BannerSystem";
import { HealthProfileSidebar } from "@/components/HealthProfileSidebar";
import { DocumentUploadSidebar } from "@/components/DocumentUploadSidebar";

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
  }, [isAuthenticated, isLoading, toast]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
  });

  // All appointments (past, present, future) 
  const allAppointments = appointments || [];

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
  const { data: healthProfile, isLoading: healthProfileLoading } = useQuery({
    queryKey: ["/api/health-profile", user?.id],
    enabled: !!user?.id,
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been successfully cancelled.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
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
  
  // Limit to 3 appointments for dashboard preview
  const upcomingAppointments = upcoming.slice(0, 3);
  const hasMoreAppointments = upcoming.length > 3;

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
    const appointmentTime = new Date(appointment.appointmentDate);
    const now = new Date();
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff <= 5 && minutesDiff >= -30 && appointment.status === "paid";
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointmentMutation.mutate({
        appointmentId,
        reason: "Cancelled by patient",
      });
    }
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

    const updateProfileMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest("PATCH", "/api/auth/user", data);
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

          <div className="sm:col-span-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <p className="text-gray-900 p-3 mt-1 bg-gray-50 rounded-md">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Email changes require verification</p>
          </div>
        </div>
      </div>
    );
  };

  // Calendar Component
  const AppointmentCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const getAppointmentForDay = (date: Date) => {
      return allAppointments?.find((apt: any) => 
        isSameDay(new Date(apt.appointmentDate), date)
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-medium text-center sm:text-left">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="h-9 px-3"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-9 px-3"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="h-9 px-3"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1 sm:p-2 text-center font-medium text-gray-500 text-xs sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 1)}</span>
            </div>
          ))}
          
          {days.map((day, index) => {
            const appointment = getAppointmentForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={index}
                className={`
                  p-1 sm:p-2 h-16 sm:h-20 border rounded cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                  ${isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                  ${appointment ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'hover:bg-gray-50'}
                `}
                onClick={() => appointment && setSelectedAppointment(appointment)}
              >
                <div className="text-xs sm:text-sm font-medium">
                  {format(day, 'd')}
                </div>
                {appointment && (
                  <div className="text-xs text-green-700 mt-1 truncate">
                    <div className="font-medium">{format(new Date(appointment.appointmentDate), 'HH:mm')}</div>
                    <div className="hidden sm:block truncate">Dr. {appointment.doctor?.user?.lastName}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedAppointment && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Appointment Details
                <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Doctor:</strong> Dr. {selectedAppointment.doctor?.user?.firstName} {selectedAppointment.doctor?.user?.lastName}</p>
              <p><strong>Specialty:</strong> {selectedAppointment.doctor?.specialty}</p>
              <p><strong>Date & Time:</strong> {formatAppointmentDateTimeUS(selectedAppointment.appointmentDate)}</p>
              <p><strong>Status:</strong> {getStatusBadge(selectedAppointment.status)}</p>
              <p><strong>Price:</strong> €{selectedAppointment.price || '35'}</p>
            </CardContent>
          </Card>
        )}
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

        {/* Live Appointments Banner */}
        {live.length > 0 && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                <Activity className="h-5 w-5" />
                Live Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {live.map((appointment: any) => (
                  <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white border border-green-200 rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="font-medium text-base text-green-800">
                        Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                      </div>
                      <div className="text-sm text-green-600 mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatAppointmentDateTimeUS(appointment.appointmentDate)} • {getTimeUntilAppointment(appointment.appointmentDate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2">
                      <span className="text-sm sm:text-base text-green-600 font-medium">
                        €{appointment.price}
                      </span>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 px-3">
                        <Video className="h-4 w-4 mr-2 sm:mr-0" />
                        <span className="sm:hidden">Join</span>
                        <span className="hidden sm:inline">Join Call</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner System */}
        <BannerSystem 
          className="mb-6" 
          onOpenHealthProfile={() => setHealthProfileOpen(true)}
          onOpenDocumentUpload={(appointmentId) => {
            setSelectedAppointmentId(appointmentId);
            setDocumentUploadOpen(true);
          }}
        />

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
                              {getStatusBadge(appointment.status)}
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
                              {canJoinVideo(appointment) && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 flex-1 sm:flex-none">
                                  <Video className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Join Video Call</span>
                                  <span className="sm:hidden">Join Call</span>
                                </Button>
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

                              <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none">
                                Reschedule
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCancelAppointment(appointment.id)}
                                disabled={cancelAppointmentMutation.isPending}
                                className="h-9 flex-1 sm:flex-none"
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Calendar View
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AppointmentCalendar />
                  </CardContent>
                </Card>
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
                                  onClick={() => setLocation(`/doctors/${doctor.id}`)}
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
                        ) : !healthProfile || healthProfile.profileStatus === 'incomplete' ? (
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
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center space-x-2">
                                <Heart className="h-5 w-5 text-green-600" />
                                <span className="font-medium text-green-900">Health Profile Complete</span>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {healthProfile.completionScore}% Complete
                              </Badge>
                            </div>

                            {/* Key Information */}
                            <div className="space-y-4">
                              <h3 className="text-lg font-medium">Key Information</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date of Birth
                                  </label>
                                  <p className="text-gray-900">
                                    {healthProfile.dateOfBirth ? 
                                      new Date(healthProfile.dateOfBirth).toLocaleDateString() : 
                                      'Not specified'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gender
                                  </label>
                                  <p className="text-gray-900">{healthProfile.gender || 'Not specified'}</p>
                                </div>
                              </div>

                              <div>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setHealthProfileOpen(true)}
                                >
                                  Edit Health Profile
                                </Button>
                              </div>
                            </div>

                            {/* Last Updated */}
                            <div className="text-sm text-gray-500 pt-4 border-t">
                              Last updated: {healthProfile.lastReviewedAt ? 
                                new Date(healthProfile.lastReviewedAt).toLocaleDateString() : 
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
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Primary Email
                              </label>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="text-gray-900">{user?.email}</span>
                                <Button variant="outline" size="sm">
                                  Change Email
                                </Button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                              </label>
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="text-gray-500">••••••••••••</span>
                                <Button variant="outline" size="sm">
                                  Change Password
                                </Button>
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

      {/* Document Upload Sidebar */}
      {selectedAppointmentId && (
        <DocumentUploadSidebar
          isOpen={documentUploadOpen}
          onClose={() => {
            setDocumentUploadOpen(false);
            setSelectedAppointmentId(null);
          }}
          appointmentId={selectedAppointmentId}
        />
      )}
    </div>
  );
}