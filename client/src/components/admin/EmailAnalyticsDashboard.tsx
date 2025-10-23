import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  Eye,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TemplatePerformance {
  template_key: string;
  trigger_code: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  unique_opened: number;
  total_clicked: number;
  unique_clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  template_quality_score: number;
}

interface DashboardData {
  daily_stats: Array<{
    date: string;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  }>;
  total_events: number;
}

export default function EmailAnalyticsDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch template performance
  const { data: templatesData, refetch: refetchTemplates } = useQuery<{ templates: TemplatePerformance[] }>({
    queryKey: ["admin", "analytics", "templates"],
    queryFn: async () => {
      return await apiRequest("/api/admin/analytics/templates");
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch dashboard data (last 30 days)
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["admin", "analytics", "dashboard"],
    queryFn: async () => {
      return await apiRequest("/api/admin/analytics/dashboard");
    },
    refetchInterval: 60000,
  });

  const templates = templatesData?.templates || [];

  // Calculate overall stats
  const totalSent = templates.reduce((sum, t) => sum + t.total_sent, 0);
  const totalDelivered = templates.reduce((sum, t) => sum + t.total_delivered, 0);
  const totalOpened = templates.reduce((sum, t) => sum + t.unique_opened, 0);
  const totalClicked = templates.reduce((sum, t) => sum + t.unique_clicked, 0);

  const overallDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const overallOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const overallClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

  // Sort templates by performance
  const topPerformers = [...templates]
    .sort((a, b) => (b.template_quality_score || 0) - (a.template_quality_score || 0))
    .slice(0, 5);

  const poorPerformers = [...templates]
    .filter((t) => t.total_sent >= 10) // Only show templates with enough data
    .sort((a, b) => (a.open_rate || 0) - (b.open_rate || 0))
    .slice(0, 5);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiRequest("/api/admin/analytics/refresh", { method: "POST" });
      await refetchTemplates();
    } finally {
      setRefreshing(false);
    }
  };

  const getPerformanceBadge = (rate: number, type: "delivery" | "open" | "click") => {
    const thresholds = {
      delivery: { good: 95, warning: 90 },
      open: { good: 20, warning: 10 },
      click: { good: 3, warning: 1 },
    };

    const threshold = thresholds[type];
    if (rate >= threshold.good) {
      return <Badge className="bg-green-500">Excellent</Badge>;
    } else if (rate >= threshold.warning) {
      return <Badge className="bg-amber-500">Good</Badge>;
    } else {
      return <Badge className="bg-red-500">Needs Improvement</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Analytics</h2>
          <p className="text-gray-600">Real-time email performance tracking via Mailgun webhooks</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDelivered.toLocaleString()} delivered ({overallDeliveryRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOpened.toLocaleString()} unique opens
            </p>
            <div className="mt-2">{getPerformanceBadge(overallOpenRate, "open")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClicked.toLocaleString()} unique clicks
            </p>
            <div className="mt-2">{getPerformanceBadge(overallClickRate, "click")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                templates.reduce((sum, t) => sum + (t.template_quality_score || 0), 0) /
                (templates.length || 1)
              ).toFixed(0)}
              /100
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across {templates.length} templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends Chart */}
      {dashboardData?.daily_stats && dashboardData.daily_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.daily_stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" />
                <Line type="monotone" dataKey="opened" stroke="#3b82f6" name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#8b5cf6" name="Clicked" />
                <Line type="monotone" dataKey="bounced" stroke="#ef4444" name="Bounced" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top & Poor Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Performing Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((template) => (
                <div key={template.template_key} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{template.template_key}</div>
                    <div className="text-xs text-gray-500">
                      {template.trigger_code} • {template.total_sent} sent
                    </div>
                  </div>
                  <div className="flex gap-2 items-center ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{template.open_rate?.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">open rate</div>
                    </div>
                    <Badge className="bg-green-500 ml-2">
                      {template.template_quality_score?.toFixed(0) || 0}
                    </Badge>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-center text-gray-500 py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Poor Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Needs Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {poorPerformers.map((template) => (
                <div key={template.template_key} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{template.template_key}</div>
                    <div className="text-xs text-gray-500">
                      {template.trigger_code} • {template.total_sent} sent
                    </div>
                  </div>
                  <div className="flex gap-2 items-center ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-amber-600">
                        {template.open_rate?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">open rate</div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Action Needed
                    </Badge>
                  </div>
                </div>
              ))}
              {poorPerformers.length === 0 && (
                <p className="text-center text-gray-500 py-4">All templates performing well!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Templates Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Templates Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Template</th>
                  <th className="text-left py-3 px-2">Trigger</th>
                  <th className="text-right py-3 px-2">Sent</th>
                  <th className="text-right py-3 px-2">Delivery Rate</th>
                  <th className="text-right py-3 px-2">Open Rate</th>
                  <th className="text-right py-3 px-2">Click Rate</th>
                  <th className="text-right py-3 px-2">Quality Score</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.template_key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{template.template_key}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline">{template.trigger_code}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right">{template.total_sent}</td>
                    <td className="py-3 px-2 text-right">
                      {template.delivery_rate?.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      {template.open_rate?.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      {template.click_rate?.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Badge
                        className={
                          (template.template_quality_score || 0) >= 70
                            ? "bg-green-500"
                            : (template.template_quality_score || 0) >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }
                      >
                        {template.template_quality_score?.toFixed(0) || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {templates.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No analytics data yet. Email analytics will appear here once emails are sent and webhook events are received.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {templates.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Setup Mailgun Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p className="mb-3">To enable email analytics, configure Mailgun webhooks:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Mailgun Dashboard → Sending → Webhooks</li>
              <li>Add webhook URL: <code className="bg-white px-2 py-1 rounded">https://your-domain.com/api/webhooks/mailgun</code></li>
              <li>Enable events: delivered, opened, clicked, failed, complained</li>
              <li>Save and test webhook</li>
            </ol>
            <p className="mt-3 text-xs">
              Analytics will populate automatically as emails are sent and events are received.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
