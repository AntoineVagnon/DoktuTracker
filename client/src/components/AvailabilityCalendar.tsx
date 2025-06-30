import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { 
  format, 
  addDays, 
  addWeeks, 
  subWeeks,
  isToday,
  isTomorrow,
  parseISO,
  setHours,
  setMinutes,
  isBefore,
  isSameDay
} from "date-fns";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  lockedUntil?: string;
  lockedBy?: string;
}

interface AvailabilityCalendarProps {
  doctorId: string;
  onSlotSelect?: (slot: TimeSlot) => void;
  today?: Date; // For testing purposes
}

// Helper function to get next 7 days starting from a date
function getNext7Days(startDate: Date): Date[] {
  const baseDate = new Date(startDate);
  baseDate.setHours(0, 0, 0, 0);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(baseDate, i));
  }
  return days;
}

// Generate 30-minute time slots between 9:00 and 18:00
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 9; hour < 18; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
}

// Get user-friendly day title
function getDayTitle(date: Date): string {
  if (isToday(date)) {
    return `Today ${format(date, 'd MMMM')}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow ${format(date, 'd MMMM')}`;
  } else {
    return format(date, 'EEEE d MMMM');
  }
}

export default function AvailabilityCalendar({ 
  doctorId, 
  onSlotSelect,
  today = new Date() 
}: AvailabilityCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const pillContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate current week starting from today
  const currentWeekStart = useMemo(() => {
    const baseDate = new Date(today);
    baseDate.setHours(0, 0, 0, 0);
    return addDays(baseDate, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(() => getNext7Days(currentWeekStart), [currentWeekStart]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = getNext7Days(currentWeekStart);
    return days[0];
  });
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Update selected day when week changes
  useEffect(() => {
    setSelectedDay(weekDays[0]);
  }, [weekDays]);

  // Fetch time slots for the current week
  const { data: doctorSlots = [], isLoading } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/time-slots`, format(currentWeekStart, "yyyy-MM-dd")],
    enabled: !!doctorId,
  });

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const getAvailableSlotsForDate = (date: Date): TimeSlot[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return doctorSlots.filter((slot: TimeSlot) => 
      slot.date === dateStr && slot.isAvailable
    );
  };

  const getSlotForDateTime = (date: Date, timeStr: string): TimeSlot | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return doctorSlots.find((slot: TimeSlot) => 
      slot.date === dateStr && slot.startTime === timeStr
    );
  };

  const isSlotDisabled = (date: Date, timeStr: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotDateTime = setMinutes(setHours(date, hours), minutes);
    
    // Disable past slots for today, and all slots for past days
    return isBefore(slotDateTime, now);
  };

  const handleSlotClick = (date: Date, timeStr: string) => {
    if (isSlotDisabled(date, timeStr)) return;
    
    const slot = getSlotForDateTime(date, timeStr);
    if (slot && onSlotSelect) {
      onSlotSelect(slot);
    }
  };

  const handlePillClick = (day: Date) => {
    setSelectedDay(day);
  };

  // Get slots for the selected day
  const selectedDaySlots = useMemo(() => {
    return getAvailableSlotsForDate(selectedDay);
  }, [selectedDay, doctorSlots]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading availability...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="availability-calendar">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Available Times
          </CardTitle>
          
          {/* Week navigation - visible on desktop, hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePreviousWeek}
              aria-label="Previous week"
              className="p-2 rounded hover:bg-gray-100"
              disabled={weekOffset <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="font-medium text-sm px-3">
              {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
            </span>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNextWeek}
              aria-label="Next week"
              className="p-2 rounded hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Week pills selector */}
        <div 
          ref={pillContainerRef}
          className="overflow-x-auto scrollbar-none scroll-smooth mb-6"
          role="listbox"
          data-testid="week-pills-container"
        >
          <div className="flex space-x-2 pb-2" style={{ minWidth: 'max-content' }}>
            {weekDays.map((day) => {
              const availableSlots = getAvailableSlotsForDate(day);
              const availableCount = availableSlots.filter(slot => 
                !isSlotDisabled(day, slot.startTime)
              ).length;
              const isSelected = isSameDay(day, selectedDay);
              
              return (
                <button
                  key={day.toISOString()}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handlePillClick(day)}
                  className={`
                    min-w-16 min-h-20 px-3 py-2 rounded-xl text-center transition-colors
                    ${isSelected 
                      ? "bg-blue-500 text-white" 
                      : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
                    }
                  `}
                  data-testid={`day-pill-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className={`text-xs font-medium ${isSelected ? "text-white" : "text-gray-600"}`}>
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                    {format(day, "d")}
                  </div>
                  {availableCount > 0 && (
                    <div className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                      {availableCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day title and timezone notice */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid="selected-day-title">
            {getDayTitle(selectedDay)}
          </h3>
          <p className="text-sm text-gray-600">
            Times in German time (GMT+1) • Dr. David Martin practices from Germany
          </p>
        </div>

        {/* Time slots grid for selected day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="time-slots-grid">
          {timeSlots.map((timeStr) => {
            const slot = getSlotForDateTime(selectedDay, timeStr);
            const isDisabled = isSlotDisabled(selectedDay, timeStr);
            const isAvailable = slot && slot.isAvailable && !isDisabled;
            
            return (
              <button
                key={timeStr}
                onClick={() => handleSlotClick(selectedDay, timeStr)}
                disabled={!isAvailable}
                className={`
                  px-4 py-2 border rounded-lg text-center transition-colors
                  ${isAvailable 
                    ? "bg-white border-blue-500 text-blue-600 hover:bg-blue-50" 
                    : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  }
                `}
                aria-label={`${isAvailable ? 'Book appointment' : 'Unavailable'} at ${timeStr} on ${format(selectedDay, "EEEE, MMMM d")}`}
                data-testid={`time-slot-${timeStr}`}
              >
                {timeStr}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-blue-500 bg-white rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
            <p className="hidden sm:block">Select a day above, then choose your preferred time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}