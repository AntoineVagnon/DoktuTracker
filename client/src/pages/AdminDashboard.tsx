import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, Users, TrendingUp, AlertCircle, Euro, UserX,
  ChevronDown, RefreshCw, UserPlus, Ticket, Send, Video,
  Clock, X, AlertTriangle, Shield, Mail, Trash2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
interface DashboardMetrics {
  appointmentsBooked: number;
  appointmentsBookedPrev: number;
  uniqueActivePatients: number;
  uniqueActivePatientsPrev: number;
  bookingsPerPatient: number;
  bookingsPerPatientGoal: number;
  doctorUtilization: number;
  doctorUtilizationThreshold: number;
  netRevenue: number;
  netRevenuePrev: number;
  revenueSparkline: number[];
  churnRiskPatients: number;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOffAlert?: string;
}

interface PatientSegment {
  name: string;
  tier: 'VIP' | 'Premium' | 'Regular' | 'At Risk';
  patientCount: number;
  ltv: number;
  appointmentsPerPatient: number;
  churnRiskCount: number;
}

interface DoctorRoster {
  id: number;
  name: string;
  specialty: string;
  availability: number;
  cancellationRate: number;
  status: 'active' | 'pending' | 'inactive';
}

interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLogin?: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [timeWindow, setTimeWindow] = useState<'7d' | '30d' | 'custom'>('7d');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null);
  const [dataDelayWarning, setDataDelayWarning] = useState(false);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['/api/admin/metrics', timeWindow],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = timeWindow === '7d' ? subDays(endDate, 7) : subDays(endDate, 30);
      
      const response = await apiRequest('GET', `/api/admin/metrics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      return await response.json() as DashboardMetrics;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch funnel data
  const { data: funnelData } = useQuery({
    queryKey: ['/api/admin/funnel', timeWindow],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/funnel?window=${timeWindow}`);
      return await response.json() as FunnelStage[];
    },
  });

  // Fetch patient segments
  const { data: segments } = useQuery({
    queryKey: ['/api/admin/segments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/segments');
      return await response.json() as PatientSegment[];
    },
  });

  // Fetch doctor roster
  const { data: doctors } = useQuery({
    queryKey: ['/api/admin/doctors'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/doctors');
      return await response.json() as DoctorRoster[];
    },
  });

  // Helper functions
  const getMetricColor = (value: number, threshold: number, type: 'above' | 'below' = 'above') => {
    if (type === 'above') {
      if (value >= threshold) return 'text-green-600 bg-green-50';
      if (value >= threshold * 0.8) return 'text-amber-600 bg-amber-50';
      return 'text-red-600 bg-red-50';
    } else {
      if (value <= threshold) return 'text-green-600 bg-green-50';
      if (value <= threshold * 1.2) return 'text-amber-600 bg-amber-50';
      return 'text-red-600 bg-red-50';
    }
  };

  const formatDelta = (current: number, previous: number) => {
    const delta = ((current - previous) / previous) * 100;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  // KPI Tile Component
  const KPITile = ({ 
    title, 
    value, 
    previousValue, 
    format: formatFn = (v: number) => v.toString(),
    threshold,
    thresholdType = 'above',
    icon: Icon,
    sparkline
  }: {
    title: string;
    value: number;
    previousValue?: number;
    format?: (value: number) => string;
    threshold?: number;
    thresholdType?: 'above' | 'below';
    icon: any;
    sparkline?: number[];
  }) => {
    const colorClass = threshold ? getMetricColor(value, threshold, thresholdType) : '';
    
    return (
      <Card className={cn("relative overflow-hidden", colorClass)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 opacity-70" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFn(value)}</div>
          {previousValue !== undefined && (
            <p className="text-xs opacity-70 mt-1">
              {formatDelta(value, previousValue)} vs prev
            </p>
          )}
          {sparkline && (
            <div className="mt-2 h-8">
              {/* Mini sparkline chart would go here */}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Admin Management Component
  const AdminManagement = () => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newAdmin, setNewAdmin] = useState({
      email: '',
      firstName: '',
      lastName: ''
    });

    // Fetch admin users
    const { data: adminUsers, refetch: refetchAdmins } = useQuery({
      queryKey: ['/api/admin/users'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin/users');
        return await response.json() as AdminUser[];
      },
    });

    // Create admin mutation
    const createAdminMutation = useMutation({
      mutationFn: async (userData: typeof newAdmin) => {
        const response = await apiRequest('POST', '/api/admin/users', userData);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Admin created successfully",
          description: "The new admin will receive a password reset email.",
        });
        setShowCreateDialog(false);
        setNewAdmin({ email: '', firstName: '', lastName: '' });
        refetchAdmins();
      },
      onError: (error: any) => {
        toast({
          title: "Error creating admin",
          description: error.message || "Failed to create admin user",
          variant: "destructive",
        });
      },
    });

    // Remove admin mutation
    const removeAdminMutation = useMutation({
      mutationFn: async (userId: number) => {
        const response = await apiRequest('DELETE', `/api/admin/users/${userId}`);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Admin removed",
          description: "Admin access has been revoked.",
        });
        refetchAdmins();
      },
      onError: (error: any) => {
        toast({
          title: "Error removing admin",
          description: error.message || "Failed to remove admin user",
          variant: "destructive",
        });
      },
    });

    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Admin Users Management</CardTitle>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-email">Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@doktu.com"
                        value={newAdmin.email}
                        onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-firstname">First Name</Label>
                      <Input
                        id="admin-firstname"
                        placeholder="John"
                        value={newAdmin.firstName}
                        onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-lastname">Last Name</Label>
                      <Input
                        id="admin-lastname"
                        placeholder="Doe"
                        value={newAdmin.lastName}
                        onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                      />
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        The new admin will receive an email to set their password.
                      </AlertDescription>
                    </Alert>
                    <Button
                      className="w-full"
                      onClick={() => createAdminMutation.mutate(newAdmin)}
                      disabled={!newAdmin.email || !newAdmin.firstName || !newAdmin.lastName || createAdminMutation.isPending}
                    >
                      {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminUsers?.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {admin.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">
                      Created: {format(new Date(admin.createdAt), 'MMM d, yyyy')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove admin access for ${admin.email}?`)) {
                          removeAdminMutation.mutate(admin.id);
                        }
                      }}
                      disabled={removeAdminMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {adminUsers?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No admin users found. Create one to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Admin users have full access to all dashboard features, patient data, and system settings. 
            Only grant admin access to trusted personnel.
          </AlertDescription>
        </Alert>
      </>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Data delay warning */}
      {dataDelayWarning && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Data currently delayed – last update {format(new Date(), 'HH:mm')} UTC
          </AlertDescription>
        </Alert>
      )}

      {/* Time window selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Select value={timeWindow} onValueChange={(v: any) => setTimeWindow(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPITile
          title="Appointments Booked"
          value={metrics?.appointmentsBooked || 0}
          previousValue={metrics?.appointmentsBookedPrev}
          icon={Calendar}
        />
        <KPITile
          title="Unique Active Patients"
          value={metrics?.uniqueActivePatients || 0}
          previousValue={metrics?.uniqueActivePatientsPrev}
          icon={Users}
        />
        <KPITile
          title="Bookings / Active Patient"
          value={metrics?.bookingsPerPatient || 0}
          format={(v) => v.toFixed(2)}
          threshold={1.4}
          icon={TrendingUp}
        />
        <KPITile
          title="Doctor Utilisation (%)"
          value={metrics?.doctorUtilization || 0}
          format={(v) => `${v.toFixed(0)}%`}
          threshold={60}
          icon={Clock}
        />
        <KPITile
          title="Net Revenue €"
          value={metrics?.netRevenue || 0}
          previousValue={metrics?.netRevenuePrev}
          format={(v) => `€${(v || 0).toLocaleString()}`}
          icon={Euro}
          sparkline={metrics?.revenueSparkline}
        />
        <KPITile
          title="Churn Risk Patients"
          value={metrics?.churnRiskPatients || 0}
          format={(v) => v.toString()}
          threshold={10}
          thresholdType="below"
          icon={UserX}
        />
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-lg">
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        {/* Conversion Funnel */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData?.map((stage, index) => (
                  <div
                    key={stage.name}
                    className="cursor-pointer hover:bg-gray-50 p-3 rounded"
                    onClick={() => setSelectedFunnelStage(stage.name)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {(stage.count || 0).toLocaleString()} ({stage.percentage || 0}%)
                        </span>
                        {stage.dropOffAlert && (
                          <Badge variant="destructive" className="text-xs">
                            {stage.dropOffAlert}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className={cn(
                          "h-6 rounded-full flex items-center justify-end pr-2",
                          index === 0 ? "bg-blue-500" :
                          index === 1 ? "bg-blue-400" :
                          index === 2 ? "bg-blue-300" :
                          index === 3 ? "bg-green-400" :
                          index === 4 ? "bg-green-500" : "bg-green-600"
                        )}
                        style={{ width: `${stage.percentage}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stage.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Segments */}
        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {segments?.map((segment) => (
              <Card
                key={segment.name}
                className={cn(
                  "cursor-pointer hover:shadow-lg transition-shadow",
                  segment.tier === 'VIP' && "border-purple-200 bg-purple-50",
                  segment.tier === 'Premium' && "border-blue-200 bg-blue-50",
                  segment.tier === 'At Risk' && "border-red-200 bg-red-50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    <Badge variant="secondary">{segment.patientCount}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold">€{(segment.ltv || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Lifetime Value</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Appts/Patient</span>
                    <span className="font-medium">{(segment.appointmentsPerPatient || 0).toFixed(1)}</span>
                  </div>
                  {segment.churnRiskCount > 0 && (
                    <Badge variant="destructive" className="w-full justify-center">
                      {segment.churnRiskCount} at risk
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Doctor Roster */}
        <TabsContent value="doctors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Doctor Roster</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Doctor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Doctor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="doctor-name">Name</Label>
                      <Input id="doctor-name" placeholder="Dr. Jane Smith" />
                    </div>
                    <div>
                      <Label htmlFor="doctor-email">Email</Label>
                      <Input id="doctor-email" type="email" placeholder="jane.smith@clinic.com" />
                    </div>
                    <div>
                      <Label htmlFor="doctor-specialty">Specialty</Label>
                      <Input id="doctor-specialty" placeholder="General Practice" />
                    </div>
                    <div>
                      <Label htmlFor="doctor-fee">Base Fee (€)</Label>
                      <Input id="doctor-fee" type="number" placeholder="50" />
                    </div>
                    <Button className="w-full">Add Doctor</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {doctors?.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{doctor.name}</div>
                      <div className="text-sm text-gray-600">{doctor.specialty}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          doctor.availability >= 80 ? "bg-green-100 text-green-800" :
                          doctor.availability >= 60 ? "bg-amber-100 text-amber-800" :
                          "bg-red-100 text-red-800"
                        )}
                      >
                        {doctor.availability}% available
                      </Badge>
                      {doctor.cancellationRate > 10 && (
                        <Badge variant="destructive">
                          {doctor.cancellationRate}% cancels
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Pipeline */}
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Pipeline chart will be rendered here
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">2.3%</div>
                  <div className="text-gray-600">Avg payment failure</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">3.5</div>
                  <div className="text-gray-600">Avg mins doctor joins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">8.1%</div>
                  <div className="text-gray-600">No-show rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Management */}
        <TabsContent value="admins" className="space-y-4">
          <AdminManagement />
        </TabsContent>
      </Tabs>

      {/* Action shortcuts */}
      <div className="flex gap-2 flex-wrap">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Ticket className="h-4 w-4 mr-2" />
              Create Discount Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discount Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="discount-code">Code</Label>
                <Input id="discount-code" placeholder="SUMMER2025" />
              </div>
              <div>
                <Label htmlFor="discount-value">Value (€ or %)</Label>
                <Input id="discount-value" placeholder="10" />
              </div>
              <div>
                <Label htmlFor="discount-expiry">Expiry Date</Label>
                <Input id="discount-expiry" type="date" />
              </div>
              <div>
                <Label htmlFor="discount-usage">Usage Cap</Label>
                <Input id="discount-usage" type="number" placeholder="100" />
              </div>
              <Button className="w-full">Create Code</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={() => toast({ title: "Password reset link sent" })}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Password Reset
        </Button>

        <Button variant="outline" size="sm">
          <Video className="h-4 w-4 mr-2" />
          Join Meeting as Support
        </Button>
      </div>
    </div>
  );
}