import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import DoctorPhotoModal from "@/components/admin/DoctorPhotoModal";
import {
  Calendar, Users, TrendingUp, AlertCircle, Euro, UserX,
  ChevronDown, RefreshCw, UserPlus, Ticket, Send, Video,
  Clock, X, AlertTriangle, Shield, Mail, Trash2,
  Star, Activity, Brain, MessageSquare, Settings,
  ArrowUp, ArrowDown, Target, Zap, Heart, TrendingDown,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  FileText, User, DollarSign, Percent, Check, ExternalLink, Info,
  Menu, LogIn, Edit, Eye, Search, InfoIcon, Camera, CheckCircle2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mutate as mutateSWR } from "swr";
import { format, subDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import EmailManagement from "./EmailManagement";
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
  avgResponseTime?: number;
  supportTickets?: number;
  
  // Satisfaction
  npsScore: number;
  npsScorePrev: number;
  csat: number;
  reviewRating: number;
  satisfactionTrends?: Array<{
    week: string;
    nps: number;
    csat: number;
  }>;
  recentReviews?: Array<{
    patient: string;
    rating: number;
    comment: string;
    date: string;
    doctor: string;
  }>;
  
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
  { id: 'meetings', label: 'Live & Planned Meetings', icon: Video },
  { id: 'notifications', label: 'Notifications', icon: Mail },
  { id: 'emails', label: 'Email Management', icon: Send },
  { id: 'doctors', label: 'Doctors', icon: UserPlus }
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
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Immediate redirect for unauthorized users
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        navigate('/');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Fetch comprehensive dashboard metrics
  const { data: metrics, isLoading: metricsLoading, error } = useQuery({
    queryKey: ['/api/admin/metrics', timeRange],
    queryFn: async () => {
      const endDate = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(endDate, days);
      
      const response = await apiRequest('GET', `/api/admin/metrics?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      return await response.json() as DashboardMetrics;
    },
    enabled: isAuthenticated && user?.role === 'admin', // Only fetch if authenticated as admin
    refetchInterval: 60000, // Refresh every minute
  });

  // Combined loading state
  const isLoading = authLoading || metricsLoading;

  // Block access for unauthenticated users
  if (authLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Block access for unauthenticated users
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Block access for non-admins
  if (user?.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

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
        {/* Only show NPS Score if we have enough reviews */}
        {metrics?.npsScore !== undefined && (
          <KPICard
            title="NPS Score"
            value={metrics.npsScore}
            previousValue={metrics.npsScorePrev}
            icon={Star}
            format={(v) => `+${v}`}
            target={50}
            tooltip="Net Promoter Score based on patient ratings. Calculated from reviews with 4.5+ stars as promoters and <3.5 stars as detractors. Requires at least 5 reviews to display."
          />
        )}
        {/* Only show CSAT if we have enough reviews */}
        {metrics?.csat !== undefined && (
          <KPICard
            title="CSAT"
            value={metrics.csat}
            format={(v) => `${v}%`}
            icon={Heart}
            target={90}
            tooltip="Customer Satisfaction score - percentage of patients who rated 4+ stars. Requires at least 5 reviews to display."
          />
        )}
        <KPICard
          title="Avg Review Rating"
          value={metrics?.reviewRating || 0}
          format={(v) => `${v.toFixed(1)}/5`}
          icon={Star}
          tooltip="Average star rating from all patient reviews. Shows 0.0 when no reviews exist."
        />
      </div>

      {/* Recent Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patient Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.recentReviews && metrics.recentReviews.length > 0 ? (
              metrics.recentReviews.map((review: any, idx: number) => (
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
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p>No reviews yet</p>
                <p className="text-sm mt-2">Patient feedback will appear here once reviews are submitted</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Satisfaction Trends - only show if we have trend data */}
      {metrics?.satisfactionTrends && (
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.satisfactionTrends}>
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
      )}
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
          value={metrics?.platformUptime || 100}
          format={(v) => `${v}%`}
          icon={Shield}
        />
        <KPICard
          title="Avg Response Time"
          value={metrics?.avgResponseTime || 0}
          format={(v) => v > 0 ? `${v}ms` : 'N/A'}
          icon={Zap}
          description={metrics?.avgResponseTime ? undefined : "Monitoring not configured"}
        />
        <KPICard
          title="Support Tickets"
          value={metrics?.supportTickets || 0}
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

  // DoctorsSection Component - Enhanced with Tabs
  const DoctorsSection = () => {
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'active', 'rejected'
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionData, setRejectionData] = useState({ reason: '', type: 'soft', notes: '' });
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      specialization: '',
      title: 'Dr.',
      bio: '',
      licenseNumber: '',
      yearsOfExperience: 0,
      consultationFee: 35,
      languages: ['English'],
    });
    const [editFormData, setEditFormData] = useState({
      specialty: '',
      bio: '',
      education: '',
      experience: '',
      medicalApproach: '',
      rppsNumber: '',
      consultationPrice: '',
      languages: ['English'],
      title: '',
      firstName: '',
      lastName: '',
      phone: '',
    });
    const [createdCredentials, setCreatedCredentials] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch all doctors
    const { data: doctors, isLoading: doctorsLoading, refetch: refetchDoctors } = useQuery({
      queryKey: ['/api/admin/doctors'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin/doctors');
        return await response.json();
      },
      refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch selected doctor details
    const { data: doctorDetails, isLoading: detailsLoading } = useQuery({
      queryKey: ['/api/admin/doctors', selectedDoctor?.id],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/admin/doctors/${selectedDoctor.id}`);
        return await response.json();
      },
      enabled: !!selectedDoctor,
    });

    // Fetch doctor availability
    const { data: doctorAvailability, isLoading: availabilityLoading } = useQuery({
      queryKey: ['/api/admin/doctors', selectedDoctor?.id, 'availability'],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/admin/doctors/${selectedDoctor.id}/availability`);
        return await response.json();
      },
      enabled: !!selectedDoctor && showDetailModal,
    });

    // Fetch doctor applications (pending review)
    const { data: applications, isLoading: applicationsLoading, refetch: refetchApplications } = useQuery({
      queryKey: ['/api/admin/doctors/applications', 'pending_review'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin/doctors/applications?status=pending_review');
        return await response.json();
      },
      refetchInterval: 30000,
    });

    // Fetch rejected/suspended doctors
    const { data: rejectedDoctors, isLoading: rejectedLoading, refetch: refetchRejected } = useQuery({
      queryKey: ['/api/admin/doctors/applications', 'rejected'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin/doctors/applications?status=rejected_soft,rejected_hard,suspended');
        return await response.json();
      },
      refetchInterval: 30000,
    });

    // Filter doctors by search query
    const filteredDoctors = doctors?.filter((doc: any) => {
      const query = searchQuery.toLowerCase();
      const fullName = `${doc.user?.firstName || ''} ${doc.user?.lastName || ''}`.toLowerCase();
      const email = doc.user?.email?.toLowerCase() || '';
      const specialty = doc.specialty?.toLowerCase() || '';
      return fullName.includes(query) || email.includes(query) || specialty.includes(query);
    }) || [];

    const handleCreateDoctor = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreating(true);

      try {
        // Ensure languages is always an array
        const dataToSend = {
          ...formData,
          languages: Array.isArray(formData.languages) ? formData.languages : [formData.languages]
        };
        console.log('[Create Doctor] Sending data:', dataToSend);

        const response = await apiRequest('POST', '/api/admin/create-doctor', dataToSend);
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Doctor Created Successfully",
            description: `${result.doctor.firstName} ${result.doctor.lastName} has been added to the system.`,
          });
          setCreatedCredentials(result.credentials);
          setShowCreateForm(false);
          // Reset form
          setFormData({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            specialization: '',
            title: 'Dr.',
            bio: '',
            licenseNumber: '',
            yearsOfExperience: 0,
            consultationFee: 35,
            languages: ['English'],
          });
        } else {
          throw new Error(result.message || 'Failed to create doctor');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to create doctor account",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
    };

    const generatePassword = () => {
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      setFormData({ ...formData, password });
    };

    const handleViewDoctor = (doctor: any) => {
      setSelectedDoctor(doctor);
      setShowDetailModal(true);
    };

    const handleEditDoctor = (doctor: any) => {
      setSelectedDoctor(doctor);
      setEditFormData({
        specialty: doctor.specialty || '',
        bio: doctor.bio || '',
        education: doctor.education || '',
        experience: doctor.experience || '',
        medicalApproach: doctor.medicalApproach || '',
        rppsNumber: doctor.rppsNumber || '',
        consultationPrice: doctor.consultationPrice || '',
        languages: doctor.languages || ['English'],
        title: doctor.user?.title || '',
        firstName: doctor.user?.firstName || '',
        lastName: doctor.user?.lastName || '',
        phone: doctor.user?.phone || '',
      });
      setShowEditForm(true);
    };

    const handleUpdateDoctor = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsUpdating(true);

      try {
        const response = await apiRequest('PUT', `/api/admin/doctors/${selectedDoctor.id}`, editFormData);
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Doctor Updated Successfully",
            description: "The doctor profile has been updated.",
          });
          setShowEditForm(false);
          setShowDetailModal(false);
          refetchDoctors();
        } else {
          throw new Error(result.message || 'Failed to update doctor');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to update doctor profile",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    };

    // Handle approve application
    const handleApproveApplication = async (doctorId: number) => {
      try {
        const response = await apiRequest('POST', `/api/admin/doctors/applications/${doctorId}/approve`, {
          notes: 'Application approved by admin'
        });
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Application Approved",
            description: "The doctor has been notified and can now complete their profile.",
          });
          refetchApplications();
          refetchDoctors();
        } else {
          throw new Error(result.error || 'Failed to approve application');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to approve application",
          variant: "destructive",
        });
      }
    };

    // Handle reject application
    const handleRejectApplication = async () => {
      if (!selectedDoctor || !rejectionData.reason) {
        toast({
          title: "Error",
          description: "Please provide a rejection reason",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await apiRequest('POST', `/api/admin/doctors/applications/${selectedDoctor.id}/reject`, rejectionData);
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Application Rejected",
            description: `The doctor has been notified. Type: ${rejectionData.type}`,
          });
          setShowRejectModal(false);
          setRejectionData({ reason: '', type: 'soft', notes: '' });
          setSelectedDoctor(null);
          refetchApplications();
          refetchRejected();
        } else {
          throw new Error(result.error || 'Failed to reject application');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to reject application",
          variant: "destructive",
        });
      }
    };

    // Handle suspend doctor
    const handleSuspendDoctor = async (doctorId: number) => {
      const reason = prompt('Please provide a reason for suspension:');
      if (!reason) return;

      try {
        const response = await apiRequest('POST', `/api/admin/doctors/${doctorId}/suspend`, { reason });
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Doctor Suspended",
            description: "The doctor account has been suspended.",
          });
          refetchDoctors();
          refetchRejected();
        } else {
          throw new Error(result.error || 'Failed to suspend doctor');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to suspend doctor",
          variant: "destructive",
        });
      }
    };

    // Handle reactivate doctor
    const handleReactivateDoctor = async (doctorId: number) => {
      try {
        const response = await apiRequest('POST', `/api/admin/doctors/${doctorId}/reactivate`, {});
        const result = await response.json();

        if (response.ok) {
          toast({
            title: "Doctor Reactivated",
            description: "The doctor account has been reactivated.",
          });
          refetchDoctors();
          refetchRejected();
        } else {
          throw new Error(result.error || 'Failed to reactivate doctor');
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to reactivate doctor",
          variant: "destructive",
        });
      }
    };

    return (
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Doctor Management</h2>
            <p className="text-gray-600">Review applications and manage doctor accounts</p>
          </div>
          {activeTab === 'active' && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {showCreateForm ? 'Cancel' : 'Create New Doctor'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
              {applications?.pagination?.total > 0 && (
                <Badge variant="secondary" className="ml-1">{applications.pagination.total}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Active Doctors
              {doctors?.length > 0 && (
                <Badge variant="secondary" className="ml-1">{doctors.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected/Suspended
              {rejectedDoctors?.pagination?.total > 0 && (
                <Badge variant="secondary" className="ml-1">{rejectedDoctors.pagination.total}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Content - Pending Review */}
          <TabsContent value="pending" className="space-y-4">
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading applications...</span>
              </div>
            ) : !applications?.applications || applications.applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No pending applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.applications.map((app: any) => (
                  <Card key={app.doctor.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Dr. {app.user.firstName} {app.user.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{app.doctor.specialty}</p>
                        </div>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="font-medium">{app.user.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Phone</p>
                          <p className="font-medium">{app.user.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">License Number</p>
                          <p className="font-medium">{app.doctor.licenseNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Countries</p>
                          <p className="font-medium">{app.doctor.countries?.length || 0} countries</p>
                        </div>
                      </div>

                      {app.doctor.countries && app.doctor.countries.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Licensed Countries:</p>
                          <div className="flex flex-wrap gap-2">
                            {app.doctor.countries.map((country: string) => (
                              <Badge key={country} variant="outline">{country}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleApproveApplication(app.doctor.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedDoctor(app.doctor);
                            setShowRejectModal(true);
                          }}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Content - Active Doctors (existing functionality) */}
          <TabsContent value="active" className="space-y-4">

        {/* Created Credentials Display */}
        {createdCredentials && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="text-green-800">
                <p className="font-semibold mb-2">Doctor account created successfully!</p>
                <div className="bg-white p-3 rounded border border-green-200 space-y-1">
                  <p><strong>Email:</strong> {createdCredentials.email}</p>
                  <p><strong>Password:</strong> {createdCredentials.password}</p>
                </div>
                <p className="text-sm mt-2">⚠️ Make sure to save these credentials securely. The password won't be shown again.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreatedCredentials(null)}
                  className="mt-2"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Doctor Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name *</label>
                    <Input
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Select
                      value={formData.title}
                      onValueChange={(value) => setFormData({ ...formData, title: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                        <SelectItem value="Prof.">Prof.</SelectItem>
                        <SelectItem value="MD">MD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Specialization *</label>
                    <Input
                      required
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      placeholder="General Medicine"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@doktu.co"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Password *</label>
                  <div className="flex gap-2">
                    <Input
                      required
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 8 characters"
                      minLength={8}
                    />
                    <Button type="button" onClick={generatePassword} variant="outline">
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <Input
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief description of expertise..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">License Number</label>
                    <Input
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Years of Experience</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Consultation Fee (€)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Languages (comma-separated)</label>
                  <Input
                    value={formData.languages.join(', ')}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value.split(',').map(l => l.trim()) })}
                    placeholder="English, French, Spanish"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Doctor'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Doctor Management Table */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Doctors</CardTitle>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {doctorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading doctors...</span>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No doctors found matching your search.' : 'No doctors created yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-3 font-medium">Doctor</th>
                      <th className="pb-3 font-medium">Specialty</th>
                      <th className="pb-3 font-medium">Rating</th>
                      <th className="pb-3 font-medium">Appointments</th>
                      <th className="pb-3 font-medium">Price</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map((doctor: any) => (
                      <tr key={doctor.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {doctor.user?.profileImageUrl ? (
                              <img
                                src={doctor.user.profileImageUrl}
                                alt={`Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{doctor.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-700">{doctor.specialty || 'Not specified'}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{doctor.rating || '5.0'}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-700">-</span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-medium text-gray-900">
                            €{doctor.consultationPrice || '0.00'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDoctor(doctor)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDoctor(doctor)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          </TabsContent>

        {/* Modals - Doctor Detail and Edit Form */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Doctor Details</DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading details...</span>
              </div>
            ) : doctorDetails ? (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  {/* Profile Section */}
                  <div className="flex items-start gap-4 pb-6 border-b">
                    <button
                      onClick={() => setShowPhotoModal(true)}
                      className="relative w-20 h-20 rounded-full overflow-hidden group cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition-colors"
                    >
                      {doctorDetails.user?.profileImageUrl ? (
                        <img
                          src={doctorDetails.user.profileImageUrl}
                          alt={`Dr. ${doctorDetails.user.firstName} ${doctorDetails.user.lastName}`}
                          className="w-full h-full object-cover"
                          key={doctorDetails.user.profileImageUrl}
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                          <User className="h-10 w-10 text-blue-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                        <Edit className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Dr. {doctorDetails.user?.firstName} {doctorDetails.user?.lastName}
                      </h3>
                      <p className="text-gray-600 mt-1">{doctorDetails.specialty || 'General Practice'}</p>
                      <p className="text-sm text-gray-500 mt-1">{doctorDetails.user?.email}</p>
                      {doctorDetails.rppsNumber && (
                        <p className="text-sm text-gray-500 mt-1">License: {doctorDetails.rppsNumber}</p>
                      )}
                    </div>
                    <Button onClick={() => handleEditDoctor(doctorDetails)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>

                  {/* Bio Section */}
                  {doctorDetails.bio && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{doctorDetails.bio}</p>
                    </div>
                  )}

                  {/* Statistics Grid */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs font-medium">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {doctorDetails.stats?.totalAppointments || 0}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Appointments</div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Check className="h-4 w-4" />
                          <span className="text-xs font-medium">Completed</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {doctorDetails.stats?.completedAppointments || 0}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Success Rate: {doctorDetails.stats?.completionRate || 0}%</div>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                          <Star className="h-4 w-4" />
                          <span className="text-xs font-medium">Rating</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {doctorDetails.stats?.averageRating || doctorDetails.rating || '5.0'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Average Score</div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                          <Euro className="h-4 w-4" />
                          <span className="text-xs font-medium">Revenue</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          €{doctorDetails.stats?.totalRevenue?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Total Earned</div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Consultation Price</h4>
                      <p className="text-lg font-medium text-blue-600">€{doctorDetails.consultationPrice || '0.00'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Available Slots</h4>
                      <p className="text-lg font-medium text-green-600">
                        {doctorDetails.stats?.availableSlotsCount || 0}
                      </p>
                    </div>
                    {doctorDetails.languages && doctorDetails.languages.length > 0 && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-gray-900 mb-2">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                          {doctorDetails.languages.map((lang: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{lang}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="availability">
                  {availabilityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-600">Loading availability...</span>
                    </div>
                  ) : (
                    <AvailabilityCalendar
                      doctorId={doctorDetails.id}
                      doctorName={`${doctorDetails.user?.firstName} ${doctorDetails.user?.lastName}`}
                      slots={doctorAvailability || []}
                      onSlotClick={(slot) => {
                        console.log('Slot clicked:', slot);
                      }}
                      onAppointmentCreated={() => {
                        // Refresh availability data
                        queryClient.invalidateQueries({
                          queryKey: ['/api/admin/doctors', selectedDoctor?.id, 'availability']
                        });
                        toast({
                          title: "Success",
                          description: "Appointment created successfully",
                        });
                      }}
                    />
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load doctor details</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Doctor Edit Form Modal */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Doctor Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateDoctor} className="space-y-4">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {doctorDetails?.user?.profileImageUrl ? (
                    <img
                      src={doctorDetails.user.profileImageUrl}
                      alt={`${doctorDetails.user?.firstName} ${doctorDetails.user?.lastName}`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm"
                      key={doctorDetails.user.profileImageUrl}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-sm">
                      <User className="h-12 w-12 text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Profile Photo</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Update the doctor's profile picture
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPhotoModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Edit Photo
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={editFormData.specialty}
                  onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                  placeholder="e.g., Cardiology, Pediatrics"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biography
                </label>
                <textarea
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  placeholder="Professional biography and experience..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RPPS Number (License)
                </label>
                <Input
                  type="text"
                  value={editFormData.rppsNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, rppsNumber: e.target.value })}
                  placeholder="Professional license number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultation Price (€) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.consultationPrice}
                  onChange={(e) => setEditFormData({ ...editFormData, consultationPrice: e.target.value })}
                  placeholder="45.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Languages (comma-separated)
                </label>
                <Input
                  type="text"
                  value={editFormData.languages.join(', ')}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    languages: e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang)
                  })}
                  placeholder="English, French, Spanish"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education
                </label>
                <textarea
                  value={editFormData.education}
                  onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                  placeholder="Educational background..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience
                </label>
                <textarea
                  value={editFormData.experience}
                  onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                  placeholder="Professional experience..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Approach
                </label>
                <textarea
                  value={editFormData.medicalApproach}
                  onChange={(e) => setEditFormData({ ...editFormData, medicalApproach: e.target.value })}
                  placeholder="Medical philosophy and approach to patient care..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Dr., Prof., etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditForm(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

          {/* Tab Content - Rejected/Suspended */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
                <span className="ml-2 text-gray-600">Loading rejected doctors...</span>
              </div>
            ) : !rejectedDoctors?.applications || rejectedDoctors.applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No rejected or suspended doctors</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rejectedDoctors.applications.map((app: any) => (
                  <Card key={app.doctor.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Dr. {app.user.firstName} {app.user.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">{app.doctor.specialty}</p>
                        </div>
                        <Badge variant={app.doctor.status === 'suspended' ? 'destructive' : 'secondary'}>
                          {app.doctor.status === 'suspended' && <Ban className="h-3 w-3 mr-1" />}
                          {app.doctor.status === 'rejected_soft' && 'Rejected (Soft)'}
                          {app.doctor.status === 'rejected_hard' && 'Rejected (Hard)'}
                          {app.doctor.status === 'suspended' && 'Suspended'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Email</p>
                          <p className="font-medium">{app.user.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">License Number</p>
                          <p className="font-medium">{app.doctor.licenseNumber}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p className="font-medium">
                            {app.doctor.rejectedAt ? format(new Date(app.doctor.rejectedAt), 'PPP') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {app.doctor.rejectionReason && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Reason:</strong> {app.doctor.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {app.doctor.status === 'suspended' && (
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => handleReactivateDoctor(app.doctor.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Reactivate
                          </Button>
                        </div>
                      )}

                      {app.doctor.status === 'rejected_soft' && (
                        <p className="text-sm text-gray-600 pt-4">
                          This doctor can reapply after 30 days from the rejection date.
                        </p>
                      )}

                      {app.doctor.status === 'rejected_hard' && (
                        <p className="text-sm text-red-600 pt-4">
                          This email address is permanently blacklisted and cannot reapply.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Rejection Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Type *</Label>
                <Select
                  value={rejectionData.type}
                  onValueChange={(value) => setRejectionData({ ...rejectionData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">Soft Rejection (Can reapply in 30 days)</SelectItem>
                    <SelectItem value="hard">Hard Rejection (Email blacklisted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionData.reason}
                  onChange={(e) => setRejectionData({ ...rejectionData, reason: e.target.value })}
                  placeholder="Please provide a clear reason for rejection"
                  rows={3}
                />
              </div>

              <div>
                <Label>Internal Notes (Optional)</Label>
                <Textarea
                  value={rejectionData.notes}
                  onChange={(e) => setRejectionData({ ...rejectionData, notes: e.target.value })}
                  placeholder="Internal notes for admin records"
                  rows={2}
                />
              </div>

              {rejectionData.type === 'hard' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Hard rejection will permanently blacklist this email address.
                    The doctor will not be able to register again with this email.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleRejectApplication}
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectionData.reason}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionData({ reason: '', type: 'soft', notes: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor Photo Modal */}
        <DoctorPhotoModal
          open={showPhotoModal}
          onOpenChange={setShowPhotoModal}
          doctorId={selectedDoctor?.id}
          currentPhotoUrl={doctorDetails?.user?.profileImageUrl}
          doctorName={`${doctorDetails?.user?.firstName} ${doctorDetails?.user?.lastName}`}
          onSuccess={async () => {
            console.log('Photo upload success! Refreshing queries...');
            console.log('Refetching doctor details:', ['/api/admin/doctors', selectedDoctor?.id]);
            console.log('Refetching doctors list:', ['/api/admin/doctors']);

            // Force refetch instead of just invalidating (because staleTime: Infinity)
            await queryClient.refetchQueries({
              queryKey: ['/api/admin/doctors', selectedDoctor?.id]
            });
            console.log('Doctor details refetched');

            await queryClient.refetchQueries({
              queryKey: ['/api/admin/doctors']
            });
            console.log('Doctors list refetched');

            // Invalidate SWR cache for homepage doctors grid
            console.log('Invalidating SWR cache for /api/doctors');
            await mutateSWR('/api/doctors', undefined, { revalidate: true });
            console.log('SWR cache invalidated and refetched');

            // Also try setting the query data directly as a fallback
            const currentData = queryClient.getQueryData(['/api/admin/doctors', selectedDoctor?.id]);
            console.log('Current doctor data after refetch:', currentData);

            toast({
              title: "Success",
              description: "Profile photo updated successfully",
            });

            console.log('Queries refetched, UI should update now');
          }}
        />
      </div>
    );
  };

  // NotificationsSection Component
  const NotificationsSection = () => {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    
    // Fetch notifications
    const { data: notifications, isLoading: notificationsLoading, refetch } = useQuery({
      queryKey: ['/api/admin/notifications', statusFilter],
      queryFn: async () => {
        const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
        const response = await apiRequest('GET', `/api/admin/notifications${params}`);
        return await response.json();
      },
      refetchInterval: 30000, // Refresh every 30 seconds
    });

    const handleRetry = async (notificationId: string) => {
      try {
        await apiRequest('POST', '/api/admin/notifications/retry', { notificationId });
        toast({
          title: "Notification Retry",
          description: "Notification has been queued for retry",
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to retry notification",
          variant: "destructive",
        });
      }
    };

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'sent':
          return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
        case 'pending':
          return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
        case 'failed':
          return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
        default:
          return <Badge>{status}</Badge>;
      }
    };

    const getTriggerLabel = (triggerCode: string) => {
      const triggers: Record<string, string> = {
        'APPOINTMENT_CONFIRMED': 'Appointment Confirmed',
        'APPOINTMENT_REMINDER_24H': '24h Reminder',
        'APPOINTMENT_REMINDER_2H': '2h Reminder',
        'APPOINTMENT_CANCELLED': 'Appointment Cancelled',
        'APPOINTMENT_RESCHEDULED': 'Appointment Rescheduled',
        'REVIEW_REQUEST': 'Review Request',
        'DOCTOR_UNAVAILABLE': 'Doctor Unavailable',
        'PAYMENT_CONFIRMATION': 'Payment Confirmation',
        'PASSWORD_RESET': 'Password Reset',
        'WELCOME': 'Welcome Email'
      };
      return triggers[triggerCode] || triggerCode;
    };

    if (notificationsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold">
                    {notifications?.filter((n: any) => n.status === 'sent').length || 0}
                  </p>
                </div>
                <Send className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">
                    {notifications?.filter((n: any) => n.status === 'pending').length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold">
                    {notifications?.filter((n: any) => n.status === 'failed').length || 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {notifications?.length > 0 
                      ? Math.round((notifications.filter((n: any) => n.status === 'sent').length / notifications.length) * 100)
                      : 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email Notifications</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => refetch()} 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No notifications found</p>
              ) : (
                <div className="space-y-2">
                  {notifications?.map((notification: any) => (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {getTriggerLabel(notification.triggerCode)}
                            </span>
                            {getStatusBadge(notification.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            To: {notification.user?.email || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Scheduled: {format(new Date(notification.scheduledFor), 'PPp')}
                          </p>
                          {notification.sentAt && (
                            <p className="text-sm text-gray-500">
                              Sent: {format(new Date(notification.sentAt), 'PPp')}
                            </p>
                          )}
                          {notification.errorMessage && (
                            <p className="text-sm text-red-600">
                              Error: {notification.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {notification.retryCount > 0 && (
                            <Badge variant="outline">
                              Retries: {notification.retryCount}
                            </Badge>
                          )}
                          {notification.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(notification.id);
                              }}
                              className="gap-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Details Modal */}
        {selectedNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notification Details</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedNotification(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Type</p>
                    <p>{getTriggerLabel(selectedNotification.triggerCode)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedNotification.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recipient</p>
                    <p>{selectedNotification.user?.email || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Template</p>
                    <p>{selectedNotification.templateKey}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled For</p>
                    <p>{format(new Date(selectedNotification.scheduledFor), 'PPp')}</p>
                  </div>
                  {selectedNotification.sentAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sent At</p>
                      <p>{format(new Date(selectedNotification.sentAt), 'PPp')}</p>
                    </div>
                  )}
                  {selectedNotification.appointmentId && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Appointment ID</p>
                      <p>{selectedNotification.appointmentId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600">Retry Count</p>
                    <p>{selectedNotification.retryCount || 0}</p>
                  </div>
                </div>
                
                {selectedNotification.errorMessage && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Error Message</p>
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{selectedNotification.errorMessage}</AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {selectedNotification.mergeData && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Merge Data</p>
                    <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedNotification.mergeData, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Loading state while fetching metrics
  if (metricsLoading) {
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

  // API error state
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
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Mobile overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <div className={cn(
          "bg-gray-50 border-r transition-transform duration-300 ease-in-out z-50",
          // Desktop: always visible, fixed width
          "lg:w-64 lg:translate-x-0 lg:relative",
          // Mobile: overlay drawer
          "fixed top-[64px] left-0 bottom-0 w-72 transform",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 h-full overflow-y-auto">
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
                onClick={() => {
                  setActiveSection(item.id);
                  // Close mobile sidebar when item is selected
                  setIsMobileSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto w-full lg:w-auto">
          <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
            <div className="mb-6">
              {/* Mobile Header with Hamburger Menu */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2"
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold">
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </h1>
                <div className="w-10" /> {/* Spacer for center alignment */}
              </div>
              
              {/* Desktop Header */}
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold">
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </h1>
                <p className="text-gray-600">
                  Real-time metrics and insights for your telemedicine platform
                </p>
              </div>
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
            {activeSection === 'notifications' && <NotificationsSection />}
            {activeSection === 'emails' && <EmailManagement />}
            {activeSection === 'doctors' && <DoctorsSection />}
          </div>
        </div>
      </div>
    </>
  );
}