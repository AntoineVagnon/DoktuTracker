import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Calendar, Clock, Settings, History, Plus, ExternalLink } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

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

export function MembershipChip() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: allowanceData, isLoading, error } = useQuery<AllowanceStatus>({
    queryKey: ["/api/membership/allowance"],
    enabled: isAuthenticated && user?.role === "patient" && !!user?.stripeSubscriptionId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Don't show chip for non-patients or when not authenticated
  if (!isAuthenticated || user?.role !== "patient") {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded-full w-24"></div>
        </div>
      </div>
    );
  }

  // Don't show anything if query failed or user has no subscription
  if (error || !allowanceData?.hasAllowance || !allowanceData?.allowanceStatus) {
    return null;
  }

  const allowance = allowanceData.allowanceStatus;
  const daysUntilReset = Math.max(0, differenceInDays(new Date(allowance.resetDate), new Date()));
  const usagePercentage = Math.min(100, Math.max(0, (allowance.allowanceUsed / Math.max(allowance.allowanceGranted, 1)) * 100));

  // Determine chip variant and text based on remaining credits
  const getChipVariant = () => {
    if (allowance.allowanceRemaining === 0) return "destructive";
    if (allowance.allowanceRemaining <= 1) return "secondary";
    return "default";
  };

  const getChipText = () => {
    if (allowance.allowanceRemaining === 0) return "0 credits • Add credits";
    if (allowance.allowanceRemaining === 1) return "Last credit";
    return `${allowance.allowanceRemaining} credits left`;
  };

  const getProgressColor = () => {
    if (usagePercentage >= 100) return "bg-red-500";
    if (usagePercentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
          data-testid="membership-chip"
        >
          <CreditCard className="h-3 w-3 mr-1.5" />
          <span>{getChipText()}</span>
          <span className="mx-1.5 text-gray-400">•</span>
          <span>Resets {format(new Date(allowance.cycleEnd), "MMM d")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" data-testid="membership-popover">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Standard Plan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(allowance.cycleStart), "MMM d")} - {format(new Date(allowance.cycleEnd), "MMM d, yyyy")}
              </p>
            </div>
            <Badge variant={getChipVariant()} data-testid="allowance-status-badge">
              {allowance.allowanceRemaining === 0 ? "Exhausted" : 
               allowance.allowanceRemaining === 1 ? "Low" : "Available"}
            </Badge>
          </div>

          {/* Usage meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Usage this cycle</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {allowance.allowanceUsed} used of {allowance.allowanceGranted} / {allowance.allowanceRemaining} left
              </span>
            </div>
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
            <p className="sr-only">
              You have {allowance.allowanceRemaining} monthly credits; {allowance.allowanceUsed} used; resets {format(new Date(allowance.cycleEnd), "MMM d")}
            </p>
          </div>

          {/* Reset information */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Next reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(allowance.resetDate), "MMM d, yyyy")}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setLocation('/settings?tab=membership')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage plan
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setLocation('/membership/history')}
            >
              <History className="h-4 w-4 mr-2" />
              Usage history
            </Button>
            {allowance.allowanceRemaining === 0 && (
              <Button 
                size="sm" 
                className="w-full bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]"
                onClick={() => setLocation('/membership/add-credits')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add credits
              </Button>
            )}
          </div>

          {/* Secondary actions */}
          <div className="pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-gray-500 hover:text-gray-700"
              onClick={() => window.open('/help/membership-faqs', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              FAQs
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}