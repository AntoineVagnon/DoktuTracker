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
import { Calendar, Clock, User, Heart, Settings, CreditCard, Plus, Video, CalendarCheck, Star, AlertCircle, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatAppointmentDateTimeUS } from "@/lib/dateUtils";
import { format } from "date-fns";
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
  });

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

  // Upcoming appointments: not cancelled and time is in the future
  const allUpcomingAppointments = appointments.filter((apt: any) => 
    apt.status !== "cancelled" && new Date(apt.appointmentDate) > new Date()
  );
  
  // Limit to 3 appointments for dashboard preview
  const upcomingAppointments = allUpcomingAppointments.slice(0, 3);
  const hasMoreAppointments = allUpcomingAppointments.length > 3;

  // Past appointments: completed OR time has passed (but not cancelled)
  const pastAppointments = appointments.filter((apt: any) => 
    apt.status !== "cancelled" && (apt.status === "completed" || new Date(apt.appointmentDate) <= new Date())
  );

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.firstName || "Patient"}</p>
          </div>

          <Button 
            onClick={handleBookAppointment}
            className="bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book New Appointment
          </Button>
        </div>

        {/* Banner System */}
        <BannerSystem 
          className="mb-6" 
          onOpenHealthProfile={() => setHealthProfileOpen(true)}
          onOpenDocumentUpload={(appointmentId) => {
            setSelectedAppointmentId(appointmentId);
            setDocumentUploadOpen(true);
          }}
        />

        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="appointments" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="doctors">My Doctors</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
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
                          See All ({allUpcomingAppointments.length})
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

                            <div className="flex items-center space-x-2">
                              {canJoinVideo(appointment) && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <Video className="h-4 w-4 mr-2" />
                                  Join Video Call
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
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Docs
                              </Button>



                              <Button variant="outline" size="sm">
                                Reschedule
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCancelAppointment(appointment.id)}
                                disabled={cancelAppointmentMutation.isPending}
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
                              Book more appointments ({allUpcomingAppointments.length})
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
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Calendar view coming soon</p>
                    </div>
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
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Your doctor history coming soon</p>
                    </div>
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
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="profile">My Profile</TabsTrigger>
                        <TabsTrigger value="health">Health Profile</TabsTrigger>
                        <TabsTrigger value="billing">Billing</TabsTrigger>
                        <TabsTrigger value="payment">Payment Methods</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                      </TabsList>

                      <TabsContent value="profile">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Personal Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                              </label>
                              <p className="text-gray-900">{user?.title || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                First Name
                              </label>
                              <p className="text-gray-900">{user?.firstName || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Last Name
                              </label>
                              <p className="text-gray-900">{user?.lastName || 'Not specified'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                              </label>
                              <p className="text-gray-900">{user?.email}</p>
                            </div>
                          </div>
                        </div>
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

                      <TabsContent value="billing">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Billing & Payments</h3>
                          <p className="text-gray-600">View your payment history and manage billing information.</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="payment">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Payment Methods</h3>
                          <p className="text-gray-600">Manage your saved payment methods.</p>
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