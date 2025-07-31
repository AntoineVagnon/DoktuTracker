import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Clock, Video, Upload, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, isAfter, isBefore, addMinutes, addHours } from "date-fns";

interface BannerProps {
  type: 'payment' | 'live' | 'health_profile' | 'info';
  priority: number;
  title: string;
  description?: string;
  countdown?: Date;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: any;
  }>;
  dismissible?: boolean;
  onDismiss?: () => void;
}

function Banner({ 
  type, 
  priority, 
  title, 
  description, 
  countdown, 
  primaryAction, 
  secondaryActions, 
  dismissible = false,
  onDismiss 
}: BannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!countdown) return;

    const updateCountdown = () => {
      const now = new Date();
      if (isAfter(now, countdown)) {
        setTimeLeft("Expired");
        return;
      }
      
      const distance = formatDistanceToNow(countdown, { addSuffix: true });
      setTimeLeft(distance.replace("in ", ""));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const getBannerStyles = () => {
    switch (type) {
      case 'payment':
        return "bg-red-50 border-red-200 text-red-900";
      case 'live':
        return "bg-green-50 border-green-200 text-green-900";
      case 'health_profile':
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      case 'info':
        return "bg-blue-50 border-blue-200 text-blue-900";
      default:
        return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'payment':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'live':
        return <Video className="h-5 w-5 text-green-600" />;
      case 'health_profile':
        return <Heart className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 mb-2 transition-all duration-300",
      getBannerStyles()
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIcon()}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{title}</h3>
                {countdown && (
                  <span className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
                    {timeLeft}
                  </span>
                )}
              </div>
              {/* Primary action button inline */}
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  size="sm"
                  className={cn(
                    type === 'payment' && "bg-red-600 hover:bg-red-700",
                    type === 'live' && "bg-green-600 hover:bg-green-700",
                    type === 'health_profile' && "bg-yellow-600 hover:bg-yellow-700",
                    type === 'info' && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" />}
                  {primaryAction.label}
                </Button>
              )}
            </div>
            {description && (
              <p className="text-sm mt-1 opacity-80">{description}</p>
            )}
            {/* Secondary actions below if any */}
            {secondaryActions && secondaryActions.length > 0 && (
              <div className="flex items-center gap-3 mt-3">
                {secondaryActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.onClick}
                    variant="outline"
                    size="sm"
                  >
                    {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="ml-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface BannerSystemProps {
  className?: string;
  onOpenHealthProfile?: () => void;
  onOpenDocumentUpload?: (appointmentId: number) => void;
}

export function BannerSystem({ className, onOpenHealthProfile, onOpenDocumentUpload }: BannerSystemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's appointments
  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  // Fetch health profile status
  const { data: healthProfile } = useQuery<any>({
    queryKey: ["/api/health-profile", user?.id],
    enabled: !!user && user.role === 'patient',
  });

  // Fetch document counts
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents", user?.id],
    enabled: !!user,
  });

  // Banner dismissal mutation
  const dismissBannerMutation = useMutation({
    mutationFn: async ({ bannerType, expiresAt }: { bannerType: string; expiresAt?: Date }) => {
      return apiRequest('POST', '/api/banner-dismissals', {
        bannerType,
        expiresAt: expiresAt?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banner-dismissals"] });
    }
  });

  const [banners, setBanners] = useState<BannerProps[]>([]);

  useEffect(() => {
    if (!user || !appointments) return;

    const now = new Date();
    const newBanners: BannerProps[] = [];
    
    console.log('🔄 Banner System - Processing banners at:', {
      currentTime: now.toISOString(),
      currentTimeLocal: now.toLocaleString(),
      appointmentsCount: appointments.length,
      userRole: user.role
    });

    // 1. Payment incomplete banners (highest priority)
    const pendingPaymentAppointments = appointments.filter(
      apt => apt.status === 'pending_payment' && apt.lockedUntil && isAfter(new Date(apt.lockedUntil), now)
    );

    pendingPaymentAppointments.forEach((apt) => {
      newBanners.push({
        type: 'payment',
        priority: 1,
        title: `Payment required to confirm your consultation`,
        countdown: new Date(apt.lockedUntil),
        primaryAction: {
          label: 'Resume Payment',
          onClick: () => window.location.href = `/checkout?appointmentId=${apt.id}`,
          icon: AlertCircle,
        }
      });
    });

    // 2. Live/imminent session banners (second priority)
    // Check for appointments that are close (within 2 hours) to account for timezone issues
    const liveAppointments = appointments.filter(apt => {
      const appointmentTime = new Date(apt.appointmentDate);
      const twoHoursBefore = addMinutes(appointmentTime, -120);
      const thirtyMinutesAfter = addMinutes(appointmentTime, 30);
      
      // Debug logging for timezone issues
      console.log('🕐 Banner System - Appointment check:', {
        appointmentId: apt.id,
        appointmentDate: apt.appointmentDate,
        appointmentTime: appointmentTime.toISOString(),
        appointmentTimeLocal: appointmentTime.toLocaleString(),
        now: now.toISOString(),
        nowLocal: now.toLocaleString(),
        twoHoursBefore: twoHoursBefore.toISOString(),
        thirtyMinutesAfter: thirtyMinutesAfter.toISOString(),
        isAfterStart: isAfter(now, twoHoursBefore),
        isBeforeEnd: isBefore(now, thirtyMinutesAfter),
        status: apt.status,
        shouldShow: apt.status === 'paid' && isAfter(now, twoHoursBefore) && isBefore(now, thirtyMinutesAfter)
      });
      
      return apt.status === 'paid' && 
             isAfter(now, twoHoursBefore) && 
             isBefore(now, thirtyMinutesAfter);
    });

    liveAppointments.forEach((apt) => {
      const appointmentTime = new Date(apt.appointmentDate);
      const isLate = isAfter(now, addMinutes(appointmentTime, 15));
      const isVeryClose = isAfter(now, addMinutes(appointmentTime, -5));
      
      // Determine banner message based on proximity
      let title = `Your consultation with Dr. ${apt.doctor?.firstName || 'Doctor'}`;
      let buttonLabel = 'Join Video Call';
      
      if (isAfter(now, appointmentTime)) {
        title += ' is ready to join';
        buttonLabel = 'Join (Late)';
      } else if (isVeryClose) {
        title += ' starts soon';
      } else {
        title += ` is scheduled (${appointmentTime.toLocaleString()})`;
        buttonLabel = 'View Details';
      }
      
      newBanners.push({
        type: 'live',
        priority: 2,
        title,
        countdown: appointmentTime,
        primaryAction: {
          label: buttonLabel,
          onClick: () => {
            if (apt.zoomJoinUrl && (isLate || isVeryClose)) {
              window.open(apt.zoomJoinUrl, '_blank');
            } else {
              // Fallback to appointment details
              window.location.href = `/appointments/${apt.id}`;
            }
          },
          icon: Video,
        },
        secondaryActions: [
          {
            label: 'Upload Docs',
            onClick: () => onOpenDocumentUpload?.(apt.id),
            icon: Upload,
          }
        ]
      });
    });

    // 3. Health profile completion banner (third priority) - patients only
    if (user.role === 'patient') {
      const needsProfileCompletion = !healthProfile || 
                                   (healthProfile.profileStatus !== 'complete');
      
      if (needsProfileCompletion) {
        const completionScore = healthProfile?.completionScore || 0;
        const missingFields = Math.ceil((100 - completionScore) / 20); // Assuming 5 main fields
        
        newBanners.push({
          type: 'health_profile',
          priority: 3,
          title: healthProfile?.profileStatus === 'needs_review' 
            ? 'Please review your health profile (last update > 6 months)'
            : `Complete your health profile to book consultations (${missingFields} of 5 fields missing)`,
          primaryAction: {
            label: 'Complete Profile',
            onClick: () => onOpenHealthProfile?.(),
            icon: Heart,
          },
          dismissible: healthProfile?.profileStatus === 'needs_review',
          onDismiss: () => {
            dismissBannerMutation.mutate({
              bannerType: 'health_profile',
              expiresAt: addHours(now, 24), // Dismiss for 24 hours
            });
          }
        });
      }
    }

    // Sort banners by priority and update state
    const sortedBanners = newBanners.sort((a, b) => a.priority - b.priority);
    
    // Only update if banners actually changed to prevent infinite loops
    if (JSON.stringify(sortedBanners) !== JSON.stringify(banners)) {
      setBanners(sortedBanners);
    }
  }, [user?.id, user?.role, appointments?.length, healthProfile?.profileStatus, healthProfile?.completionScore]);

  if (banners.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {banners.map((banner, index) => (
        <div 
          key={index}
          className={cn(
            "relative",
            index > 0 && "mt-[-8px] pt-2" // Stack effect - peek lower priority banners
          )}
          style={{
            zIndex: banners.length - index,
          }}
        >
          <Banner {...banner} />
        </div>
      ))}
    </div>
  );
}