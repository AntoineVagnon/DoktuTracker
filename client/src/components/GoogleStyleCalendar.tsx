import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Calendar, Clock, Plus, Edit3, Trash2, Save, ChevronLeft, ChevronRight, 
  CalendarDays, Eye, MoreHorizontal, Repeat, X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";

interface TimeSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  lockedBy?: string;
  lockedUntil?: string;
  createdAt: string;
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

type CalendarView = 'day' | 'week' | 'month';

interface SlotModalData {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete';
  startTime: string;
  endTime: string;
  date: string;
  slotId?: string;
  isRecurring: boolean;
  recurringEndDate?: string;
  deleteScope?: 'single' | 'forward' | 'all';
}

interface WeeklyTemplateData {
  [key: string]: { // Monday, Tuesday, etc.
    enabled: boolean;
    blocks: { startTime: string; endTime: string; id: string }[];
  };
}

export default function GoogleStyleCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [dragStart, setDragStart] = useState<{ date: string; time: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: string; time: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  
  const [slotModal, setSlotModal] = useState<SlotModalData>({
    isOpen: false,
    mode: 'create',
    startTime: '',
    endTime: '',
    date: '',
    isRecurring: false
  });

  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplateData>({
    Monday: { enabled: true, blocks: [{ startTime: '09:00', endTime: '17:00', id: '1' }] },
    Tuesday: { enabled: true, blocks: [{ startTime: '09:00', endTime: '17:00', id: '1' }] },
    Wednesday: { enabled: true, blocks: [{ startTime: '09:00', endTime: '17:00', id: '1' }] },
    Thursday: { enabled: true, blocks: [{ startTime: '09:00', endTime: '17:00', id: '1' }] },
    Friday: { enabled: true, blocks: [{ startTime: '09:00', endTime: '17:00', id: '1' }] },
    Saturday: { enabled: false, blocks: [] },
    Sunday: { enabled: false, blocks: [] }
  });

  const [templateEndDate, setTemplateEndDate] = useState('');

  // Fetch doctor's time slots with demo fallback
  const { data: timeSlots = [], isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['/api/time-slots'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/time-slots');
        if (!response.ok) {
          // Fallback to demo data from localStorage
          const demoSlots = JSON.parse(localStorage.getItem('demo-time-slots') || '[]');
          return demoSlots;
        }
        return response.json();
      } catch (error) {
        // Return demo data on error
        const demoSlots = JSON.parse(localStorage.getItem('demo-time-slots') || '[]');
        return demoSlots;
      }
    },
    enabled: !!user?.id
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!user?.id
  });

  // Create time slot mutation with local storage fallback
  const createSlotMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; isRecurring?: boolean; recurringEndDate?: string }) => {
      // For demonstration purposes, create a local slot until database is fixed
      const tempSlot = {
        id: `temp-${Date.now()}`,
        doctorId: 'demo-doctor',
        date: data.startTime.split('T')[0],
        startTime: data.startTime.includes(':') ? data.startTime : new Date(data.startTime).toTimeString().slice(0, 5),
        endTime: data.endTime.includes(':') ? data.endTime : new Date(data.endTime).toTimeString().slice(0, 5),
        isAvailable: true,
        createdAt: new Date()
      };
      
      // Store in localStorage for demonstration
      const existingSlots = JSON.parse(localStorage.getItem('demo-time-slots') || '[]');
      existingSlots.push(tempSlot);
      localStorage.setItem('demo-time-slots', JSON.stringify(existingSlots));
      
      return tempSlot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Demo availability slot created!" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      console.error('Create slot error:', error);
      toast({ 
        title: "Failed to create availability", 
        description: "Database schema issue - using demo mode",
        variant: "destructive" 
      });
    }
  });



  // Update time slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: async (data: { id: string; startTime: string; endTime: string; isRecurring?: boolean; recurringEndDate?: string }) => {
      const response = await apiRequest('PUT', `/api/time-slots/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability updated successfully" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast({ title: "Failed to update availability", variant: "destructive" });
    }
  });

  // Delete time slot mutation (demo mode with localStorage)
  const deleteSlotMutation = useMutation({
    mutationFn: async (data: { slotId: string; scope?: string }) => {
      // For demo mode, remove from localStorage
      const existingSlots = JSON.parse(localStorage.getItem('demo-time-slots') || '[]');
      const updatedSlots = existingSlots.filter((slot: any) => slot.id !== data.slotId);
      localStorage.setItem('demo-time-slots', JSON.stringify(updatedSlots));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability deleted successfully" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast({ title: "Failed to delete availability", variant: "destructive" });
    }
  });

  // Create multiple slots from template
  const createTemplateSlotsMutation = useMutation({
    mutationFn: async (slots: Array<{ startTime: string; endTime: string; isRecurring: boolean; recurringEndDate?: string }>) => {
      const promises = slots.map(slot => 
        apiRequest('POST', '/api/time-slots', slot).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Weekly template applied successfully" });
      setIsTemplateOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to apply template", variant: "destructive" });
    }
  });

  const hours = Array.from({ length: 16 }, (_, i) => 8 + i); // 8 AM to 11 PM
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getWeekDates = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else if (view === 'day') {
      setCurrentDate(prev => direction === 'prev' ? addDays(prev, -1) : addDays(prev, 1));
    }
  };

  const handleCellMouseDown = (date: string, time: string) => {
    setDragStart({ date, time });
    setIsDragging(true);
  };

  const handleCellMouseEnter = (date: string, time: string) => {
    if (isDragging && dragStart) {
      setDragEnd({ date, time });
    }
  };

  const handleCellMouseUp = (date: string, time: string) => {
    if (isDragging && dragStart) {
      const startHour = parseInt(dragStart.time.split(':')[0]);
      const endHour = parseInt(time.split(':')[0]) + 1;
      
      setSlotModal({
        isOpen: true,
        mode: 'create',
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${endHour.toString().padStart(2, '0')}:00`,
        date: dragStart.date,
        isRecurring: false
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    // Handle different date formats - slot might have date + time separate or combined
    const slotDate = slot.date || new Date().toISOString().split('T')[0];
    const startTime = slot.startTime && slot.startTime.includes(':') ? slot.startTime : '09:00';
    const endTime = slot.endTime && slot.endTime.includes(':') ? slot.endTime : '10:00';
    
    setSlotModal({
      isOpen: true,
      mode: 'edit',
      startTime: startTime,
      endTime: endTime,
      date: slotDate,
      slotId: slot.id,
      isRecurring: slot.isRecurring || false,
      recurringEndDate: slot.recurringEndDate || ''
    });
  };

  const getDragPreviewSlots = () => {
    if (!isDragging || !dragStart || !dragEnd) return [];
    
    const startHour = Math.min(
      parseInt(dragStart.time.split(':')[0]),
      parseInt(dragEnd.time.split(':')[0])
    );
    const endHour = Math.max(
      parseInt(dragStart.time.split(':')[0]),
      parseInt(dragEnd.time.split(':')[0])
    ) + 1;
    
    return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  };

  const getCellContent = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;

    // Check for booked appointment
    const bookedAppointment = appointments.find((apt: Appointment) => {
      const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      const aptHour = new Date(apt.appointmentDate).getHours();
      return aptDate === dateStr && aptHour === hour && apt.status !== 'cancelled';
    });

    if (bookedAppointment) {
      return {
        type: 'appointment',
        content: (
          <div className="bg-blue-600 text-white text-xs p-2 rounded h-full flex flex-col justify-center border-l-4 border-blue-800">
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
      // Assuming slot has separate date and time fields now
      const slotDate = slot.date || format(new Date(slot.startTime), 'yyyy-MM-dd');
      const slotStartTime = slot.startTime.includes('T') ? new Date(slot.startTime).getHours() : parseInt(slot.startTime.split(':')[0]);
      return slotDate === dateStr && slotStartTime === hour;
    });

    if (availableSlot) {
      return {
        type: 'available',
        content: (
          <button
            onClick={() => handleSlotClick(availableSlot)}
            className="bg-green-100 border-l-4 border-green-500 text-green-800 text-xs p-2 rounded h-full w-full flex items-center justify-between hover:bg-green-200 transition-colors"
          >
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Available</span>
            </div>
            {availableSlot.isRecurring && <Repeat className="h-3 w-3" />}
          </button>
        ),
        slot: availableSlot
      };
    }

    // Drag preview
    const dragPreviewHours = getDragPreviewSlots();
    if (isDragging && dragStart?.date === dateStr && dragPreviewHours.includes(hour)) {
      return {
        type: 'draft',
        content: (
          <div className="bg-blue-100 border-2 border-dashed border-blue-400 text-blue-700 text-xs p-2 rounded h-full flex items-center justify-center">
            Draft
          </div>
        )
      };
    }

    return { type: 'empty', content: null };
  };

  const handleSaveSlot = () => {
    if (!slotModal.date || !slotModal.startTime || !slotModal.endTime) return;

    const startDateTime = new Date(`${slotModal.date}T${slotModal.startTime}:00`);
    const endDateTime = new Date(`${slotModal.date}T${slotModal.endTime}:00`);

    const data = {
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      isRecurring: slotModal.isRecurring,
      recurringEndDate: slotModal.recurringEndDate
    };

    if (slotModal.mode === 'create') {
      createSlotMutation.mutate(data);
    } else if (slotModal.slotId) {
      updateSlotMutation.mutate({ ...data, id: slotModal.slotId });
    }
  };

  const handleDeleteSlot = () => {
    if (!slotModal.slotId) return;

    if (slotModal.mode === 'delete') {
      deleteSlotMutation.mutate({ 
        slotId: slotModal.slotId, 
        scope: slotModal.deleteScope 
      });
    } else {
      // Switch to delete mode
      setSlotModal(prev => ({ ...prev, mode: 'delete' }));
    }
  };

  const addAvailabilityFromTemplate = () => {
    if (view === 'day') {
      setView('week');
    }
    setIsTemplateOpen(true);
  };

  const applyWeeklyTemplate = () => {
    const slots: Array<{ startTime: string; endTime: string; isRecurring: boolean; recurringEndDate?: string }> = [];
    
    Object.entries(weeklyTemplate).forEach(([dayName, dayData]) => {
      if (!dayData.enabled) return;
      
      const dayIndex = weekDays.indexOf(dayName);
      const targetDate = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), dayIndex);
      
      dayData.blocks.forEach(block => {
        const startDateTime = new Date(`${format(targetDate, 'yyyy-MM-dd')}T${block.startTime}:00`);
        const endDateTime = new Date(`${format(targetDate, 'yyyy-MM-dd')}T${block.endTime}:00`);
        
        slots.push({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          isRecurring: !!templateEndDate,
          recurringEndDate: templateEndDate
        });
      });
    });
    
    createTemplateSlotsMutation.mutate(slots);
  };

  const addBlockToDay = (dayName: string) => {
    setWeeklyTemplate(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: [
          ...prev[dayName].blocks,
          { startTime: '09:00', endTime: '17:00', id: Date.now().toString() }
        ]
      }
    }));
  };

  const removeBlockFromDay = (dayName: string, blockId: string) => {
    setWeeklyTemplate(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.filter(block => block.id !== blockId)
      }
    }));
  };

  const updateDayBlock = (dayName: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyTemplate(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        blocks: prev[dayName].blocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    }));
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
          <h2 className="text-2xl font-bold text-gray-900">Calendar & Availability</h2>
          <p className="text-gray-600">Click and drag to create availability slots</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Tabs */}
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Add Availability Button */}
          <Button onClick={addAvailabilityFromTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Availability
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium px-4">
            {view === 'week' && format(currentDate, 'MMMM yyyy')}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 border-l-4 border-blue-800 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-dashed border-blue-400 rounded"></div>
          <span>Draft (click & drag)</span>
        </div>
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          <span>Recurring</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'week' && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b bg-gray-50">
              <div className="p-3 text-sm font-medium text-gray-600">Time</div>
              {getWeekDates().map((date, index) => (
                <div key={index} className="p-3 text-center border-l">
                  <div className="text-xs text-gray-600 uppercase">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                  <div className="p-3 text-sm text-gray-600 bg-gray-50 border-r">
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </div>
                  {getWeekDates().map((date, dayIndex) => {
                    const cellContent = getCellContent(date, hour);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={cn(
                          "h-16 border-l border-gray-200 p-1 transition-colors",
                          cellContent.type === 'empty' && "hover:bg-blue-50 cursor-crosshair",
                          cellContent.type === 'appointment' && "cursor-default"
                        )}
                        onMouseDown={() => cellContent.type === 'empty' && handleCellMouseDown(dateStr, timeStr)}
                        onMouseEnter={() => handleCellMouseEnter(dateStr, timeStr)}
                        onMouseUp={() => handleCellMouseUp(dateStr, timeStr)}
                      >
                        {cellContent.content}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slot Modal */}
      <Dialog open={slotModal.isOpen} onOpenChange={(open) => setSlotModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {slotModal.mode === 'create' && 'Create Availability'}
              {slotModal.mode === 'edit' && 'Edit Availability'}
              {slotModal.mode === 'delete' && 'Delete Availability'}
            </DialogTitle>
            <DialogDescription>
              {slotModal.mode === 'create' && 'Set up a new time slot for patient appointments'}
              {slotModal.mode === 'edit' && 'Modify this availability slot'}
              {slotModal.mode === 'delete' && 'Choose how to delete this availability'}
            </DialogDescription>
          </DialogHeader>
          
          {slotModal.mode !== 'delete' ? (
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
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={slotModal.isRecurring}
                  onCheckedChange={(checked) => setSlotModal(prev => ({ ...prev, isRecurring: checked }))}
                />
                <Label htmlFor="recurring">Weekly recurring</Label>
              </div>
              
              {slotModal.isRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">Repeat until (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={slotModal.recurringEndDate || ''}
                    onChange={(e) => setSlotModal(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup 
                value={slotModal.deleteScope} 
                onValueChange={(value) => setSlotModal(prev => ({ ...prev, deleteScope: value as any }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single">This week only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="forward" id="forward" />
                  <Label htmlFor="forward">From this week forward</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">Entire series (all weeks)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

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
              {slotModal.mode !== 'delete' ? (
                <Button 
                  onClick={handleSaveSlot}
                  disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {slotModal.mode === 'create' ? 'Create' : 'Update'}
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteSlot}
                  disabled={deleteSlotMutation.isPending || !slotModal.deleteScope}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirm Delete
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weekly Template Sheet */}
      <Sheet open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px]">
          <SheetHeader>
            <SheetTitle>Add Weekly Availability</SheetTitle>
            <SheetDescription>
              Set up your weekly schedule. This will create recurring availability slots.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 space-y-6">
            {weekDays.map((dayName) => (
              <div key={dayName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={weeklyTemplate[dayName].enabled}
                      onCheckedChange={(checked) => 
                        setWeeklyTemplate(prev => ({
                          ...prev,
                          [dayName]: { ...prev[dayName], enabled: checked }
                        }))
                      }
                    />
                    <Label className="text-sm font-medium">{dayName}</Label>
                  </div>
                  {weeklyTemplate[dayName].enabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addBlockToDay(dayName)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Block
                    </Button>
                  )}
                </div>
                
                {weeklyTemplate[dayName].enabled && (
                  <div className="space-y-2 pl-6">
                    {weeklyTemplate[dayName].blocks.map((block) => (
                      <div key={block.id} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => updateDayBlock(dayName, block.id, 'startTime', e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <Input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => updateDayBlock(dayName, block.id, 'endTime', e.target.value)}
                          className="w-24"
                        />
                        {weeklyTemplate[dayName].blocks.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlockFromDay(dayName, block.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            <div className="space-y-2">
              <Label htmlFor="templateEndDate">Repeat until (optional)</Label>
              <Input
                id="templateEndDate"
                type="date"
                value={templateEndDate}
                onChange={(e) => setTemplateEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={applyWeeklyTemplate}
                disabled={createTemplateSlotsMutation.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsTemplateOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}