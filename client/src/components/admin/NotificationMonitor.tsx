import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Search,
  RefreshCw,
  Eye,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Download,
  Trash2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailNotification {
  id: string;
  user_id: string;
  trigger_code: string;
  template_key: string;
  status: "pending" | "sent" | "failed";
  priority: number;
  scheduled_for: string;
  sent_at?: string;
  merge_data: any;
  metadata?: any;
  error_message?: string;
  created_at: string;
}

interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  byTrigger: Record<string, number>;
  recentActivity: { date: string; count: number }[];
}

const TRIGGER_CATEGORIES = {
  A: "Account",
  B: "Booking",
  C: "Calendar",
  D: "Doctor",
  H: "Health",
  M: "Membership",
  P: "Payment",
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  sent: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_ICONS = {
  pending: Clock,
  sent: CheckCircle2,
  failed: XCircle,
};

export default function NotificationMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "sent" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<EmailNotification | null>(null);
  const [filterTrigger, setFilterTrigger] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery<EmailNotification[]>({
    queryKey: ["admin", "notifications", activeTab, filterTrigger, filterPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("status", activeTab);
      if (filterTrigger !== "all") params.append("trigger_code", filterTrigger);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      params.append("limit", "100");

      const response = await apiRequest(`/api/admin/notifications?${params.toString()}`);
      return response.notifications || [];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery<NotificationStats>({
    queryKey: ["admin", "notification-stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/notifications/stats");
      return response;
    },
    refetchInterval: 30000,
  });

  // Resend notification
  const handleResend = async (notificationId: string) => {
    try {
      await apiRequest(`/api/admin/notifications/${notificationId}/resend`, {
        method: "POST",
      });
      toast({
        title: "Notification resent",
        description: "The notification has been queued for resending.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-stats"] });
    } catch (error: any) {
      toast({
        title: "Resend failed",
        description: error.message || "Failed to resend notification",
        variant: "destructive",
      });
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      await apiRequest(`/api/admin/notifications/${notificationId}`, {
        method: "DELETE",
      });
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-stats"] });
      setSelectedNotification(null);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  // Filter notifications by search
  const filteredNotifications = notifications?.filter((notif) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      notif.id.toLowerCase().includes(searchLower) ||
      notif.trigger_code.toLowerCase().includes(searchLower) ||
      notif.template_key.toLowerCase().includes(searchLower) ||
      notif.user_id.toLowerCase().includes(searchLower)
    );
  });

  const getTriggerCategory = (code: string) => {
    const category = code.charAt(0);
    return TRIGGER_CATEGORIES[category as keyof typeof TRIGGER_CATEGORIES] || "Unknown";
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 90) return { label: "P0", class: "bg-red-500 text-white" };
    if (priority >= 70) return { label: "P1", class: "bg-orange-500 text-white" };
    if (priority >= 40) return { label: "P2", class: "bg-blue-500 text-white" };
    return { label: "P3", class: "bg-gray-500 text-white" };
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email Notifications</CardTitle>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID, trigger code, template, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterTrigger} onValueChange={setFilterTrigger}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                {Object.entries(TRIGGER_CATEGORIES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name} ({code}*)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="p0">P0 (90-100)</SelectItem>
                <SelectItem value="p1">P1 (70-89)</SelectItem>
                <SelectItem value="p2">P2 (40-69)</SelectItem>
                <SelectItem value="p3">P3 (10-39)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {stats?.total || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                <Badge variant="secondary" className="ml-2">
                  {stats?.pending || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent
                <Badge variant="secondary" className="ml-2">
                  {stats?.sent || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed
                <Badge variant="secondary" className="ml-2">
                  {stats?.failed || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  Loading notifications...
                </div>
              ) : filteredNotifications && filteredNotifications.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotifications.map((notif) => {
                    const StatusIcon = STATUS_ICONS[notif.status];
                    const priorityBadge = getPriorityBadge(notif.priority);

                    return (
                      <div
                        key={notif.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedNotification(notif)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <StatusIcon className={cn("h-5 w-5 mt-0.5", {
                              "text-amber-600": notif.status === "pending",
                              "text-green-600": notif.status === "sent",
                              "text-red-600": notif.status === "failed",
                            })} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={priorityBadge.class}>
                                  {priorityBadge.label}
                                </Badge>
                                <Badge variant="outline">
                                  {notif.trigger_code}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {getTriggerCategory(notif.trigger_code)}
                                </Badge>
                                <Badge className={STATUS_COLORS[notif.status]}>
                                  {notif.status}
                                </Badge>
                              </div>

                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {notif.template_key}
                              </div>

                              <div className="text-xs text-gray-500 space-y-1">
                                <div>ID: {notif.id}</div>
                                <div>User: {notif.user_id}</div>
                                <div>
                                  Created: {format(new Date(notif.created_at), "MMM d, yyyy HH:mm:ss")}
                                </div>
                                {notif.sent_at && (
                                  <div>
                                    Sent: {format(new Date(notif.sent_at), "MMM d, yyyy HH:mm:ss")}
                                  </div>
                                )}
                                {notif.error_message && (
                                  <div className="text-red-600 font-medium">
                                    Error: {notif.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  No notifications found
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              View detailed information about this email notification
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-6">
              {/* Status and Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={`${STATUS_COLORS[selectedNotification.status]} text-base px-3 py-1`}>
                    {selectedNotification.status.toUpperCase()}
                  </Badge>
                  <Badge className={`${getPriorityBadge(selectedNotification.priority).class} text-base px-3 py-1`}>
                    {getPriorityBadge(selectedNotification.priority).label}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  {selectedNotification.status === "failed" && (
                    <Button
                      onClick={() => handleResend(selectedNotification.id)}
                      size="sm"
                      variant="default"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Resend
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(selectedNotification.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Notification ID</div>
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedNotification.id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">User ID</div>
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded">{selectedNotification.user_id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Trigger Code</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">{selectedNotification.trigger_code}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Template Key</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">{selectedNotification.template_key}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Priority</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">{selectedNotification.priority}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Category</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">
                    {getTriggerCategory(selectedNotification.trigger_code)}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Created At</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">
                    {format(new Date(selectedNotification.created_at), "MMM d, yyyy HH:mm:ss")}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Scheduled For</div>
                  <div className="text-sm bg-gray-100 p-2 rounded">
                    {format(new Date(selectedNotification.scheduled_for), "MMM d, yyyy HH:mm:ss")}
                  </div>
                </div>
                {selectedNotification.sent_at && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Sent At</div>
                    <div className="text-sm bg-green-100 p-2 rounded">
                      {format(new Date(selectedNotification.sent_at), "MMM d, yyyy HH:mm:ss")}
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {selectedNotification.error_message && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Error Message</div>
                  <div className="text-sm bg-red-50 border border-red-200 p-3 rounded text-red-800">
                    {selectedNotification.error_message}
                  </div>
                </div>
              )}

              {/* Merge Data */}
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Merge Data</div>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(selectedNotification.merge_data, null, 2)}
                </pre>
              </div>

              {/* Metadata */}
              {selectedNotification.metadata && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Metadata</div>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
