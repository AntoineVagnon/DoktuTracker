import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Clock, Video } from "lucide-react";
import { Link } from "wouter";
import DoctorLayout from "@/components/DoctorLayout";
import { formatUserFullName } from "@/lib/nameUtils";
import { formatAppointmentDateTime, categorizeAppointmentsByTiming, getTimeUntilAppointment } from "@/lib/dateUtils";

export default function DoctorDashboard() {
  const { user, isLoading } = useAuth();

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments", "doctor"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DoctorLayout>
    );
  }

  // Categorize appointments by timing
  const { upcoming, live, completed } = categorizeAppointmentsByTiming(appointments);
  
  // Get upcoming appointments (limit to 3 for dashboard preview)
  const upcomingAppointments = upcoming.slice(0, 3);
  const hasMoreAppointments = upcoming.length > 3;
  
  // Get live appointments for banner/priority display
  const liveAppointments = live;

  const firstName = user?.firstName || user?.email?.split('@')[0] || '';

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
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2">
                      <span className="text-sm sm:text-base text-green-600 font-medium">
                        €{appointment.price}
                      </span>
                      <Button size="sm" variant="outline" className="h-9 px-3">
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