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
      "border rounded-lg p-3 mb-2 transition-all duration-300", // Reduced padding for single line
      getBannerStyles()
    )}>
      <div className="flex items-center justify-between"> 
        <div className="flex items-center space-x-3 flex-1">
          {getIcon()}
          <div className="flex items-center gap-3 flex-1">
            <h3 className="font-medium whitespace-nowrap">{title}</h3>
            {countdown && (
              <span className="text-sm font-mono bg-white/50 px-2 py-1 rounded">
                {timeLeft}
              </span>
            )}
          </div>
        </div>
        
        {/* Primary action button */}
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            size="sm"
            className={cn(
              "ml-3",
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
        
        {/* Dismiss button */}
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
  
  // Add a timer that updates every second to re-evaluate banner expiry
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Update current time every second to trigger banner expiry checks
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !appointments) return;

    const now = currentTime;
    const newBanners: BannerProps[] = [];
    
    // Debug: Remove in production
    // console.log('🔄 Banner System - Processing banners at:', { appointmentsCount: appointments.length });

    // 1. Payment incomplete banners (highest priority) - Show only latest pending payment
    const pendingPaymentAppointments = appointments.filter(
      apt => apt.status === 'pending_payment'
    );

    // Only show the most recent pending payment appointment
    if (pendingPaymentAppointments.length > 0) {
      const latestPendingPayment = pendingPaymentAppointments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      const appointmentDate = new Date(latestPendingPayment.appointmentDate);
      const doctorName = latestPendingPayment.doctor?.firstName ? `Dr. ${latestPendingPayment.doctor.firstName}` : 'Doctor';
      
      // Calculate countdown from appointment creation time + 15 minutes
      const createdAt = new Date(latestPendingPayment.createdAt);
      const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 minutes from creation
      
      console.log('🔥 Banner Timer Check:', { 
        appointmentId: latestPendingPayment.id,
        createdAt: createdAt.toISOString(), 
        expiresAt: expiresAt.toISOString(), 
        now: now.toISOString(),
        remainingMs: expiresAt.getTime() - now.getTime(),
        isExpired: isAfter(now, expiresAt)
      });
      
      // Only show banner if not expired
      if (!isAfter(now, expiresAt)) {
        newBanners.push({
          type: 'payment',
          priority: 1,
          title: `Complete payment for your ${doctorName} consultation`,
          countdown: expiresAt,
          primaryAction: {
            label: 'Complete Payment',
            onClick: () => {
              // Build checkout URL with appointment data
              const checkoutUrl = `/checkout?` + new URLSearchParams({
                doctorId: latestPendingPayment.doctorId.toString(),
                slot: latestPendingPayment.appointmentDate,
                price: latestPendingPayment.price,
                appointmentId: latestPendingPayment.id.toString()
              }).toString();
              console.log('🔥 Banner Click - Navigating to checkout:', { 
                appointmentId: latestPendingPayment.id,
                checkoutUrl 
              });
              window.location.href = checkoutUrl;
            },
            icon: AlertCircle,
          }
        });
      }
    }

    // 2. Live/imminent session banners (second priority)
    // Only show during actual appointment window (5 minutes before to 15 minutes after)
    const liveAppointments = appointments.filter(apt => {
      const appointmentTime = new Date(apt.appointmentDate);
      const fiveMinutesBefore = addMinutes(appointmentTime, -5);
      const fifteenMinutesAfter = addMinutes(appointmentTime, 15); // Reduced from 30 to 15 minutes
      
      const shouldShow = apt.status === 'paid' && 
                        isAfter(now, fiveMinutesBefore) && 
                        isBefore(now, fifteenMinutesAfter);
      
      // console.log('🕐 Live appointment check:', { id: apt.id, shouldShow });
      
      return shouldShow;
    });

    liveAppointments.forEach((apt) => {
      const appointmentTime = new Date(apt.appointmentDate);
      const isLate = isAfter(now, addMinutes(appointmentTime, 15));
      const isVeryClose = isAfter(now, addMinutes(appointmentTime, -5));
      
      // Determine banner message based on proximity - keep it concise for single line
      let title = `Dr. ${apt.doctor?.firstName || 'Doctor'} consultation`;
      let buttonLabel = 'Join Video Call';
      
      if (isAfter(now, appointmentTime)) {
        title += ' - join now';
        buttonLabel = 'Join Now';
      } else if (isVeryClose) {
        title += ' - starting soon';
      } else {
        title += ' - ready to join';
        buttonLabel = 'Join Video';
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
      // Removed excessive console logging to improve performance
      
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
            : 'Complete your health profile to book consultations',
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
  }, [user?.id, user?.role, appointments?.length, healthProfile?.profileStatus, healthProfile?.completionScore, currentTime]);

  if (banners.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {banners.map((banner, index) => (
        <div 
          key={index}
          className={cn(
            "relative transition-all duration-300",
            index > 0 && "mt-[-98%]" // Top banner covers 98% of banner below
          )}
          style={{
            zIndex: banners.length - index,
            transform: index > 0 ? `translateY(-${index * 2}px) scale(${1 - index * 0.005})` : 'none',
            opacity: index > 0 ? 0.95 : 1,
          }}
        >
          <Banner {...banner} />
        </div>
      ))}
    </div>
  );
}