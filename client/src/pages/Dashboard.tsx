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
import { Calendar, Clock, User, Heart, Settings, CreditCard, Plus, Video, CalendarCheck, Star, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [verificationJustCompleted, setVerificationJustCompleted] = useState(false);

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

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
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

  const upcomingAppointments = appointments.filter((apt: any) => 
    apt.status !== "cancelled" && apt.status !== "completed" && new Date(apt.appointmentDate) > new Date()
  );

  const pastAppointments = appointments.filter((apt: any) => 
    apt.status === "completed" || new Date(apt.appointmentDate) <= new Date()
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      paid: { variant: "default" as const, label: "Paid" },
      completed: { variant: "default" as const, label: "Completed", className: "bg-green-500" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} {...(config.className && { className: config.className })}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="appointments" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="book">Book New</TabsTrigger>
                <TabsTrigger value="profile">Health Profile</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
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
                      <Button variant="ghost" size="sm">See All</Button>
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
                        <p className="text-gray-600 mb-4">Book an appointment with our specialist</p>
                        <Button onClick={handleBookAppointment}>
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
                                {format(new Date(appointment.appointmentDate), "MMM d, yyyy 'at' h:mm a")}
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consultation History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CalendarCheck className="h-5 w-5 mr-2" />
                      Consultation History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pastAppointments.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No consultation history</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pastAppointments.slice(0, 5).map((appointment: any) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-gray-600 font-medium text-sm">
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

                            <p className="text-sm text-gray-600 mb-2">
                              {format(new Date(appointment.appointmentDate), "MMM d, yyyy 'at' h:mm a")}
                            </p>

                            {appointment.status === "completed" && (
                              <Button variant="ghost" size="sm">
                                <Star className="h-4 w-4 mr-2" />
                                Leave Review
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="book">
                <Card>
                  <CardHeader>
                    <CardTitle>Book New Appointment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Browse our available doctors and schedule your consultation.</p>
                    <Button onClick={handleBookAppointment} className="mt-4">Browse Doctors</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Health Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Manage your health information and medical history.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">View your payment history and manage billing information.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleBookAppointment}
                  className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>

                <Button variant="outline" className="w-full">
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  My Calendar
                </Button>

                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  My Doctors
                </Button>

                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  My Profile
                </Button>
              </CardContent>
            </Card>

            {/* Health Tips */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Health Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">
                  Don't forget to take your medications according to prescriptions and maintain regular follow-up with your doctors.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}