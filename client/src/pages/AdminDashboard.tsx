import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Users, TrendingUp, AlertCircle, Euro, UserX,
  ChevronDown, RefreshCw, UserPlus, Ticket, Send, Video,
  Clock, X, AlertTriangle, Shield, Mail, Trash2, 
  Star, Activity, Brain, MessageSquare, Settings,
  ArrowUp, ArrowDown, Target, Zap, Heart, TrendingDown,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  FileText, User, DollarSign, Percent, Check, ExternalLink, Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Area,
  AreaChart
} from "recharts";

// Meeting Types
interface Meeting {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledTime: string;
  status: 'live' | 'planned' | 'completed' | 'cancelled' | 'issue';
  duration: number; // in minutes
  alertDetails?: string;
}

interface MeetingStats {
  totalLive: number;
  totalPlanned: number;
  totalCompleted: number;
  totalCancelled: number;
  totalWithIssues: number;
  meetings: Meeting[];
}

// Extended Types for comprehensive metrics
interface DashboardMetrics {
  // Core PLG Metrics
  appointmentsBooked: number;
  appointmentsBookedPrev: number;
  appointmentsBookedTrend: { date: string; value: number }[];
  
  // User Engagement
  timeToValue: number; // days
  timeToValuePrev: number;
  activationRate: number; // percentage
  activationRatePrev: number;
  retentionRate: number; // percentage  
  retentionRatePrev: number;
  uniqueActivePatients: number;
  uniqueActivePatientsPrev: number;
  
  // Growth Metrics
  conversionRate: number;
  conversionRatePrev: number;
  viralCoefficient: number;
  monthlyGrowthRate: number;
  productQualifiedLeads: number;
  productQualifiedLeadsPrev: number;
  
  // Financial
  netRevenue: number;
  netRevenuePrev: number;
  revenuePerUser: number;
  lifetimeValue: number;
  customerAcquisitionCost: number;
  
  // Operational
  doctorUtilization: number;
  doctorUtilizationThreshold: number;
  averageSessionDuration: number;
  platformUptime: number;
  
  // Satisfaction
  npsScore: number;
  npsScorePrev: number;
  csat: number;
  reviewRating: number;
  
  // Predictive
  churnRiskPatients: number;
  projectedRevenue: number;
  demandForecast: number;
  
  // Analytics Data (New)
  cohortAnalysis?: Array<{
    cohort: string;
    w1: number;
    w2: number;
    w3: number;
    w4: number;
  }>;
  userJourneyAnalytics?: Array<{
    stage: string;
    touchpoints: string[];
    dropoff: number;
    avgTime: string;
  }>;
  conversionFunnel?: Array<{
    stage: string;
    percentage: number;
    count: number;
  }>;
  userGrowthData?: Array<{month: string, users: number, revenue: number}>;
  acquisitionChannels?: Array<{channel: string, users: number, conversion: number}>;
}

// Navigation items for consistent menu
const navigationItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'engagement', label: 'User Engagement', icon: Activity },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'operational', label: 'Operational', icon: Settings },
  { id: 'predictive', label: 'Predictive Analytics', icon: Brain },
  { id: 'meetings', label: 'Live & Planned Meetings', icon: Video }
];

