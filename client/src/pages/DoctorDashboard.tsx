import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import Calendar from "@/components/Calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Settings, 
  Video, 
  CheckCircle,
  X,
  MessageSquare,
  LogOut,
  Eye,
  Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, isToday, isTomorrow } from "date-fns";

export default function DoctorDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCalendar, setShowCalendar] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Redirect if not authenticated or not a doctor
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "doctor")) {
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
  }, [isAuthenticated, isLoading, user?.role, toast]);

  const { data: doctor } = useQuery({
    queryKey: [`/api/doctors/user/${user?.id}`],
    enabled: isAuthenticated && user?.role === "doctor",
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated && user?.role === "doctor",
  });

  const updateOnlineStatusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      if (!doctor) return;
      await apiRequest("PATCH", `/api/doctors/${doctor.id}/status`, { isOnline: online });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/user/${user?.id}`] });
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
        description: "Failed to update online status.",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status Updated",
        description: "Appointment status has been updated successfully.",
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
        description: "Failed to update appointment status.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (doctor) {
      setIsOnline(doctor.isOnline);
    }
  }, [doctor]);

  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    updateOnlineStatusMutation.mutate(checked);
  };

  if (isLoading || !isAuthenticated || user?.role !== "doctor") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const upcomingAppointments = appointments
    .filter((apt: any) => 
      apt.status !== "cancelled" && apt.status !== "completed" && 
      new Date(apt.appointmentDate) > new Date()
    )
    .sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 5);

  const todayAppointments = appointments.filter((apt: any) => 
    isToday(new Date(apt.appointmentDate)) && apt.status !== "cancelled"
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      paid: { variant: "default" as const, label: "Paid", className: "bg-blue-500" },
      completed: { variant: "default" as const, label: "Completed", className: "bg-green-500" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
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

  const getAppointmentTimeLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  const handleCompleteAppointment = (appointmentId: string) => {
    updateAppointmentStatusMutation.mutate({
      appointmentId,
      status: "completed",
    });
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      updateAppointmentStatusMutation.mutate({
        appointmentId,
        status: "cancelled",
      });
    }
  };

  if (showCalendar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
            <Button onClick={() => setShowCalendar(false)}>
              Back to Dashboard
            </Button>
          </div>
          <Calendar doctorId={doctor?.id} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
                <span className="text-lg font-bold text-white">D</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Doktu</span>
            </div>

            <div className="flex items-center space-x-6">
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              
              <Button variant="ghost" size="sm" asChild>
                <a href="/api/logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, Dr. {user?.firstName}
            </h1>
            <p className="text-gray-600">Manage your appointments and availability</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Online Status</span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
                disabled={updateOnlineStatusMutation.isPending}
              />
              <span className={`text-sm ${isOnline ? "text-green-600" : "text-gray-500"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Today's Schedule
                  </CardTitle>
                  <Badge variant="secondary">
                    {todayAppointments.length} appointment{todayAppointments.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No appointments scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment: any) => (
                      <div key={appointment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={appointment.patient?.profileImageUrl} />
                              <AvatarFallback>
                                {appointment.patient?.firstName?.[0]}{appointment.patient?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {appointment.patient?.firstName} {appointment.patient?.lastName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {format(new Date(appointment.appointmentDate), "h:mm a")}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {canJoinVideo(appointment) && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Video className="h-4 w-4 mr-2" />
                              Join Live
                            </Button>
                          )}
                          
                          {appointment.status === "paid" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                              disabled={updateAppointmentStatusMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleCancelAppointment(appointment.id)}
                            disabled={updateAppointmentStatusMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Upcoming Appointments
                  </CardTitle>
                  <Button variant="ghost" size="sm">View All</Button>
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
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment: any) => (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={appointment.patient?.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {appointment.patient?.firstName?.[0]}{appointment.patient?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {appointment.patient?.firstName} {appointment.patient?.lastName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {getAppointmentTimeLabel(new Date(appointment.appointmentDate))} at{" "}
                                {format(new Date(appointment.appointmentDate), "h:mm a")}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                  onClick={() => setShowCalendar(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Availability
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Patient Records
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Appointments</span>
                  <span className="font-medium">{appointments.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium text-green-600">
                    {appointments.filter((apt: any) => apt.status === "completed").length}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <span className="font-medium">{doctor?.rating || "5.0"} ⭐</span>
                </div>
              </CardContent>
            </Card>

            {/* Online Status Info */}
            <Card className={`${isOnline ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
                  <div>
                    <p className="font-medium text-sm">
                      {isOnline ? "You're Online" : "You're Offline"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {isOnline 
                        ? "Patients can see your available slots" 
                        : "Toggle online to accept new bookings"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
