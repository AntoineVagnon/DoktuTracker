import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO, differenceInMinutes, startOfDay, addHours, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ChevronLeft, ChevronRight, Clock, Video, AlertCircle, Users, X, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { utcToLocal, formatAppointmentTime } from '@/lib/timezoneUtils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: number;
  appointmentDate: string;
  status: 'pending' | 'confirmed' | 'paid' | 'completed' | 'cancelled';
  type: 'video' | 'in-person';
  price: number;
  doctor?: {
    user?: {
      firstName: string;
      lastName: string;
      title?: string;
    };
    specialty?: string;
  };
  patient?: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  zoomJoinUrl?: string;
  cancellationReason?: string;
  cancelledBy?: string;
}

interface CalendarViewProps {
  userRole: 'patient' | 'doctor' | 'admin';
  userId?: string;
}

export function CalendarView({ userRole, userId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const { toast } = useToast();

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ appointmentId, newDate }: { appointmentId: number, newDate: string }) => {
      return apiRequest(`/api/appointments/${appointmentId}/reschedule`, JSON.stringify({ newDate }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowRescheduleDialog(false);
      setSelectedAppointment(null);
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been successfully rescheduled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to reschedule appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: number, reason: string }) => {
      return apiRequest(`/api/appointments/${appointmentId}/cancel`, JSON.stringify({ reason }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowCancelDialog(false);
      setSelectedAppointment(null);
      setCancelReason('');
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate date ranges based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const start = startOfWeek(monthStart);
        const end = endOfWeek(monthEnd);
        return { start, end };
      }
      case 'week': {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return { start, end };
      }
      case 'day': {
        const start = startOfDay(currentDate);
        const end = addDays(start, 1);
        return { start, end };
      }
    }
  }, [currentDate, viewMode]);

  // Filter appointments within date range
  const visibleAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = utcToLocal(apt.appointmentDate);
      return isWithinInterval(aptDate, dateRange);
    });
  }, [appointments, dateRange]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    visibleAppointments.forEach(apt => {
      const dateKey = format(utcToLocal(apt.appointmentDate), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(apt);
    });
    return grouped;
  }, [visibleAppointments]);

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addDays(prev, -7));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addDays(prev, 7));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Check if appointment can be joined
  const canJoinAppointment = (appointment: Appointment) => {
    const aptTime = utcToLocal(appointment.appointmentDate);
    const now = new Date();
    const minutesUntil = differenceInMinutes(aptTime, now);
    return appointment.type === 'video' && 
           appointment.status === 'paid' && 
           minutesUntil <= 5 && 
           minutesUntil >= -30;
  };

  // Check if appointment can be rescheduled
  const canRescheduleAppointment = (appointment: Appointment) => {
    const aptTime = utcToLocal(appointment.appointmentDate);
    const now = new Date();
    const minutesUntil = differenceInMinutes(aptTime, now);
    return appointment.status !== 'cancelled' && 
           appointment.status !== 'completed' && 
           minutesUntil > 60;
  };

  // Render appointment status badge
  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending", className: "" },
      confirmed: { variant: "default" as const, label: "Confirmed", className: "" },
      paid: { variant: "default" as const, label: "Paid", className: "bg-green-500" },
      completed: { variant: "default" as const, label: "Completed", className: "bg-gray-500" },
      cancelled: { variant: "destructive" as const, label: "Cancelled", className: "" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} className="text-center text-sm font-medium text-gray-500 py-2">
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all",
                !isCurrentMonth && "bg-gray-50 text-gray-400",
                isCurrentMonth && "bg-white hover:bg-gray-50",
                isSelectedDay && "ring-2 ring-blue-500",
                isTodayDate && "bg-blue-50"
              )}
              onClick={() => {
                setSelectedDate(day);
                setShowDayDetails(true);
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-sm font-medium",
                  isTodayDate && "text-blue-600 font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>

              {/* Show up to 3 appointment times */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt, aptIdx) => (
                  <div
                    key={apt.id}
                    className="text-xs text-gray-600 truncate flex items-center gap-1"
                  >
                    <span>{format(utcToLocal(apt.appointmentDate), 'HH:mm')}</span>
                    {apt.type === 'video' && <Video className="inline w-3 h-3" />}
                    {apt.status === 'cancelled' && <span className="text-red-500">×</span>}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 text-sm font-medium text-gray-500">Time</div>
            {days.map(day => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 text-center border-l",
                  isToday(day) && "bg-blue-50"
                )}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className={cn(
                  "text-lg font-bold",
                  isToday(day) && "text-blue-600"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b" style={{ height: '60px' }}>
                <div className="p-2 text-sm text-gray-500">
                  {format(addHours(startOfDay(new Date()), hour), 'HH:mm')}
                </div>
                {days.map(day => {
                  const hourStart = addHours(startOfDay(day), hour);
                  const hourEnd = addHours(hourStart, 1);
                  const hourAppointments = visibleAppointments.filter(apt => {
                    const aptTime = utcToLocal(apt.appointmentDate);
                    return isWithinInterval(aptTime, { start: hourStart, end: hourEnd });
                  });

                  return (
                    <div key={day.toISOString()} className="relative border-l p-1">
                      {hourAppointments.map((apt, idx) => (
                        <div
                          key={apt.id}
                          className={cn(
                            "absolute inset-x-1 p-1 rounded text-xs cursor-pointer group",
                            "bg-blue-100 border border-blue-300 hover:bg-blue-200",
                            apt.type === 'video' && "bg-green-100 border-green-300 hover:bg-green-200",
                            apt.status === 'cancelled' && "opacity-50 line-through"
                          )}
                          style={{
                            top: `${(idx * 25)}px`,
                            minHeight: '24px',
                            zIndex: idx
                          }}
                          onClick={() => {
                            setSelectedDate(day);
                            setShowDayDetails(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="truncate flex-1">
                              {format(utcToLocal(apt.appointmentDate), 'HH:mm')}
                              {userRole === 'doctor' 
                                ? ` - ${apt.patient?.user?.lastName}`
                                : ` - Dr. ${apt.doctor?.user?.lastName}`
                              }
                            </div>
                            {/* Mini action indicator */}
                            {(canJoinAppointment(apt) || canRescheduleAppointment(apt)) && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                <MoreHorizontal className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayStart = startOfDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayAppointments = appointmentsByDate.get(format(currentDate, 'yyyy-MM-dd')) || [];

    return (
      <ScrollArea className="h-[600px]">
        <div className="pr-4">
          {hours.map(hour => {
            const hourStart = addHours(dayStart, hour);
            const hourEnd = addHours(hourStart, 1);
            const hourAppointments = dayAppointments.filter(apt => {
              const aptTime = utcToLocal(apt.appointmentDate);
              return isWithinInterval(aptTime, { start: hourStart, end: hourEnd });
            });

            return (
              <div key={hour} className="flex border-b" style={{ minHeight: '80px' }}>
                <div className="w-20 p-2 text-sm text-gray-500 text-right">
                  {format(hourStart, 'HH:mm')}
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {hourAppointments.map(apt => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      userRole={userRole}
                      canJoin={canJoinAppointment(apt)}
                      canReschedule={canRescheduleAppointment(apt)}
                      onReschedule={handleReschedule}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  // Handle reschedule
  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleDialog(true);
  };

  // Handle cancel
  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Calendar View
          </CardTitle>
          
          {/* View mode selector */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToday}
            >
              Today
            </Button>
          </div>

          <h2 className="text-xl font-semibold">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')}`}
            {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>

          {/* Admin stats */}
          {userRole === 'admin' && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Badge variant="default">{visibleAppointments.filter(a => a.status === 'confirmed').length}</Badge>
                Confirmed
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="secondary">{visibleAppointments.filter(a => a.status === 'pending').length}</Badge>
                Pending
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="destructive">{visibleAppointments.filter(a => a.status === 'cancelled').length}</Badge>
                Cancelled
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </CardContent>

      {/* Day details modal */}
      <DayDetailsModal
        open={showDayDetails}
        onOpenChange={setShowDayDetails}
        date={selectedDate}
        appointments={selectedDate ? appointmentsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : []}
        userRole={userRole}
        canJoinAppointment={canJoinAppointment}
        canRescheduleAppointment={canRescheduleAppointment}
        onReschedule={handleReschedule}
        onCancel={handleCancel}
      />
    </Card>

    {/* Reschedule Dialog */}
    <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new time for your appointment with {selectedAppointment?.doctor?.user?.firstName} {selectedAppointment?.doctor?.user?.lastName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Current time: {selectedAppointment && formatAppointmentTime(selectedAppointment.appointmentDate)}
          </p>
          {/* Add time slot selection here */}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (selectedAppointment) {
                // Implement reschedule logic
                toast({
                  title: "Feature coming soon",
                  description: "Rescheduling functionality will be available soon.",
                });
                setShowRescheduleDialog(false);
              }
            }}
          >
            Confirm Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Cancel Dialog */}
    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setShowCancelDialog(false);
            setCancelReason('');
          }}>
            Keep Appointment
          </Button>
          <Button 
            variant="destructive"
            onClick={() => {
              if (selectedAppointment && cancelReason.trim()) {
                cancelMutation.mutate({
                  appointmentId: selectedAppointment.id,
                  reason: cancelReason.trim()
                });
              } else {
                toast({
                  title: "Reason required",
                  description: "Please provide a reason for cancellation.",
                  variant: "destructive",
                });
              }
            }}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// Appointment card component
function AppointmentCard({ 
  appointment, 
  userRole, 
  canJoin, 
  canReschedule,
  onReschedule,
  onCancel
}: { 
  appointment: Appointment;
  userRole: string;
  canJoin: boolean;
  canReschedule: boolean;
  onReschedule: (apt: Appointment) => void;
  onCancel: (apt: Appointment) => void;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      appointment.status === 'cancelled' && "bg-red-50 border-red-200",
      appointment.status === 'completed' && "bg-gray-50 border-gray-200",
      appointment.status === 'paid' && appointment.type === 'video' && "bg-green-50 border-green-200",
      appointment.status === 'paid' && appointment.type !== 'video' && "bg-blue-50 border-blue-200"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {format(utcToLocal(appointment.appointmentDate), 'HH:mm')}
            </span>
            {appointment.type === 'video' && <Video className="h-4 w-4 text-green-600" />}
            {renderStatusBadge(appointment.status)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {userRole === 'patient' 
              ? `Dr. ${appointment.doctor?.user?.firstName} ${appointment.doctor?.user?.lastName}`
              : `${appointment.patient?.user?.firstName} ${appointment.patient?.user?.lastName}`
            }
          </div>
          {appointment.doctor?.specialty && (
            <div className="text-xs text-gray-500">{appointment.doctor.specialty}</div>
          )}
          {appointment.status === 'cancelled' && appointment.cancellationReason && (
            <div className="text-xs text-red-600 mt-1">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              {appointment.cancellationReason}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {canJoin && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => window.open(appointment.zoomJoinUrl, '_blank')}
            >
              Join
            </Button>
          )}
          {canReschedule && userRole === 'patient' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReschedule(appointment)}
                  >
                    Reschedule
                  </Button>
                </TooltipTrigger>
                {!canReschedule && (
                  <TooltipContent>
                    <p>Changes allowed until 60 minutes before start</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {userRole === 'doctor' && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => onCancel(appointment)}
            >
              Cancel
            </Button>
          )}
          {userRole === 'admin' && canReschedule === false && (
            <Button
              size="sm"
              variant="outline"
              className="text-orange-600"
              onClick={() => onReschedule(appointment)}
            >
              Override Reschedule
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Day details modal
function DayDetailsModal({ 
  open, 
  onOpenChange, 
  date, 
  appointments, 
  userRole,
  canJoinAppointment,
  canRescheduleAppointment,
  onReschedule,
  onCancel
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  appointments: Appointment[];
  userRole: string;
  canJoinAppointment: (apt: Appointment) => boolean;
  canRescheduleAppointment: (apt: Appointment) => boolean;
  onReschedule: (apt: Appointment) => void;
  onCancel: (apt: Appointment) => void;
}) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No appointments on this day</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => {
                  onOpenChange(false);
                  // Navigate to book appointment
                  window.location.href = '/book';
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Click on any appointment below to see available actions:
              </p>
              {appointments
                .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                .map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    userRole={userRole}
                    canJoin={canJoinAppointment(appointment)}
                    canReschedule={canRescheduleAppointment(appointment)}
                    onReschedule={onReschedule}
                    onCancel={onCancel}
                  />
                ))
              }
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to render status badge
function renderStatusBadge(status: string) {
  const statusConfig = {
    pending: { variant: "secondary" as const, label: "Pending", className: "" },
    confirmed: { variant: "default" as const, label: "Confirmed", className: "" },
    paid: { variant: "default" as const, label: "Paid", className: "bg-green-500" },
    completed: { variant: "default" as const, label: "Completed", className: "bg-gray-500" },
    cancelled: { variant: "destructive" as const, label: "Cancelled", className: "" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}