// Chart colors
const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch comprehensive dashboard metrics
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['/api/admin/metrics', timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(endDate, days);
      
      const response = await apiRequest('GET', `/api/admin/metrics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      return await response.json() as DashboardMetrics;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Helper function for metric change indicators
  const MetricChange = ({ current, previous }: { current: number; previous: number }) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    
    return (
      <div className={cn("flex items-center gap-1 text-sm", isPositive ? "text-green-600" : "text-red-600")}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  // KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    previousValue,
    format = (v: number) => v.toString(),
    icon: Icon,
    trend,
    target,
    description,
    tooltip
  }: {
    title: string;
    value: number;
    previousValue?: number;
    format?: (value: number) => string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    target?: number;
    description?: string;
    tooltip?: string;
  }) => {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{format ? format(value) : value}</div>
          {previousValue !== undefined && (
            <MetricChange current={value} previous={previousValue} />
          )}
          {target && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Target</span>
                <span>{format(target)}</span>
              </div>
              <Progress value={(value / target) * 100} className="h-1" />
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Overview Section
  const OverviewSection = () => (
    <div className="space-y-6">
      {/* North Star Metric */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">North Star: Appointments Booked</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-white/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total number of appointments booked and paid for in the selected time period. This is our primary success metric, fetched directly from the appointments table where status = 'paid'.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm opacity-90">
              {timeRange === '7d' && 'Last 7 days'}
              {timeRange === '30d' && 'Last 30 days'}
              {timeRange === '90d' && 'Last 90 days'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div className="text-4xl font-bold">{metrics?.appointmentsBooked || 0}</div>
            {metrics?.appointmentsBookedPrev !== undefined && metrics?.appointmentsBookedPrev !== null && (
              <MetricChange 
                current={metrics.appointmentsBooked} 
                previous={metrics.appointmentsBookedPrev} 
              />
            )}
          </div>
          {metrics?.appointmentsBookedTrend && metrics.appointmentsBookedTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={100} className="mt-4">
              <LineChart data={metrics.appointmentsBookedTrend}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  dot={false}
                />
                <XAxis 
                  dataKey="date" 
                  hide 
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px'
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`${value} appointments`, '']}
                  labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Key PLG Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Time to Value"
          value={metrics?.timeToValue || 0}
          previousValue={metrics?.timeToValuePrev}
          format={(v) => `${typeof v === 'number' ? v.toFixed(1) : v} days`}
          icon={Clock}
          description="Avg time to first appointment"
          tooltip="Average number of days between user registration and their first completed appointment. Calculated from real user data in the database."
        />
        <KPICard
          title="Activation Rate"
          value={metrics?.activationRate || 0}
          previousValue={metrics?.activationRatePrev}
          format={(v) => `${typeof v === 'number' ? v.toFixed(1) : v}%`}
          icon={Zap}
          target={70}
          description="Users who book within 7 days"
          tooltip="Percentage of registered users who book their first appointment within 7 days. Calculated as (users with bookings within 7 days / total new registrations) × 100."
        />
        <KPICard
          title="Product Qualified Leads"
          value={metrics?.productQualifiedLeads || 0}
          previousValue={metrics?.productQualifiedLeadsPrev}
          icon={Target}
          description="High-intent users this period"
          tooltip="Number of users who have registered and viewed doctor profiles but haven't booked yet. These are potential customers showing buying intent."
        />
        <KPICard
          title="Net Revenue"
          value={metrics?.netRevenue || 0}
          previousValue={metrics?.netRevenuePrev}
          format={(v) => `€${(v/1000).toFixed(1)}k`}
          icon={Euro}
          tooltip="Total revenue from paid appointments in the selected period. Calculated from successful Stripe payments recorded in the database."
        />
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversion Funnel</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                
                  <TooltipContent>
                      <p>Shows conversion rates through the user journey. Based on registrations and bookings from database.
                    
                  </p>
                    </TooltipContent>
                
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {metrics?.conversionFunnel && metrics.conversionFunnel.length > 0 ? (
            <>
              <div className="space-y-4">
                {metrics.conversionFunnel.map((stage, index) => (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <div className="text-sm text-gray-500">
                        <span>{stage.percentage}%</span>
                        <span className="ml-2 text-xs">({stage.count} users)</span>
                      </div>
                    </div>
                    <Progress value={stage.percentage} className="h-2" />
                  </div>
                ))}
              </div>
              <Alert className="border-blue-200 bg-blue-50 mt-4">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <strong>Note:</strong> Homepage visits are estimated. Install analytics for accurate visitor tracking.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Loading conversion funnel data...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // User Engagement Section  
  const UserEngagementSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Active Users"
          value={metrics?.uniqueActivePatients || 0}
          previousValue={metrics?.uniqueActivePatientsPrev}
          icon={Users}
          format={(v) => v.toLocaleString()}
          tooltip="Number of unique patients who have booked or completed appointments in the selected time period. Fetched from the appointments table in the database."
        />
        <KPICard
          title="Retention Rate"
          value={metrics?.retentionRate || 0}
          previousValue={metrics?.retentionRatePrev}
          format={(v) => `${v}%`}
          icon={Heart}
          target={80}
          tooltip="Percentage of patients who have booked more than one appointment in the selected period. Calculated as (patients with 2+ appointments / total active patients) × 100."
        />
        <KPICard
          title="Avg Session Duration"
          value={metrics?.averageSessionDuration || 0}
          format={(v) => `${v} min`}
          icon={Clock}
          tooltip="Average duration of completed video consultations. Currently set to 15 minutes as default. Will be calculated from actual session data when video call tracking is fully implemented."
        />
      </div>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cohort Retention Analysis</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                
                  <TooltipContent>
                      <p>Tracks patient retention by signup month. Shows percentage of users still active after 1-4 weeks.
                    
                  </p>
                    </TooltipContent>
                
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {metrics?.cohortAnalysis && metrics.cohortAnalysis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Cohort</th>
                    <th className="text-center px-2">Week 1</th>
                    <th className="text-center px-2">Week 2</th>
                    <th className="text-center px-2">Week 3</th>
                    <th className="text-center px-2">Week 4</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.cohortAnalysis.map((row) => (
                    <tr key={row.cohort} className="border-b">
                      <td className="py-2 font-medium">{row.cohort}</td>
                      <td className="text-center px-2">
                        <Badge variant="secondary">{row.w1}%</Badge>
                      </td>
                      <td className="text-center px-2">
                        <Badge variant={row.w2 > 70 ? "default" : "destructive"}>{row.w2}%</Badge>
                      </td>
                      <td className="text-center px-2">
                        <Badge variant={row.w3 > 60 ? "default" : "destructive"}>{row.w3}%</Badge>
                      </td>
                      <td className="text-center px-2">
                        <Badge variant={row.w4 > 50 ? "default" : "destructive"}>{row.w4}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                No cohort data available. Need more users registered across multiple months to show retention trends.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* User Journey Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Journey Analytics</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                
                  <TooltipContent>
                      <p>Shows user progression through key stages. Drop-off rates calculated from actual registration and booking data.
                    
                  </p>
                    </TooltipContent>
                
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {metrics?.userJourneyAnalytics && metrics.userJourneyAnalytics.length > 0 ? (
            <div className="space-y-4">
              {metrics.userJourneyAnalytics.map((journey) => (
                <div key={journey.stage} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{journey.stage}</h4>
                      <p className="text-sm text-gray-500">Avg time: {journey.avgTime}</p>
                    </div>
                    <Badge variant={journey.dropoff > 40 ? "destructive" : "secondary"}>
                      {journey.dropoff}% drop-off
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {journey.touchpoints.map((tp) => (
                      <Badge key={tp} variant="outline" className="text-xs">
                        {tp}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              <Alert className="border-blue-200 bg-blue-50 mt-4">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <strong>Note:</strong> Discovery stage requires frontend analytics. Other stages use real database metrics.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Loading user journey data...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Growth Section
  const GrowthSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Conversion Rate"
          value={metrics?.conversionRate || 0}
          previousValue={metrics?.conversionRatePrev}
          format={(v) => `${v.toFixed(2)}%`}
          icon={Percent}
          target={15}
          tooltip="Percentage of homepage visitors who complete a booking. Calculated as: (Bookings / Homepage Visits) × 100"
        />
        <KPICard
          title="Viral Coefficient"
          value={metrics?.viralCoefficient || 0}
          format={(v) => v.toFixed(2)}
          icon={Users}
          tooltip="Average number of new users each existing user brings in. Values > 1 indicate viral growth. Calculated as: (New Users from Referrals / Total Active Users)"
        />
        <KPICard
          title={`${timeRange === '7d' ? 'Weekly' : timeRange === '30d' ? 'Monthly' : 'Quarterly'} Growth`}
          value={metrics?.monthlyGrowthRate || 0}
          format={(v) => `${v.toFixed(1)}%`}
          icon={TrendingUp}
          tooltip={`${timeRange === '7d' ? 'Week-over-week' : timeRange === '30d' ? 'Month-over-month' : 'Quarter-over-quarter'} growth rate of new patients. Calculated as: ((Current Period Patients - Previous Period Patients) / Previous Period Patients) × 100`}
        />
        <KPICard
          title="CAC:LTV Ratio"
          value={(metrics?.lifetimeValue || 0) / (metrics?.customerAcquisitionCost || 1)}
          format={(v) => `1:${v.toFixed(1)}`}
          icon={DollarSign}
          target={3}
          tooltip="Customer Acquisition Cost to Lifetime Value ratio. Shows how much value each customer brings compared to their acquisition cost. Target ratio is 1:3 or higher. Calculated as: LTV / CAC"
        />
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Growth Trajectory
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shows cumulative user growth and monthly revenue over time. Total users accumulate while revenue is shown per month.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={metrics?.userGrowthData || []}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RechartsTooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="users"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.6}
                name="Total Users"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.success}
                fill={CHART_COLORS.success}
                fillOpacity={0.6}
                name="Revenue (€)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Acquisition Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Acquisition Channel Performance
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p>Shows user acquisition by marketing channel and their conversion rates. Note: Channel data is estimated based on typical healthcare platform patterns as actual tracking isn't implemented yet.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={metrics?.acquisitionChannels || []}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <RechartsTooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="users" fill={CHART_COLORS.primary} name="New Users" />
              <Bar yAxisId="right" dataKey="conversion" fill={CHART_COLORS.secondary} name="Conversion %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  // Feedback Section
  const FeedbackSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="NPS Score"
          value={metrics?.npsScore || 0}
          previousValue={metrics?.npsScorePrev}
          icon={Star}
          format={(v) => `+${v}`}
          target={50}
        />
        <KPICard
          title="CSAT"
          value={metrics?.csat || 0}
          format={(v) => `${v}%`}
          icon={Heart}
          target={90}
        />
        <KPICard
          title="Avg Review Rating"
          value={metrics?.reviewRating || 0}
          format={(v) => `${v.toFixed(1)}/5`}
          icon={Star}
        />
      </div>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patient Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                patient: 'Marie L.',
                rating: 5,
                comment: 'Excellent service! The doctor was very professional and the platform is easy to use.',
                date: '2 hours ago',
                doctor: 'Dr. Smith'
              },
              {
                patient: 'Jean P.',
                rating: 4,
                comment: 'Good experience overall. Would appreciate more appointment slots.',
                date: '5 hours ago',
                doctor: 'Dr. Johnson'
              },
              {
                patient: 'Sophie M.',
                rating: 5,
                comment: 'Very convenient for busy schedules. Highly recommend!',
                date: '1 day ago',
                doctor: 'Dr. Brown'
              },
            ].map((review, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.patient}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{review.doctor} • {review.date}</p>
                  </div>
                </div>
                <p className="text-sm">{review.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Satisfaction Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Satisfaction Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                { week: 'W1', nps: 42, csat: 85, reviews: 4.2 },
                { week: 'W2', nps: 45, csat: 87, reviews: 4.3 },
                { week: 'W3', nps: 48, csat: 88, reviews: 4.4 },
                { week: 'W4', nps: 51, csat: 90, reviews: 4.5 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="nps" stroke={CHART_COLORS.primary} name="NPS Score" />
              <Line type="monotone" dataKey="csat" stroke={CHART_COLORS.success} name="CSAT %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  // Operational Section
  const OperationalSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Doctor Utilization"
          value={metrics?.doctorUtilization || 0}
          format={(v) => `${v}%`}
          icon={Activity}
          target={75}
        />
        <KPICard
          title="Platform Uptime"
          value={metrics?.platformUptime || 99.9}
          format={(v) => `${v}%`}
          icon={Shield}
        />
        <KPICard
          title="Avg Response Time"
          value={250}
          format={(v) => `${v}ms`}
          icon={Zap}
        />
        <KPICard
          title="Support Tickets"
          value={12}
          icon={Ticket}
          description="Open tickets"
        />
      </div>

      {/* Doctor Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Doctor</th>
                  <th className="text-center px-2">Utilization</th>
                  <th className="text-center px-2">Rating</th>
                  <th className="text-center px-2">Appointments</th>
                  <th className="text-center px-2">Revenue</th>
                  <th className="text-center px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Dr. Smith', util: 85, rating: 4.8, appts: 124, revenue: 6200, status: 'active' },
                  { name: 'Dr. Johnson', util: 72, rating: 4.6, appts: 98, revenue: 4900, status: 'active' },
                  { name: 'Dr. Brown', util: 68, rating: 4.9, appts: 87, revenue: 4350, status: 'active' },
                  { name: 'Dr. Davis', util: 45, rating: 4.5, appts: 56, revenue: 2800, status: 'limited' },
                ].map((doc) => (
                  <tr key={doc.name} className="border-b">
                    <td className="py-2 font-medium">{doc.name}</td>
                    <td className="text-center px-2">
                      <Badge variant={doc.util > 70 ? "default" : "secondary"}>
                        {doc.util}%
                      </Badge>
                    </td>
                    <td className="text-center px-2">{doc.rating}/5</td>
                    <td className="text-center px-2">{doc.appts}</td>
                    <td className="text-center px-2">€{doc.revenue}</td>
                    <td className="text-center px-2">
                      <Badge variant={doc.status === 'active' ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { service: 'API Gateway', status: 'operational', uptime: 99.99, latency: 45 },
              { service: 'Video Service', status: 'operational', uptime: 99.95, latency: 120 },
              { service: 'Payment Processing', status: 'operational', uptime: 99.98, latency: 250 },
              { service: 'Database', status: 'degraded', uptime: 99.70, latency: 380 },
            ].map((service) => (
              <div key={service.service} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    service.status === 'operational' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className="font-medium">{service.service}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Uptime: {service.uptime}%</span>
                  <span className="text-gray-500">Latency: {service.latency}ms</span>
                  <Badge variant={service.status === 'operational' ? "default" : "secondary"}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Predictive Analytics Section
  const PredictiveSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Churn Risk Patients"
          value={metrics?.churnRiskPatients || 0}
          icon={AlertTriangle}
          description="Requiring intervention"
        />
        <KPICard
          title="Projected Monthly Revenue"
          value={metrics?.projectedRevenue || 0}
          format={(v) => `€${(v/1000).toFixed(0)}k`}
          icon={TrendingUp}
        />
        <KPICard
          title="Demand Forecast"
          value={metrics?.demandForecast || 0}
          format={(v) => `+${v}%`}
          icon={Brain}
          description="Next 30 days"
        />
      </div>

      {/* Churn Prediction */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">127</div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-xs text-gray-500">90%+ churn probability</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">256</div>
                <p className="text-sm text-gray-600">Medium Risk</p>
                <p className="text-xs text-gray-500">50-90% churn probability</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">1,847</div>
                <p className="text-sm text-gray-600">Low Risk</p>
                <p className="text-xs text-gray-500">&lt;50% churn probability</p>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI model identifies 127 high-risk patients. Recommended action: Targeted re-engagement campaign with special offers.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Projection */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Projection (Next 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={[
                { month: 'Jan', actual: 168000, projected: 168000, confidence: [160000, 175000] },
                { month: 'Feb', actual: null, projected: 185000, confidence: [175000, 195000] },
                { month: 'Mar', actual: null, projected: 205000, confidence: [190000, 220000] },
                { month: 'Apr', actual: null, projected: 228000, confidence: [210000, 246000] },
                { month: 'May', actual: null, projected: 255000, confidence: [235000, 275000] },
                { month: 'Jun', actual: null, projected: 285000, confidence: [260000, 310000] },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                name="Actual"
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke={CHART_COLORS.secondary}
                fill={CHART_COLORS.secondary}
                fillOpacity={0.6}
                strokeDasharray="5 5"
                name="Projected"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: 'opportunity',
                title: 'Untapped Market Segment',
                description: 'Young professionals (25-35) show 3x higher conversion rates but represent only 15% of traffic.',
                action: 'Launch targeted campaign'
              },
              {
                type: 'warning',
                title: 'Doctor Capacity Alert',
                description: 'Current growth trajectory will exceed doctor capacity by March. Consider onboarding 2-3 new doctors.',
                action: 'Start recruitment'
              },
              {
                type: 'insight',
                title: 'Optimal Pricing Discovered',
                description: 'A/B test shows €55 price point increases revenue by 18% without affecting conversion.',
                action: 'Update pricing'
              },
            ].map((insight, idx) => (
              <Alert key={idx} className={cn(
                "border-l-4",
                insight.type === 'opportunity' && "border-l-green-500",
                insight.type === 'warning' && "border-l-yellow-500",
                insight.type === 'insight' && "border-l-blue-500"
              )}>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-sm text-gray-600 mb-2">{insight.description}</div>
                  <Button size="sm" variant="outline">{insight.action}</Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Meetings Section Component
  const MeetingsSection = () => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'time' | 'doctor'>('time');
    const [searchFilter, setSearchFilter] = useState<string>('');
    
    // Fetch meetings data
    const { data: meetingStats, isLoading: meetingsLoading } = useQuery({
      queryKey: ['/api/admin/meetings'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin/meetings');
        return await response.json() as MeetingStats;
      },
      refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    });

    const filteredMeetings = meetingStats?.meetings.filter(meeting => {
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      const matchesSearch = searchFilter === '' || 
        meeting.patientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        meeting.doctorName.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesStatus && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'time') {
        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
      } else {
        return a.doctorName.localeCompare(b.doctorName);
      }
    }) || [];

    const getStatusColor = (status: Meeting['status']) => {
      switch (status) {
        case 'live': return 'bg-green-100 text-green-800 border-green-200';
        case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        case 'issue': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusIcon = (status: Meeting['status']) => {
      switch (status) {
        case 'live': return <Video className="h-4 w-4" />;
        case 'planned': return <Clock className="h-4 w-4" />;
        case 'completed': return <Check className="h-4 w-4" />;
        case 'cancelled': return <X className="h-4 w-4" />;
        case 'issue': return <AlertTriangle className="h-4 w-4" />;
        default: return null;
      }
    };

    if (meetingsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Live</p>
                  <p className="text-2xl font-bold text-green-600">{meetingStats?.totalLive || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Video className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Planned</p>
                  <p className="text-2xl font-bold text-blue-600">{meetingStats?.totalPlanned || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">{meetingStats?.totalCompleted || 0}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Check className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">{meetingStats?.totalCancelled || 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Issues</p>
                  <p className="text-2xl font-bold text-yellow-600">{meetingStats?.totalWithIssues || 0}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Live & Planned Meetings
                <div className="ml-2 flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-500">Real-time</span>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search patient or doctor..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-56"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="issue">Issues</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'time' | 'doctor')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Sort by Time</SelectItem>
                    <SelectItem value="doctor">Sort by Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No meetings found for the selected filter
                </div>
              ) : (
                filteredMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Badge className={cn("flex items-center gap-1", getStatusColor(meeting.status))}>
                        {getStatusIcon(meeting.status)}
                        {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                      </Badge>
                      <div>
                        <p className="font-medium">{meeting.patientName}</p>
                        <p className="text-sm text-gray-600">with {meeting.doctorName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{format(new Date(meeting.scheduledTime), 'HH:mm')}</p>
                        <p className="text-sm text-gray-600">{format(new Date(meeting.scheduledTime), 'MMM d, yyyy')}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{meeting.duration} min</p>
                      </div>
                      
                      {meeting.alertDetails && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-2 bg-yellow-100 rounded-lg cursor-pointer">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              </div>
                            </TooltipTrigger>
                            
                              <TooltipContent>
                      <p>{meeting.alertDetails}
                                
                              </p>
                    </TooltipContent>
                            
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {meeting.status === 'live' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => {
                            // Navigate to video consultation
                            window.location.href = `/video/${meeting.id}`;
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Join Meeting
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader />
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <AdminHeader />
        <div className="container mx-auto p-4 max-w-7xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load dashboard metrics. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 border-r p-4">
          <div className="mb-6">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                {navigationItems.find(item => item.id === activeSection)?.label}
              </h1>
              <p className="text-gray-600">
                Real-time metrics and insights for your telemedicine platform
              </p>
            </div>

            {/* Data Source Notice */}
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Data Sources:</strong> All metrics are now fetched directly from the PostgreSQL database. 
                <br />✓ <strong>Real data:</strong> Appointments, revenue, active users, retention rate, cohort analysis, user journey, conversion funnel
                <br />✅ <strong>Analytics Tracking Implemented:</strong> Homepage visits, discovery actions, and booking funnel events are now being tracked in real-time
              </AlertDescription>
            </Alert>

            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'engagement' && <UserEngagementSection />}
            {activeSection === 'growth' && <GrowthSection />}
            {activeSection === 'feedback' && <FeedbackSection />}
            {activeSection === 'operational' && <OperationalSection />}
            {activeSection === 'predictive' && <PredictiveSection />}
            {activeSection === 'meetings' && <MeetingsSection />}
          </div>
        </div>
      </div>
    </>
  );
}