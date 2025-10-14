import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Eye, Clock, Video, CheckCircle2, AlertCircle, XCircle, Ban } from "lucide-react";
import { Link, useLocation } from "wouter";
import DoctorLayout from "@/components/DoctorLayout";
import { formatUserFullName } from "@/lib/nameUtils";
import { formatAppointmentDateTime, categorizeAppointmentsByTiming, getTimeUntilAppointment } from "@/lib/dateUtils";

export default function DoctorDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments", "doctor"],
    enabled: !!user,
  });

  // Fetch doctor dashboard data (status, profile completion)
  const { data: doctorData, isLoading: doctorDataLoading } = useQuery<any>({
    queryKey: ["/api/doctor/dashboard"],
    enabled: !!user && user?.role === 'doctor',
  });

  // Redirect unauthenticated users to home page
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('DoctorDashboard: Unauthenticated access blocked, redirecting to home');
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Redirect non-doctors to appropriate dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'patient') {
        setLocation('/dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (user.role !== 'doctor') {
        setLocation('/');
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DoctorLayout>
    );
  }

  // Block access for unauthenticated users
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Block access for non-doctors
  if (user?.role !== 'doctor') {
    return null; // Will redirect via useEffect
  }

  // Categorize appointments by timing
  const { upcoming, live, completed } = categorizeAppointmentsByTiming(appointments);
  
  // Get upcoming appointments (limit to 3 for dashboard preview)
  const upcomingAppointments = upcoming.slice(0, 3);
  const hasMoreAppointments = upcoming.length > 3;
  
  // Get live appointments for banner/priority display
  const liveAppointments = live;

  const firstName = user?.firstName || user?.email?.split('@')[0] || '';

  // Helper function to get status badge color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending_review':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Under Review',
          color: 'text-yellow-600'
        };
      case 'approved':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          label: 'Approved',
          color: 'text-blue-600'
        };
      case 'active':
        return {
          variant: 'default' as const,
          icon: CheckCircle2,
          label: 'Active',
          color: 'text-green-600'
        };
      case 'suspended':
        return {
          variant: 'destructive' as const,
          icon: Ban,
          label: 'Suspended',
          color: 'text-red-600'
        };
      case 'rejected_soft':
      case 'rejected_hard':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Rejected',
          color: 'text-red-600'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          label: status,
          color: 'text-gray-600'
        };
    }
  };

  return (
    <DoctorLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Welcome back {firstName}
          </p>
        </div>

        {/* Profile Completion & Status Card */}
        {!doctorDataLoading && doctorData && (
          <Card className="mx-2 sm:mx-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Account Status</CardTitle>
                  <CardDescription className="mt-1">
                    Complete your profile to activate your account
                  </CardDescription>
                </div>
                <Badge
                  variant={getStatusDisplay(doctorData.doctor.status).variant}
                  className="flex items-center gap-1"
                >
                  {React.createElement(getStatusDisplay(doctorData.doctor.status).icon, { className: "h-3 w-3" })}
                  {getStatusDisplay(doctorData.doctor.status).label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Completion Progress */}
              {doctorData.doctor.status !== 'active' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Profile Completion</span>
                    <span className="text-gray-600">
                      {doctorData.doctor.profileCompletionPercentage}%
                    </span>
                  </div>
                  <Progress value={doctorData.doctor.profileCompletionPercentage} className="h-2" />
                </div>
              )}

              {/* Status-specific alerts */}
              {doctorData.doctor.status === 'pending_review' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your application is under review. You'll receive an email within 2-3 business days.
                  </AlertDescription>
                </Alert>
              )}

              {doctorData.doctor.status === 'approved' && doctorData.doctor.profileCompletionPercentage < 100 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete your profile to {doctorData.doctor.profileCompletionPercentage}% to activate your account and start accepting patients.
                  </AlertDescription>
                </Alert>
              )}

              {doctorData.doctor.status === 'approved' && doctorData.profileCompletion && doctorData.profileCompletion.missingFields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Missing Information:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {doctorData.profileCompletion.missingFields.map((field: any) => (
                      <div key={field.field} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <span className="text-gray-700">{field.label}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/doctor-settings">
                    <Button className="w-full mt-3 bg-green-600 hover:bg-green-700">
                      Complete Profile
                    </Button>
                  </Link>
                </div>
              )}

              {doctorData.doctor.status === 'active' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Your account is fully activated! You can now accept patient consultations.
                  </AlertDescription>
                </Alert>
              )}

              {doctorData.doctor.status === 'suspended' && (
                <Alert variant="destructive">
                  <Ban className="h-4 w-4" />
                  <AlertDescription>
                    Your account has been suspended. Please contact support@doktu.co for assistance.
                  </AlertDescription>
                </Alert>
              )}

              {(doctorData.doctor.status === 'rejected_soft' || doctorData.doctor.status === 'rejected_hard') && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {doctorData.doctor.rejectionReason || 'Your application was not approved.'}
                    {doctorData.doctor.status === 'rejected_soft' && (
                      <span className="block mt-2">You can reapply after 30 days from the rejection date.</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live Appointments Banner */}
        {liveAppointments.length > 0 && (
          <Card className="mx-2 sm:mx-0 bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800 text-lg">
                <Video className="h-5 w-5" />
                Live Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white border border-green-200 rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="font-medium text-base text-green-800">
                        {appointment.patient ? 
                          formatUserFullName(appointment.patient) : 
                          'Patient inconnu'
                        }
                      </div>
                      <div className="text-sm text-green-600 mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatAppointmentDateTime(appointment.appointmentDate)} • {getTimeUntilAppointment(appointment.appointmentDate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2">
                      <span className="text-sm sm:text-base text-green-600 font-medium">
                        €{appointment.price}
                      </span>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 h-9 px-3"
                        onClick={() => setLocation(`/video-consultation/${appointment.id}`)}
                      >
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

        {/* Upcoming Appointments Card */}
        <Card className="mx-2 sm:mx-0">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5" />
              <span className="hidden sm:inline">Upcoming Appointments</span>
              <span className="sm:hidden">Upcoming Appointments</span>
            </CardTitle>
            <Link href="/doctor-calendar">
              <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto">
                <span className="hidden sm:inline">View Calendar</span>
                <span className="sm:hidden">Calendar</span>
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="font-medium text-base">
                        {appointment.patient ? 
                          formatUserFullName(appointment.patient) : 
                          'Patient inconnu'
                        }
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatAppointmentDateTime(appointment.appointmentDate)}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-9 px-3"
                        onClick={() => {
                          window.location.href = `/doctor-records?patientId=${appointment.patientId}`;
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2 sm:mr-0" />
                        <span className="sm:hidden">View</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {hasMoreAppointments && (
                  <div className="pt-3 sm:pt-4 border-t">
                    <Link href="/doctor-calendar">
                      <Button variant="outline" className="w-full h-10">
                        <span className="hidden sm:inline">See all appointments ({upcoming.length})</span>
                        <span className="sm:hidden">See all ({upcoming.length})</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </DoctorLayout>
  );
}