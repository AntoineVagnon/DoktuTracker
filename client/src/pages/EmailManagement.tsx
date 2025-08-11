import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Send, Clock, CheckCircle, AlertCircle, Users } from "lucide-react";

export default function EmailManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [testEmailType, setTestEmailType] = useState("welcome");

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async ({ email, type }: { email: string; type: string }) => {
      return apiRequest('/api/emails/test', {
        method: 'POST',
        body: JSON.stringify({ email, type })
      });
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
      return apiRequest('/api/emails/send-reminders', {
        method: 'POST'
      });
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
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['/api/admin/appointments'],
    enabled: true
  });

  const tomorrowAppointments = upcomingAppointments?.filter((apt: any) => {
    const appointmentDate = new Date(apt.appointmentDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    return appointmentDate >= tomorrow && appointmentDate < dayAfter && apt.status === 'paid';
  }) || [];

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
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => testEmailMutation.mutate({ email: testEmail, type: testEmailType })}
              disabled={!testEmail || testEmailMutation.isPending}
              className="w-full"
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