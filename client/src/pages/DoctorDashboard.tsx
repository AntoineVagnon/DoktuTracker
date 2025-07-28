import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Settings, Eye } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatUserFullName } from "@/lib/nameUtils";
import { format } from "date-fns";

export default function DoctorDashboard() {
  const { user, isLoading } = useAuth();

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments", "doctor"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  // Get upcoming appointments (next 3)
  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'confirmed' || apt.status === 'paid')
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 3);

  const doctorName = user ? formatUserFullName({ ...user, role: 'doctor' }) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {doctorName}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Appointments
                </CardTitle>
                <Link href="/doctor-calendar">
                  <Button variant="outline" size="sm">
                    View Schedule
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="font-medium">
                            {appointment.patient ? 
                              formatUserFullName(appointment.patient) : 
                              'Patient inconnu'
                            }
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(appointment.appointmentDate), 'dd/MM/yyyy à HH:mm')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600 font-medium">
                            €{appointment.price}
                          </span>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
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

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/doctor-calendar">
                  <Button variant="outline" className="w-full justify-start" size="lg">
                    <Calendar className="h-4 w-4 mr-3" />
                    View Calendar
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FileText className="h-4 w-4 mr-3" />
                  Patient Records
                </Button>
                <Link href="/doctor-settings">
                  <Button variant="outline" className="w-full justify-start" size="lg">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}