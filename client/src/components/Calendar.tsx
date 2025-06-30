import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Clock,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks,
  isSameDay,
  isToday,
  isPast,
  parseISO,
  setHours,
  setMinutes
} from "date-fns";

interface TimeSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  lockedUntil?: string;
  lockedBy?: string;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  status: string;
  patient: {
    firstName: string;
    lastName: string;
  };
}

interface CalendarProps {
  doctorId?: string;
  view?: "week" | "day" | "month";
  readonly?: boolean;
}

export default function Calendar({ 
  doctorId, 
  view = "week", 
  readonly = false 
}: CalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState(view);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch time slots for the current week
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/time-slots`, format(weekStart, "yyyy-MM-dd")],
    enabled: !!doctorId,
  });

  // Fetch appointments for the current week
  const { data: appointments = [] } = useQuery({
    queryKey: [`/api/appointments`],
    enabled: !!doctorId,
  });

  const createTimeSlotMutation = useMutation({
    mutationFn: async ({ date, startTime, endTime }: { date: string; startTime: string; endTime: string }) => {
      await apiRequest("POST", `/api/doctors/${doctorId}/time-slots`, {
        date,
        startTime,
        endTime,
        isAvailable: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/time-slots`] });
      toast({
        title: "Time Slot Created",
        description: "New availability slot has been added to your schedule.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create time slot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTimeSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      await apiRequest("DELETE", `/api/time-slots/${slotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/time-slots`] });
      toast({
        title: "Time Slot Deleted",
        description: "Availability slot has been removed from your schedule.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete time slot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (readonly) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

    // Check if slot already exists
    const existingSlot = timeSlots.find((slot: TimeSlot) => 
      slot.date === dateStr && slot.startTime === startTime
    );

    if (existingSlot) {
      // Delete existing slot
      if (confirm("Remove this availability slot?")) {
        deleteTimeSlotMutation.mutate(existingSlot.id);
      }
    } else {
      // Create new slot
      createTimeSlotMutation.mutate({
        date: dateStr,
        startTime,
        endTime,
      });
    }
  };

  const getSlotForDateTime = (date: Date, hour: number) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    
    return timeSlots.find((slot: TimeSlot) => 
      slot.date === dateStr && slot.startTime === timeStr
    );
  };

  const getAppointmentForDateTime = (date: Date, hour: number) => {
    const targetDateTime = setHours(setMinutes(date, 0), hour);
    
    return appointments.find((apt: Appointment) => {
      const aptDateTime = parseISO(apt.appointmentDate);
      return isSameDay(aptDateTime, targetDateTime) && 
             aptDateTime.getHours() === hour &&
             apt.status !== "cancelled";
    });
  };

  const getCellContent = (date: Date, hour: number) => {
    const slot = getSlotForDateTime(date, hour);
    const appointment = getAppointmentForDateTime(date, hour);
    const isPastDateTime = isPast(setHours(date, hour)) && !isToday(date);

    if (appointment) {
      return {
        type: "appointment",
        content: (
          <div className="bg-blue-500 text-white p-1 rounded text-xs">
            <div className="font-medium">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </div>
            <div className="opacity-75">{appointment.status}</div>
          </div>
        ),
      };
    }

    if (slot) {
      return {
        type: "available",
        content: (
          <div className="bg-green-500 text-white p-1 rounded text-xs text-center">
            Available
          </div>
        ),
      };
    }

    if (isPastDateTime) {
      return {
        type: "past",
        content: null,
      };
    }

    return {
      type: "empty",
      content: readonly ? null : (
        <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4 text-gray-400" />
        </div>
      ),
    };
  };

  const getCellClasses = (date: Date, hour: number) => {
    const cell = getCellContent(date, hour);
    const isPastDateTime = isPast(setHours(date, hour)) && !isToday(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let classes = "border border-gray-200 h-12 relative cursor-pointer transition-colors ";

    if (isPastDateTime) {
      classes += "bg-gray-100 opacity-50 cursor-default ";
    } else if (isWeekend) {
      classes += "bg-gray-50 ";
    } else {
      classes += "bg-white ";
    }

    if (cell.type === "available") {
      classes += "hover:bg-green-100 ";
    } else if (cell.type === "appointment") {
      classes += "cursor-default ";
    } else if (!readonly && !isPastDateTime) {
      classes += "hover:bg-blue-50 ";
    }

    return classes;
  };

  if (selectedView === "week") {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Weekly Schedule
            </CardTitle>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </span>
                <Button variant="ghost" size="sm" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {!readonly && (
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span>Past</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 border-b border-gray-200">
                <div className="p-3 text-sm font-medium text-gray-600 border-r border-gray-200">
                  Time
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                      isToday(day) ? "bg-blue-50 text-blue-600 font-medium" : ""
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(day, "MMM d")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots grid */}
              <div className="max-h-96 overflow-y-auto">
                {hours.slice(8, 21).map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                    <div className="p-3 text-sm text-gray-600 border-r border-gray-200 flex items-center">
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={getCellClasses(day, hour)}
                        onClick={() => handleTimeSlotClick(day, hour)}
                      >
                        {getCellContent(day, hour).content}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!readonly && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                <strong>Instructions:</strong> Click on empty time slots to add availability. 
                Click on green slots to remove them. Blue slots are booked appointments.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
