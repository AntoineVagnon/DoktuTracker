import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import CreateAppointmentModal from './CreateAppointmentModal';

interface TimeSlot {
  id: string;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked: boolean;
}

interface AvailabilityCalendarProps {
  doctorId: number;
  doctorName?: string;
  slots: TimeSlot[];
  onSlotClick?: (slot: TimeSlot) => void;
  onAppointmentCreated?: () => void;
}

export default function AvailabilityCalendar({
  doctorId,
  doctorName,
  slots,
  onSlotClick,
  onAppointmentCreated
}: AvailabilityCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Generate 7 days for the week view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Navigate to previous week
  const handlePreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  // Navigate to next week
  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  // Go back to current week
  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Get slots for a specific day
  const getSlotsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter(slot => slot.date === dateStr);
  };

  // Get slot status badge
  const getSlotBadge = (slot: TimeSlot) => {
    if (slot.isBooked) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Booked</Badge>;
    }
    if (slot.isAvailable) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Available</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200">Blocked</Badge>;
  };

  // Get slot background color class
  const getSlotColorClass = (slot: TimeSlot) => {
    if (slot.isBooked) return 'bg-red-50 border-red-200 hover:bg-red-100';
    if (slot.isAvailable) return 'bg-green-50 border-green-200 hover:bg-green-100';
    return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  };

  // Handle slot click to create appointment
  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowCreateModal(true);
    onSlotClick?.(slot);
  };

  // Handle creating appointment at custom time
  const handleCreateCustomAppointment = () => {
    setSelectedSlot(null);
    setShowCreateModal(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleCreateCustomAppointment}>
              <Plus className="h-4 w-4 mr-2" />
              Create Appointment
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200"></div>
            <span className="text-sm text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-200"></div>
            <span className="text-sm text-gray-600">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200"></div>
            <span className="text-sm text-gray-600">Blocked</span>
          </div>
        </div>

        {/* Week View Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const daySlots = getSlotsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={index} className="space-y-2">
                {/* Day Header */}
                <div className={`text-center p-2 rounded-t-lg ${isToday ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'}`}>
                  <div className="text-xs font-medium">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-1 min-h-[200px]">
                  {daySlots.length > 0 ? (
                    daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotClick(slot)}
                        className={`w-full text-left p-2 rounded border-2 transition-colors ${getSlotColorClass(slot)}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {slot.startTime.substring(0, 5)}
                          </span>
                        </div>
                        {getSlotBadge(slot)}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No slots
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {slots.filter(s => s.isAvailable && !s.isBooked).length}
            </div>
            <div className="text-xs text-gray-600">Available Slots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {slots.filter(s => s.isBooked).length}
            </div>
            <div className="text-xs text-gray-600">Booked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {slots.filter(s => !s.isAvailable && !s.isBooked).length}
            </div>
            <div className="text-xs text-gray-600">Blocked</div>
          </div>
        </div>

        {/* Create Appointment Modal */}
        <CreateAppointmentModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          doctorId={doctorId}
          doctorName={doctorName}
          prefilledDate={selectedSlot?.date}
          prefilledStartTime={selectedSlot?.startTime}
          prefilledEndTime={selectedSlot?.endTime}
          onSuccess={() => {
            onAppointmentCreated?.();
            setSelectedSlot(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
