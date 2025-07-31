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
  CalendarDays, Eye, MoreHorizontal, Repeat, X, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
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
  const { syncAvailability } = useAvailabilitySync();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [selectedBlocks, setSelectedBlocks] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ date: string; startHour: number; endHour: number } | null>(null);
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

  // Fetch doctor's time slots - try authenticated API first, fallback to James Rodriguez data for testing
  const { data: timeSlots = [], isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['/api/time-slots', user?.email],
    queryFn: async () => {
      try {
        // Try authenticated endpoint first
        const response = await fetch('/api/time-slots');
        if (response.ok) {
          return response.json();
        }
        
        // Fallback: if user is James Rodriguez or for testing, use doctor ID 9
        if (!user?.email || user.email === 'james.rodriguez@doktu.com') {
          const fallbackResponse = await fetch('/api/doctors/9/slots');
          if (fallbackResponse.ok) {
            return fallbackResponse.json();
          }
        }
        
        // Final fallback to empty array
        return [];
      } catch (error) {
        console.error('Error fetching time slots:', error);
        return [];
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: !!user?.id
  });

  // Create individual 30-minute time slots
  const createSlotMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; isRecurring?: boolean; recurringEndDate?: string }) => {
      // Parse the start and end times to create individual 30-minute slots
      const startDateTime = new Date(data.startTime);
      const endDateTime = new Date(data.endTime);
      
      const slots = [];
      let currentTime = new Date(startDateTime);
      
      // Create individual 30-minute slots between start and end time
      while (currentTime < endDateTime) {
        const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000); // Add 30 minutes
        
        const slotData = {
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          isRecurring: data.isRecurring,
          recurringEndDate: data.recurringEndDate
        };
        
        const response = await apiRequest('POST', '/api/time-slots', slotData);
        const slot = await response.json();
        slots.push(slot);
        
        currentTime = new Date(slotEnd);
      }
      
      return slots;
    },
    onSuccess: (slots) => {
      // Immediate sync across all booking surfaces
      syncAvailability(user?.id);
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ 
        title: "Availability created successfully!",
        description: `Created ${slots.length} individual 30-minute slots`
      });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      console.error('Create slot error:', error);
      toast({ 
        title: "Failed to create availability", 
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
      // Sync availability across all surfaces when updated
      syncAvailability(user?.id);
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Availability updated successfully" });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => {
      toast({ title: "Failed to update availability", variant: "destructive" });
    }
  });

  // Delete time slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (data: { slotId: string; scope?: string }) => {
      const response = await apiRequest('DELETE', `/api/time-slots/${data.slotId}`, { scope: data.scope });
      return response.json();
    },
    onSuccess: () => {
      // Sync availability across all surfaces when deleted
      syncAvailability(user?.id);
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
      // Sync availability across all surfaces when template applied
      syncAvailability(user?.id);
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      toast({ title: "Weekly template applied successfully" });
      setIsTemplateOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to apply template", variant: "destructive" });
    }
  });

  // Generate 30-minute time slots from midnight to midnight (24 hours)
  const timeSlots30Min = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return { hour, minute, display: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}` };
  });
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

  const handleCellMouseDown30Min = (date: string, time: string) => {
    if (!time || typeof time !== 'string') return;
    const [hour, minute] = time.split(':').map(Number);
    const slotIndex = timeSlots30Min.findIndex(slot => slot.hour === hour && slot.minute === minute);
    setCurrentSelection({ date, startHour: hour, endHour: hour, startMinute: minute, endMinute: minute + 30, slotIndex });
    setIsSelecting(true);
  };

  const handleCellMouseEnter30Min = (date: string, time: string) => {
    if (isSelecting && currentSelection && currentSelection.date === date && time && typeof time === 'string') {
      const [hour, minute] = time.split(':').map(Number);
      const endTime = minute + 30 > 30 ? hour + 1 : hour;
      const endMinute = minute + 30 > 30 ? 0 : minute + 30;
      setCurrentSelection(prev => ({
        ...prev!,
        endHour: Math.max(prev!.endHour, endTime),
        endMinute: endMinute
      }));
    }
  };

  const handleCellMouseUp30Min = () => {
    if (isSelecting && currentSelection) {
      // Create 30-minute block
      const newBlocks = [{
        date: currentSelection.date,
        startTime: `${currentSelection.startHour.toString().padStart(2, '0')}:${(currentSelection.startMinute || 0).toString().padStart(2, '0')}`,
        endTime: `${currentSelection.endHour.toString().padStart(2, '0')}:${(currentSelection.endMinute || 30).toString().padStart(2, '0')}`
      }];
      
      setSelectedBlocks(newBlocks);
      
      const firstBlock = newBlocks[0];
      
      setSlotModal({
        isOpen: true,
        mode: 'create',
        startTime: firstBlock.startTime,
        endTime: firstBlock.endTime,
        date: firstBlock.date,
        isRecurring: false
      });
    }
    
    setIsSelecting(false);
    setCurrentSelection(null);
  };

  const openModalForSelectedBlocks = () => {
    if (selectedBlocks.length === 0) return;
    
    const firstBlock = selectedBlocks[0];
    setSlotModal({
      isOpen: true,
      mode: 'create',
      startTime: firstBlock.startTime,
      endTime: firstBlock.endTime,
      date: firstBlock.date,
      isRecurring: false
    });
  };

  const clearSelectedBlocks = () => {
    setSelectedBlocks([]);
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

  const isBlockSelected30Min = (date: string, hour: number, minute: number) => {
    return selectedBlocks.some(block => {
      const [blockStartHour, blockStartMinute] = block.startTime.split(':').map(Number);
      const [blockEndHour, blockEndMinute] = block.endTime.split(':').map(Number);
      const blockStartTotal = blockStartHour * 60 + blockStartMinute;
      const blockEndTotal = blockEndHour * 60 + blockEndMinute;
      const currentTotal = hour * 60 + minute;
      return block.date === date && currentTotal >= blockStartTotal && currentTotal < blockEndTotal;
    });
  };

  const isCurrentSelection30Min = (date: string, hour: number, minute: number) => {
    if (!isSelecting || !currentSelection || currentSelection.date !== date) return false;
    const startTotal = currentSelection.startHour * 60 + (currentSelection.startMinute || 0);
    const endTotal = currentSelection.endHour * 60 + (currentSelection.endMinute || 30);
    const currentTotal = hour * 60 + minute;
    return currentTotal >= startTotal && currentTotal < endTotal;
  };

  const getCellContent30Min = (date: Date, hour: number, minute: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    // Check for booked appointment
    const bookedAppointment = appointments.find((apt: Appointment) => {
      const aptDate = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      const aptTime = new Date(apt.appointmentDate);
      const aptHour = aptTime.getHours();
      const aptMinute = aptTime.getMinutes();
      return aptDate === dateStr && aptHour === hour && aptMinute === minute && apt.status !== 'cancelled';
    });

    if (bookedAppointment) {
      return {
        type: 'appointment',
        content: (
          <div className="bg-blue-600 text-white text-xs p-1 rounded h-full flex flex-col justify-center border-l-4 border-blue-800">
            <div className="font-medium">Booked</div>
            <div className="truncate text-xs">
              {bookedAppointment.patient.firstName || bookedAppointment.patient.email}
            </div>
          </div>
        )
      };
    }

    // Check for existing available slot
    const existingSlot = timeSlots.find((slot: TimeSlot) => {
      const slotDate = slot.date;
      const slotTime = slot.startTime;
      // Handle time format from database (09:00:00 vs 09:00)
      const [slotHour, slotMinute] = slotTime.split(':').map(Number);
      return slotDate === dateStr && slotHour === hour && slotMinute === minute && slot.isAvailable;
    });

    if (existingSlot) {
      return {
        type: 'available',
        content: (
          <div 
            className="bg-green-100 text-green-800 text-xs p-1 rounded h-full flex items-center justify-center border-l-4 border-green-500 cursor-pointer hover:bg-green-200 transition-colors"
            onClick={() => handleSlotClick(existingSlot)}
            title={`Available slot: ${timeStr}`}
          >
            <div className="font-medium">Available</div>
          </div>
        )
      };
    }

    // Check if this cell is part of current selection
    const isSelected = isBlockSelected30Min(dateStr, hour, minute);
    const isCurrent = isCurrentSelection30Min(dateStr, hour, minute);

    if (isSelected || isCurrent) {
      return {
        type: 'selected',
        content: (
          <div className="bg-green-100 border-2 border-dashed border-green-400 rounded h-full flex items-center justify-center">
            <div className="text-green-700 text-xs font-medium">Selected</div>
          </div>
        )
      };
    }

    // Empty cell - available for selection
    return {
      type: 'empty',
      content: null
    };
  };

  const handleSaveSlot = async () => {
    if (!slotModal.date || !slotModal.startTime || !slotModal.endTime) return;

    if (slotModal.mode === 'create') {
      // Create all selected blocks with the modal settings
      const blocksToCreate = selectedBlocks.length > 0 ? selectedBlocks : [{
        date: slotModal.date,
        startTime: slotModal.startTime,
        endTime: slotModal.endTime
      }];

      try {
        console.log(`Creating ${blocksToCreate.length} individual availability blocks:`, blocksToCreate);
        
        const results = [];
        for (let i = 0; i < blocksToCreate.length; i++) {
          const block = blocksToCreate[i];
          console.log(`Creating availability ${i + 1}/${blocksToCreate.length}: ${block.date} ${block.startTime}-${block.endTime}`);
          
          const startDateTime = new Date(`${block.date}T${block.startTime}:00.000Z`);
          const endDateTime = new Date(`${block.date}T${block.endTime}:00.000Z`);
          
          const result = await createSlotMutation.mutateAsync({
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            isRecurring: slotModal.isRecurring,
            recurringEndDate: slotModal.recurringEndDate
          });
          
          results.push(result);
          console.log(`✓ Availability ${i + 1} created: ${block.startTime}-${block.endTime}`);
        }
        
        console.log(`✅ Successfully created ${results.length} separate availability slots!`);
        
        // Sync availability across all surfaces immediately
        syncAvailability(user?.id);
        
        setSelectedBlocks([]);
        toast({ 
          title: `Success!`, 
          description: `Created ${blocksToCreate.length} availability block${blocksToCreate.length > 1 ? 's' : ''}!` 
        });
        setSlotModal(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        console.error('Error creating blocks:', error);
      }
    } else if (slotModal.slotId) {
      const startDateTime = new Date(`${slotModal.date}T${slotModal.startTime}:00`);
      const endDateTime = new Date(`${slotModal.date}T${slotModal.endTime}:00`);

      const data = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        isRecurring: slotModal.isRecurring,
        recurringEndDate: slotModal.recurringEndDate
      };

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
          
          <Button onClick={addAvailabilityFromTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Template
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
          <div className="w-4 h-4 bg-green-100 border-2 border-dashed border-green-400 rounded"></div>
          <span>Selected for creation</span>
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
              {timeSlots30Min.map((timeSlot, slotIndex) => (
                <div key={slotIndex} className="grid grid-cols-8 border-b last:border-b-0">
                  <div className="p-2 text-sm text-gray-600 bg-gray-50 border-r">
                    {timeSlot.display}
                  </div>
                  {getWeekDates().map((date, dayIndex) => {
                    const cellContent = getCellContent30Min(date, timeSlot.hour, timeSlot.minute);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const timeStr = timeSlot.display;
                    
                    return (
                      <div
                        key={`${dayIndex}-${slotIndex}`}
                        className={cn(
                          "h-12 border-l border-gray-200 p-1 transition-colors",
                          cellContent.type === 'empty' && "hover:bg-blue-50 cursor-crosshair",
                          cellContent.type === 'appointment' && "cursor-default"
                        )}
                        onMouseDown={() => cellContent.type === 'empty' && handleCellMouseDown30Min(dateStr, timeStr)}
                        onMouseEnter={() => handleCellMouseEnter30Min(dateStr, timeStr)}
                        onMouseUp={() => handleCellMouseUp30Min()}
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
      <Dialog open={slotModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          // Clear selection when modal is closed
          setSelectedBlocks([]);
          console.log("Modal closed - selection cleared");
        }
        setSlotModal(prev => ({ ...prev, isOpen: open }));
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {slotModal.mode === 'create' && `Create Availability${selectedBlocks.length > 1 ? ` (${selectedBlocks.length} slots)` : ''}`}
              {slotModal.mode === 'edit' && 'Edit Availability'}
              {slotModal.mode === 'delete' && 'Delete Availability'}
            </DialogTitle>
            <DialogDescription>
              {slotModal.mode === 'create' && selectedBlocks.length > 1 && `Configure settings for ${selectedBlocks.length} selected time blocks. Each block will be created as a separate availability slot.`}
              {slotModal.mode === 'create' && selectedBlocks.length <= 1 && 'Set up a new time slot for patient appointments'}
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
                onClick={() => {
                  setSelectedBlocks([]);
                  setSlotModal(prev => ({ ...prev, isOpen: false }));
                  console.log("Cancel clicked - selection cleared");
                }}
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