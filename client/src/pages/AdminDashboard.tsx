import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  Star,
  Download
} from "lucide-react";

interface KPIData {
  totalAppointments: number;
  completedAppointments: number;
  noShowRate: number;
  averageRating: number;
  totalRevenue: number;
  newPatientsThisMonth: number;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("today");

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
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

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/admin/kpis"],
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/doctors"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Booked Appointments",
      value: kpis?.totalAppointments || 0,
      icon: Calendar,
      color: "blue",
      change: "+12% from last month",
    },
    {
      title: "Completed Consultations",
      value: kpis?.completedAppointments || 0,
      icon: CheckCircle,
      color: "green",
      change: "+8% from last month",
    },
    {
      title: "No-Show Rate",
      value: `${(kpis?.noShowRate || 0).toFixed(1)}%`,
      icon: AlertCircle,
      color: "red",
      change: "-2% from last month",
    },
    {
      title: "ARPA (€)",
      value: `€${((kpis?.totalRevenue || 0) / Math.max(kpis?.totalAppointments || 1, 1)).toFixed(0)}`,
      icon: DollarSign,
      color: "yellow",
      change: "+5% from last month",
    },
    {
      title: "Avg. Appointments/Patient",
      value: (kpis?.totalAppointments || 0) > 0 ? "1.2" : "0",
      icon: Users,
      color: "purple",
      change: "+3% from last month",
    },
    {
      title: "Doctor Utilisation",
      value: "78%",
      icon: Activity,
      color: "indigo",
      change: "+15% from last month",
    },
    {
      title: "Booking Conversion",
      value: "85%",
      icon: TrendingUp,
      color: "green",
      change: "+7% from last month",
    },
    {
      title: "New Patients",
      value: kpis?.newPatientsThisMonth || 0,
      icon: UserCheck,
      color: "blue",
      change: "+22% from last month",
    },
  ];

  const alerts = [
    {
      type: "critical",
      title: "High cancellation rate detected",
      description: "Dr. Smith has 3+ cancellations today",
      action: "Investigate",
      time: "2 min ago",
    },
    {
      type: "warning",
      title: "Payment processing delay",
      description: "5 payments pending for over 24h",
      action: "Review",
      time: "15 min ago",
    },
    {
      type: "info",
      title: "New doctor verification",
      description: "Dr. Johnson completed profile setup",
      action: "Approve",
      time: "1 hour ago",
    },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCardColorClass = (color: string) => {
    const colorMap = {
      blue: "border-l-blue-500 bg-blue-50",
      green: "border-l-green-500 bg-green-50",
      red: "border-l-red-500 bg-red-50",
      yellow: "border-l-yellow-500 bg-yellow-50",
      purple: "border-l-purple-500 bg-purple-50",
      indigo: "border-l-indigo-500 bg-indigo-50",
    };
    return colorMap[color as keyof typeof colorMap] || "border-l-gray-500 bg-gray-50";
  };

  const handleExportCSV = () => {
    toast({
      title: "Export Started",
      description: "Your CSV export will download shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Platform overview and management</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-4xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiCards.map((kpi, index) => (
                <Card key={index} className={`border-l-4 ${getCardColorClass(kpi.color)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        {kpi.title}
                      </CardTitle>
                      <kpi.icon className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {kpisLoading ? (
                        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        kpi.value
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{kpi.change}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>System Alerts</CardTitle>
                  <Badge variant="secondary">{alerts.length} active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getAlertIcon(alert.type)}
                        <div>
                          <h4 className="font-medium text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-600">{alert.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">{alert.time}</span>
                        <Button size="sm" variant="outline">{alert.action}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.slice(0, 5).map((appointment: any) => (
                      <div key={appointment.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">
                              {appointment.patient?.firstName} {appointment.patient?.lastName}
                            </p>
                            <p className="text-xs text-gray-600">
                              with Dr. {appointment.doctor?.user?.firstName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{appointment.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Doctors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctors.slice(0, 5).map((doctor: any, index: number) => (
                      <div key={doctor.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Dr. {doctor.user.firstName} {doctor.user.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{doctor.specialty}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{doctor.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Appointment management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doctors">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Doctor management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle>Patient Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Patient management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Payment analytics interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Advanced analytics interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Platform settings interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
