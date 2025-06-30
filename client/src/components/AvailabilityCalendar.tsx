import { useState, useMemo, useRef } from "react";
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
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  
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

  const scrollLeft = () => {
    if (calendarContainerRef.current) {
      calendarContainerRef.current.scrollBy({ 
        left: -calendarContainerRef.current.clientWidth * 0.5, 
        behavior: 'smooth' 
      });
    }
  };

  const scrollRight = () => {
    if (calendarContainerRef.current) {
      calendarContainerRef.current.scrollBy({ 
        left: calendarContainerRef.current.clientWidth * 0.5, 
        behavior: 'smooth' 
      });
    }
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
    <Card className="w-full" data-testid="availability-calendar">
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
      
      <CardContent className="p-0">
        {/* Mobile scroll navigation */}
        <div className="flex items-center justify-between p-2 lg:hidden border-b border-gray-200">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={scrollLeft}
            aria-label="Scroll calendar left"
            className="p-2 rounded hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">Scroll to see all days</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={scrollRight}
            aria-label="Scroll calendar right"
            className="p-2 rounded hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar container with horizontal scroll */}
        <div 
          ref={calendarContainerRef}
          className="overflow-x-auto scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
          data-testid="calendar-scroll-container"
        >
          {/* CSS Grid calendar */}
          <div 
            className="calendar-grid"
            role="grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '80px repeat(7, 1fr)',
              gridTemplateRows: `auto repeat(${timeSlots.length}, 48px)`,
              minWidth: '640px'
            }}
          >
            {/* Empty corner cell */}
            <div className="sticky top-0 left-0 z-20 bg-white border-r border-b border-gray-200 p-2 text-sm font-medium text-gray-600">
              Time
            </div>
            
            {/* Day headers - sticky top */}
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
                  className={`sticky top-0 z-10 p-2 text-center border-r border-b border-gray-200 bg-white ${
                    isTodayColumn 
                      ? "bg-blue-50 border-l-2 border-l-blue-500" 
                      : ""
                  }`}
                  style={{ gridColumn: index + 2 }}
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
                    <Badge className="px-1 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {availableCount}
                    </Badge>
                  )}
                </div>
              );
            })}

            {/* Time slots */}
            {timeSlots.map((timeStr, timeIndex) => {
              const timeRowItems = [];
              
              // Time label - sticky left
              timeRowItems.push(
                <div
                  key={`time-${timeStr}`}
                  role="rowheader"
                  className="sticky left-0 z-5 bg-white border-r border-b border-gray-200 p-2 text-sm text-gray-600 font-mono flex items-center"
                  style={{ gridRow: timeIndex + 2, gridColumn: 1 }}
                >
                  {timeStr}
                </div>
              );
              
              // Slot cells
              weekDays.forEach((day, dayIndex) => {
                const slot = getSlotForDateTime(day, timeStr);
                const isDisabled = isSlotDisabled(day, timeStr);
                const isAvailable = slot && slot.isAvailable && !isDisabled;
                
                timeRowItems.push(
                  <div
                    key={`${day.toISOString()}-${timeStr}`}
                    role="gridcell"
                    className="border-r border-b border-gray-200 p-1"
                    style={{ 
                      gridRow: timeIndex + 2, 
                      gridColumn: dayIndex + 2,
                      minHeight: '48px'
                    }}
                  >
                    <button
                      onClick={() => handleSlotClick(day, timeStr)}
                      disabled={!isAvailable}
                      className={`
                        w-full h-full text-xs font-medium rounded transition-colors
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
              });
              
              return timeRowItems;
            })}
          </div>
        </div>

        {/* Legend */}
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
            <p className="hidden sm:block">Click on available slots to book an appointment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}