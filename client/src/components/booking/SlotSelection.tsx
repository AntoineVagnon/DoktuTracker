import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Calendar, Clock, Euro, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface SlotSelectionProps {
  doctorId: string;
  consultationPrice: number;
}

// CET timezone handling
const CET_OFFSET = 1; // UTC+1

const formatDateCET = (date: Date) => {
  const cetDate = new Date(date.getTime() + CET_OFFSET * 60 * 60 * 1000);
  return cetDate.toISOString().split('T')[0];
};

const isSlotAvailable = (slotDate: Date, slotTime: string) => {
  const now = new Date();
  const [hours, minutes] = slotTime.split(':').map(Number);
  const slotDateTime = new Date(slotDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Must be at least 60 minutes from now
  const minTime = new Date(now.getTime() + 60 * 60 * 1000);
  return slotDateTime >= minTime;
};

export default function SlotSelection({ doctorId, consultationPrice }: SlotSelectionProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Mock availability data - in real app this would come from API
  const mockSlots = [
    { date: '2025-07-28', times: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'] },
    { date: '2025-07-29', times: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'] },
    { date: '2025-07-30', times: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'] },
    { date: '2025-07-31', times: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'] },
    { date: '2025-08-01', times: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'] },
  ];

  const holdSlotMutation = useMutation({
    mutationFn: async ({ slotId, sessionId }: { slotId: string; sessionId?: string }) => {
      return apiRequest('POST', '/api/slots/hold', { slotId, sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slots/held'] });
    }
  });

  const getWeekDays = (startDate: Date) => {
    const days = [];
    const currentDate = new Date(startDate);
    
    // Get Monday of the week
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentDate.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };

  const getDayNames = () => {
    const weekDays = getWeekDays(selectedWeekStart);
    return weekDays.map(date => ({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      fullDate: formatDateCET(date)
    }));
  };

  const handleSlotClick = async (date: string, time: string) => {
    const slotId = `${doctorId}-${date}-${time}`;
    const slotDateTime = new Date(`${date}T${time}:00`);
    
    if (!isSlotAvailable(slotDateTime, time)) {
      return; // Slot not available
    }

    setSelectedSlot(slotId);

    if (isAuthenticated) {
      // Authenticated user - hold slot and go to payment
      try {
        await holdSlotMutation.mutateAsync({ slotId });
        setLocation(`/payment?doctorId=${doctorId}&slot=${date}T${time}&price=${consultationPrice}`);
      } catch (error) {
        console.error('Failed to hold slot:', error);
      }
    } else {
      // Unauthenticated user - save to sessionStorage and go to auth choice
      const bookingData = {
        doctorId,
        slot: `${date}T${time}`,
        price: consultationPrice.toString()
      };
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      setLocation('/book-appointment-choice');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeekStart(newDate);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const weekDays = getDayNames();
  const currentWeekStr = `Week of ${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-blue-600">Available slots</div>
            <div className="text-xl font-bold text-gray-900">{formatPrice(consultationPrice)}</div>
            <div className="text-sm text-gray-600">30 min consultation</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek('prev')}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-gray-700">
            {currentWeekStr}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateWeek('next')}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day, index) => (
              <div key={index} className={`p-2 text-xs ${
                day.date.toDateString() === new Date().toDateString() 
                  ? 'bg-blue-500 text-white rounded-lg font-medium'
                  : 'text-gray-600'
              }`}>
                <div className="font-medium">{day.dayName}</div>
                <div>{day.dayNumber}</div>
              </div>
            ))}
          </div>

          {/* Time Slots for Selected Day */}
          <div className="space-y-2">
            <div className="font-medium text-sm text-gray-700 mb-2">
              Tomorrow 28 July
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Times in German time (GMT+1) • Dr. David Martin practices
            </div>
            
            {/* Available times */}
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {mockSlots[0]?.times.map((time) => {
                const slotDateTime = new Date(`${mockSlots[0].date}T${time}:00`);
                const available = isSlotAvailable(slotDateTime, time);
                const slotId = `${doctorId}-${mockSlots[0].date}-${time}`;
                
                return (
                  <Button
                    key={time}
                    variant={selectedSlot === slotId ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-8 ${
                      !available 
                        ? 'opacity-50 cursor-not-allowed' 
                        : selectedSlot === slotId
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-blue-50'
                    }`}
                    onClick={() => available && handleSlotClick(mockSlots[0].date, time)}
                    disabled={!available || holdSlotMutation.isPending}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
            
            {holdSlotMutation.isPending && (
              <div className="text-xs text-blue-600 text-center mt-2">
                Securing your slot...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}