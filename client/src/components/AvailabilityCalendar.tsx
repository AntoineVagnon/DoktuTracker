import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { 
  format, 
  addDays, 
  startOfWeek, 
  addWeeks, 
  subWeeks,
  isToday,
  isPast,
  parseISO,
  setHours,
  setMinutes,
  isBefore
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

// Helper function to get week days starting from today
function getWeekDays(startDate: Date): Date[] {
  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(today, i));
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

export default function AvailabilityCalendar({ 
  doctorId, 
  onSlotSelect,
  today = new Date() 
}: AvailabilityCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Calculate current week starting from today
  const currentWeekStart = useMemo(() => {
    const baseDate = new Date(today);
    baseDate.setHours(0, 0, 0, 0);
    return addDays(baseDate, weekOffset * 7);
  }, [today, weekOffset]);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Available Times
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePreviousWeek}
              aria-label="Previous week"
              className="p-2 rounded hover:bg-gray-100"
              disabled={weekOffset <= 0} // Prevent going to past weeks
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
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]" role="grid">
            {/* Header with days and slot counts */}
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-3 text-sm font-medium text-gray-600 border-r border-gray-200">
                Time
              </div>
              {weekDays.map((day, index) => {
                const availableSlots = getAvailableSlotsForDate(day);
                const availableCount = availableSlots.filter(slot => 
                  !isSlotDisabled(day, slot.startTime)
                ).length;
                const isTodayColumn = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    role="columnheader"
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                      isTodayColumn 
                        ? "bg-blue-50 border-l-2 border-l-blue-500 today" 
                        : ""
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      isTodayColumn ? "text-blue-600" : "text-gray-900"
                    }`}>
                      {format(day, "EEE")}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {format(day, "MMM d")}
                    </div>
                    {availableCount > 0 && (
                      <Badge className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {availableCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slots grid */}
            <div className="max-h-96 overflow-y-auto">
              {timeSlots.map((timeStr) => (
                <div key={timeStr} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                  <div className="p-3 text-sm text-gray-600 border-r border-gray-200 flex items-center font-mono">
                    {timeStr}
                  </div>
                  {weekDays.map((day) => {
                    const slot = getSlotForDateTime(day, timeStr);
                    const isDisabled = isSlotDisabled(day, timeStr);
                    const isAvailable = slot && slot.isAvailable && !isDisabled;
                    
                    return (
                      <div
                        key={`${day.toISOString()}-${timeStr}`}
                        className="p-2 border-r border-gray-200 last:border-r-0"
                      >
                        <button
                          role="button"
                          onClick={() => handleSlotClick(day, timeStr)}
                          disabled={!isAvailable}
                          className={`
                            w-full min-w-[80px] h-[36px] text-xs font-medium rounded transition-colors
                            ${isAvailable 
                              ? "bg-white border border-blue-500 text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-blue-200" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                            }
                          `}
                          aria-label={`${isAvailable ? 'Book appointment' : 'Unavailable'} at ${timeStr} on ${format(day, "EEEE, MMMM d")}`}
                        >
                          {isAvailable ? "Book" : "—"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-blue-500 bg-white rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
            <p>Click on available slots to book an appointment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}