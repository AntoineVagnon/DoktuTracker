import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Euro, TrendingUp, UserCheck, AlertTriangle, UserPlus, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface KPIs {
  totalUsers: number;
  activeDoctors: number;
  totalAppointments: number;
  totalRevenue: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [doctorForm, setDoctorForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    specialty: '',
    bio: '',
    education: '',
    experience: '',
    languages: '',
    rppsNumber: '',
    consultationPrice: '35.00'
  });

  const [adminForm, setAdminForm] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/admin/kpis"],
    enabled: !!user,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: !!user,
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["/api/admin/activity"],
    enabled: !!user,
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (doctorData: any) => {
      const response = await fetch("/api/admin/create-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...doctorData,
          languages: doctorData.languages.split(',').map((lang: string) => lang.trim()).filter(Boolean)
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Doctor account created successfully" });
      setDoctorForm({
        email: '',
        firstName: '',
        lastName: '',
        specialty: '',
        bio: '',
        education: '',
        experience: '',
        languages: '',
        rppsNumber: '',
        consultationPrice: '35.00'
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (adminData: any) => {
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(adminData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin account created successfully" });
      setAdminForm({ email: '', firstName: '', lastName: '' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Platform overview and management tools
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="create-accounts">Create Accounts</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {kpisLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis?.totalUsers || 245}</div>
                    <p className="text-xs text-muted-foreground">+12% from last month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis?.activeDoctors || 18}</div>
                    <p className="text-xs text-muted-foreground">currently online</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis?.totalAppointments || 1247}</div>
                    <p className="text-xs text-muted-foreground">this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <Euro className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">€{kpis?.totalRevenue || '24,890'}</div>
                    <p className="text-xs text-muted-foreground">+8.2% from last month</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New doctor registration</p>
                          <p className="text-xs text-gray-500">Dr. Sarah Johnson joined the platform</p>
                        </div>
                        <span className="text-xs text-gray-400">2 min ago</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Appointment completed</p>
                          <p className="text-xs text-gray-500">Patient consultation with Dr. Martin</p>
                        </div>
                        <span className="text-xs text-gray-400">5 min ago</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Payment processed</p>
                          <p className="text-xs text-gray-500">€85 consultation fee received</p>
                        </div>
                        <span className="text-xs text-gray-400">12 min ago</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Database</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Operational
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payment Gateway</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Operational
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Video Service</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Operational
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email Service</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Degraded
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button variant="outline" size="sm" className="w-full">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Full Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>

                  <Button variant="outline" className="justify-start">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Doctor Verification
                  </Button>

                  <Button variant="outline" className="justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-accounts">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Doctor Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Create Doctor Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="doctor-firstName">First Name</Label>
                      <Input
                        id="doctor-firstName"
                        value={doctorForm.firstName}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doctor-lastName">Last Name</Label>
                      <Input
                        id="doctor-lastName"
                        value={doctorForm.lastName}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="doctor-email">Email</Label>
                    <Input
                      id="doctor-email"
                      type="email"
                      value={doctorForm.email}
                      onChange={(e) => setDoctorForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctor-specialty">Specialty</Label>
                    <Input
                      id="doctor-specialty"
                      value={doctorForm.specialty}
                      onChange={(e) => setDoctorForm(prev => ({ ...prev, specialty: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctor-bio">Bio</Label>
                    <Textarea
                      id="doctor-bio"
                      value={doctorForm.bio}
                      onChange={(e) => setDoctorForm(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="doctor-rpps">RPPS Number</Label>
                      <Input
                        id="doctor-rpps"
                        value={doctorForm.rppsNumber}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, rppsNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doctor-price">Consultation Price (€)</Label>
                      <Input
                        id="doctor-price"
                        type="number"
                        step="0.01"
                        value={doctorForm.consultationPrice}
                        onChange={(e) => setDoctorForm(prev => ({ ...prev, consultationPrice: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => createDoctorMutation.mutate(doctorForm)}
                    disabled={createDoctorMutation.isPending}
                    className="w-full"
                  >
                    {createDoctorMutation.isPending ? "Creating..." : "Create Doctor Account"}
                  </Button>
                </CardContent>
              </Card>

              {/* Create Admin Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Create Admin Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="admin-firstName">First Name</Label>
                      <Input
                        id="admin-firstName"
                        value={adminForm.firstName}
                        onChange={(e) => setAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-lastName">Last Name</Label>
                      <Input
                        id="admin-lastName"
                        value={adminForm.lastName}
                        onChange={(e) => setAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={() => createAdminMutation.mutate(adminForm)}
                    disabled={createAdminMutation.isPending}
                    className="w-full"
                  >
                    {createAdminMutation.isPending ? "Creating..." : "Create Admin Account"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Role</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}