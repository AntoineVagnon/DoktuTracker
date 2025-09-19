import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Send, Clock, CheckCircle, AlertCircle, Users, Database, Activity, RefreshCw } from "lucide-react";

export default function EmailManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [testEmailType, setTestEmailType] = useState("ACCOUNT_REG_SUCCESS");

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async ({ email, type }: { email: string; type: string }) => {
      const response = await apiRequest('POST', '/api/emails/test', { email, type });
      return await response.json() as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      toast({
        title: "Test Email Sent",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      setTestEmail("");
    },
    onError: (error) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send reminder emails mutation
  const reminderEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/emails/send-reminders');
      return await response.json() as { success: boolean; message: string; count?: number };
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Emails Sent",
        description: data.message,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
    },
    onError: (error) => {
      toast({
        title: "Reminder Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get upcoming appointments for reminder preview
  const { data: upcomingAppointments = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/appointments'],
    enabled: true
  });

  const tomorrowAppointments = upcomingAppointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.appointmentDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    return appointmentDate >= tomorrow && appointmentDate < dayAfter && apt.status === 'paid';
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Mail className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Email Management</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Email Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Test Email</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="email-type">Email Template</Label>
              <Select value={testEmailType} onValueChange={setTestEmailType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCOUNT_REG_SUCCESS">Welcome Email</SelectItem>
                  <SelectItem value="APPOINTMENT_CONFIRMED">Booking Confirmation</SelectItem>
                  <SelectItem value="APPOINTMENT_REMINDER_24H">24h Appointment Reminder</SelectItem>
                  <SelectItem value="APPOINTMENT_CANCELLED">Cancellation Confirmation</SelectItem>
                  <SelectItem value="HEALTH_PROFILE_INCOMPLETE">Profile Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => testEmailMutation.mutate({ email: testEmail, type: testEmailType })}
              disabled={!testEmail || testEmailMutation.isPending}
              className="w-full"
              data-testid="button-send-test"
            >
              {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>

        {/* Reminder Emails Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Appointment Reminders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{tomorrowAppointments.length} appointments tomorrow require reminders</span>
            </div>
            
            {tomorrowAppointments.length > 0 && (
              <div className="space-y-2">
                <Label>Upcoming Appointments (Next 24h)</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {tomorrowAppointments.slice(0, 5).map((apt: any) => (
                    <div key={apt.id} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>{apt.patient?.firstName} {apt.patient?.lastName}</span>
                      <span>{new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {tomorrowAppointments.length > 5 && (
                    <div className="text-center text-gray-500">
                      +{tomorrowAppointments.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={() => reminderEmailsMutation.mutate()}
              disabled={reminderEmailsMutation.isPending || tomorrowAppointments.length === 0}
              className="w-full"
              variant={tomorrowAppointments.length > 0 ? "default" : "secondary"}
            >
              {reminderEmailsMutation.isPending ? "Sending..." : `Send ${tomorrowAppointments.length} Reminder Emails`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notification Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Notification Queue Status</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/notification-queue'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/email-logs'] });
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationQueueStatus />
        </CardContent>
      </Card>

      {/* Recent Email Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Email Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentEmailActivity />
        </CardContent>
      </Card>

      {/* Email Templates Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Available Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Appointment Confirmation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent automatically when appointments are booked and confirmed.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold">Appointment Cancellation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent automatically when appointments are cancelled, includes refund info.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Appointment Reminder</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                24-hour reminder before scheduled consultations.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold">Welcome Email</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Welcome message for new patients and doctors.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold">Password Reset</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Secure password reset links with 24-hour expiry.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Doctor Notification</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Notifies doctors of new appointment bookings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notification Queue Status Component
function NotificationQueueStatus() {
  const { data: queueStatus, isLoading } = useQuery({
    queryKey: ['/api/admin/notification-queue'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading queue status...</div>;
  }

  const pendingCount = queueStatus?.pending || 0;
  const processingCount = queueStatus?.processing || 0;
  const failedCount = queueStatus?.failed || 0;
  const completedCount = queueStatus?.completed || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="text-center p-4 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
        <div className="text-sm text-yellow-700">Pending</div>
      </div>
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
        <div className="text-sm text-blue-700">Processing</div>
      </div>
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">{failedCount}</div>
        <div className="text-sm text-red-700">Failed</div>
      </div>
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        <div className="text-sm text-green-700">Completed</div>
      </div>
    </div>
  );
}

// Recent Email Activity Component
function RecentEmailActivity() {
  const { data: recentEmails, isLoading } = useQuery({
    queryKey: ['/api/admin/email-logs'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading recent activity...</div>;
  }

  if (!recentEmails || recentEmails.length === 0) {
    return <div className="text-sm text-muted-foreground">No recent email activity</div>;
  }

  return (
    <div className="space-y-3">
      {recentEmails.slice(0, 10).map((email: any) => (
        <div key={email.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-gray-500" />
            <div>
              <div className="font-medium text-sm">{email.recipient_email}</div>
              <div className="text-xs text-muted-foreground">{email.trigger_code}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={email.status === 'sent' ? 'default' : email.status === 'failed' ? 'destructive' : 'secondary'}
            >
              {email.status}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {new Date(email.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}