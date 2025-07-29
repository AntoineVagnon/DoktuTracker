import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Edit3, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TimeSlot {
  id: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  appointmentDate: string;
  status: string;
  price: string;
  patient: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface SlotModalData {
  isOpen: boolean;
  mode: 'create' | 'edit';
  date: string;
  startTime: string;
  endTime: string;
  slotId?: string;
  dayIndex: number;
  hourIndex: number;
}

export default function InteractiveCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start on Monday
    return startOfWeek;
  });

  const [slotModal, setSlotModal] = useState<SlotModalData>({
    isOpen: false,
    mode: 'create',
    date: '',
    startTime: '',
    endTime: '',
    dayIndex: 0,
    hourIndex: 0
  });

  // Fetch doctor's time slots
  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/time-slots', user?.id],
    enabled: !!user?.id
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments', { doctorId: user?.id }],
    enabled: !!user?.id
  });

  // Create time slot mutation
  const createSlotMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; date: string }) => {
      const response = await apiRequest('POST', '/api/time-slots', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability created successfully" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast({ 
        title: "Failed to create availability", 
        variant: "destructive" 
      });
    }
  });

  // Update time slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: async (data: { id: string; startTime: string; endTime: string; date: string }) => {
      const response = await apiRequest('PUT', `/api/time-slots/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability updated successfully" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast({ 
        title: "Failed to update availability", 
        variant: "destructive" 
      });
    }
  });

  // Delete time slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const response = await apiRequest('DELETE', `/api/time-slots/${slotId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete availability", 
        variant: "destructive" 
      });
    }
  });

  const getDaysOfWeek = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startFormatted = startDate.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long' 
    });
    const endFormatted = endDate.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  };

  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8 AM to 6 PM
  const daysOfWeek = getDaysOfWeek(currentWeek);

  const handleCellClick = (dayIndex: number, hourIndex: number) => {
    const day = daysOfWeek[dayIndex];
    const hour = hours[hourIndex];
    const dateStr = day.toISOString().split('T')[0];
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

    // Check if there's an existing slot at this time
    const existingSlot = timeSlots.find((slot: TimeSlot) => {
      const slotDate = new Date(slot.startTime).toISOString().split('T')[0];
      const slotHour = new Date(slot.startTime).getHours();
      return slotDate === dateStr && slotHour === hour;
    });

    if (existingSlot) {
      // Edit existing slot
      setSlotModal({
        isOpen: true,
        mode: 'edit',
        date: dateStr,
        startTime: new Date(existingSlot.startTime).toTimeString().slice(0, 5),
        endTime: new Date(existingSlot.endTime).toTimeString().slice(0, 5),
        slotId: existingSlot.id,
        dayIndex,
        hourIndex
      });
    } else {
      // Create new slot
      setSlotModal({
        isOpen: true,
        mode: 'create',
        date: dateStr,
        startTime,
        endTime,
        dayIndex,
        hourIndex
      });
    }
  };

  const getCellContent = (dayIndex: number, hourIndex: number) => {
    const day = daysOfWeek[dayIndex];
    const hour = hours[hourIndex];
    const dateStr = day.toISOString().split('T')[0];

    // Check for booked appointment
    const bookedAppointment = appointments.find((apt: Appointment) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      const aptHour = new Date(apt.appointmentDate).getHours();
      return aptDate === dateStr && aptHour === hour && apt.status !== 'cancelled';
    });

    if (bookedAppointment) {
      return {
        type: 'appointment',
        content: (
          <div className="bg-blue-600 text-white text-xs p-1 rounded h-full flex flex-col justify-center">
            <div className="font-medium">Booked</div>
            <div className="truncate">
              {bookedAppointment.patient.firstName || bookedAppointment.patient.email}
            </div>
          </div>
        )
      };
    }

    // Check for available slot
    const availableSlot = timeSlots.find((slot: TimeSlot) => {
      const slotDate = new Date(slot.startTime).toISOString().split('T')[0];
      const slotHour = new Date(slot.startTime).getHours();
      return slotDate === dateStr && slotHour === hour && slot.isAvailable;
    });

    if (availableSlot) {
      return {
        type: 'available',
        content: (
          <div className="bg-green-100 border border-green-300 text-green-800 text-xs p-1 rounded h-full flex items-center justify-center">
            <Clock className="h-3 w-3" />
          </div>
        )
      };
    }

    return {
      type: 'empty',
      content: null
    };
  };

  const handleSaveSlot = () => {
    const startDateTime = new Date(`${slotModal.date}T${slotModal.startTime}:00`);
    const endDateTime = new Date(`${slotModal.date}T${slotModal.endTime}:00`);

    const data = {
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      date: slotModal.date
    };

    if (slotModal.mode === 'create') {
      createSlotMutation.mutate(data);
    } else if (slotModal.slotId) {
      updateSlotMutation.mutate({ ...data, id: slotModal.slotId });
    }
  };

  const handleDeleteSlot = () => {
    if (slotModal.slotId) {
      deleteSlotMutation.mutate(slotModal.slotId);
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  if (slotsLoading || appointmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar & Availabilities</h2>
          <p className="text-gray-600">Click on time slots to manage your availability</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-4">
            {formatWeekRange(currentWeek)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-300 rounded"></div>
          <span>Click to add availability</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="p-3 text-sm font-medium text-gray-600">Time</div>
            {daysOfWeek.map((day, index) => (
              <div key={index} className="p-3 text-center border-l">
                <div className="text-xs text-gray-600 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-sm font-medium mt-1">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {hours.map((hour, hourIndex) => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-3 text-sm text-gray-600 bg-gray-50 border-r">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {daysOfWeek.map((day, dayIndex) => {
                  const cellContent = getCellContent(dayIndex, hourIndex);
                  return (
                    <button
                      key={`${dayIndex}-${hourIndex}`}
                      onClick={() => handleCellClick(dayIndex, hourIndex)}
                      className={cn(
                        "h-16 border-l border-gray-200 p-1 transition-colors hover:bg-gray-50",
                        cellContent.type === 'appointment' && "cursor-default",
                        cellContent.type === 'available' && "hover:bg-green-50",
                        cellContent.type === 'empty' && "hover:bg-blue-50"
                      )}
                      disabled={cellContent.type === 'appointment'}
                    >
                      {cellContent.content}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slot Modal */}
      <Dialog open={slotModal.isOpen} onOpenChange={(open) => setSlotModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {slotModal.mode === 'create' ? 'Create Availability' : 'Edit Availability'}
            </DialogTitle>
            <DialogDescription>
              {slotModal.mode === 'create' 
                ? 'Set up a new time slot for patient appointments'
                : 'Modify or delete this availability slot'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={slotModal.date}
                  onChange={(e) => setSlotModal(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={slotModal.startTime}
                  onChange={(e) => setSlotModal(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={slotModal.endTime}
                  onChange={(e) => setSlotModal(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {slotModal.mode === 'edit' && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSlot}
                  disabled={deleteSlotMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSlotModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSlot}
                disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {slotModal.mode === 'create' ? 'Create' : 'Update'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}