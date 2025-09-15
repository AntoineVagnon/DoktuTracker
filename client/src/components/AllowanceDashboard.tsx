import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, CreditCard, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface AllowanceStatus {
  hasAllowance: boolean;
  allowanceStatus: {
    cycleId: string;
    allowanceGranted: number;
    allowanceUsed: number;
    allowanceRemaining: number;
    cycleStart: string;
    cycleEnd: string;
    resetDate: string;
    isActive: boolean;
  } | null;
  message?: string;
}

export function AllowanceDashboard() {
  const { isAuthenticated, user } = useAuth();

  const { data: allowanceData, isLoading, error } = useQuery<AllowanceStatus>({
    queryKey: ["/api/membership/allowance"],
    enabled: isAuthenticated && user?.role === "patient" && !!user?.stripeSubscriptionId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Don't show widget for non-patients or when not authenticated
  if (!isAuthenticated || user?.role !== "patient") {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card className="w-80 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show anything if query failed (user likely has no membership plan)
  if (error) {
    return null;
  }

  // Don't show anything if user has no subscription
  if (!allowanceData?.hasAllowance || !allowanceData?.allowanceStatus) {
    return null;
  }

  const allowance = allowanceData.allowanceStatus;
  
  // Handle edge cases for calculations
  const safeAllowanceGranted = Math.max(allowance.allowanceGranted, 1);
  const usagePercentage = Math.min(100, Math.max(0, (allowance.allowanceUsed / safeAllowanceGranted) * 100));
  const daysUntilReset = Math.max(0, differenceInDays(new Date(allowance.resetDate), new Date()));
  
  // Determine colors based on usage
  const getStatusColor = () => {
    if (allowance.allowanceRemaining === 0) return "destructive";
    if (allowance.allowanceRemaining === 1) return "secondary";
    return "default";
  };

  const getProgressColor = () => {
    if (usagePercentage >= 100) return "bg-red-500";
    if (usagePercentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card 
          className="w-80 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer"
          data-testid="allowance-dashboard-widget"
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with remaining consultations */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300" data-testid="allowance-remaining-count">
                    {allowance.allowanceRemaining} of {allowance.allowanceGranted} remaining
                  </span>
                </div>
                <Badge variant={getStatusColor()} className="text-xs" data-testid="allowance-status-badge">
                  {allowance.allowanceRemaining === 0 ? "Exhausted" : 
                   allowance.allowanceRemaining === 1 ? "Low" : "Available"}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="relative">
                  <Progress 
                    value={usagePercentage} 
                    className="h-2 bg-gray-200 dark:bg-gray-700"
                    data-testid="allowance-usage-progress"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Used: {allowance.allowanceUsed}</span>
                  <span>Total: {allowance.allowanceGranted}</span>
                </div>
              </div>

              {/* Cycle information */}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span data-testid="cycle-reset-info">
                    Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span data-testid="cycle-end-date">
                    {format(new Date(allowance.cycleEnd), "MMM d")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2 text-sm">
          <p><strong>Current Cycle:</strong></p>
          <p>{format(new Date(allowance.cycleStart), "MMM d, yyyy")} - {format(new Date(allowance.cycleEnd), "MMM d, yyyy")}</p>
          <p><strong>Next Reset:</strong> {format(new Date(allowance.resetDate), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">
            Your membership allowance refreshes automatically at the start of each billing cycle.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}