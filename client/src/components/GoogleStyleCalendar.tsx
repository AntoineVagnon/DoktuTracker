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
  CalendarDays, Eye, MoreHorizontal, Repeat, X, Check, Video, UserCheck, XCircle, User
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
  isRecurring?: boolean;
  recurringEndDate?: string;
}

interface Appointment {
  id: string | number;
  patientId: string | number;
  doctorId: string | number;
  slotId?: string;
  appointmentDate: string;
  status: string;
  price: string;
  consultationType?: 'in-person' | 'video';
  notes?: string;
  patient: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  doctor?: {
    id: number;
    firstName: string;
    lastName: string;
    specialty: string;
    phone?: string;
    email: string;
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

interface AppointmentModalData {
  isOpen: boolean;
  appointment: Appointment | null;
}

interface WeeklyTemplateData {
  [key: string]: { // Monday, Tuesday, etc.
    enabled: boolean;
    blocks: { startTime: string; endTime: string; id: string }[];
  };
}

interface GoogleStyleCalendarProps {
  doctorId?: string;
  isPatientView?: boolean;
  appointments?: any[];
  onAppointmentClick?: (appointment: any) => void;
  onDayClick?: (date: Date) => void;
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export default function GoogleStyleCalendar({
  doctorId,
  isPatientView = false,
  appointments: externalAppointments,
  onAppointmentClick,
  onDayClick,
  view: externalView,
  onViewChange,
  currentDate: externalCurrentDate,
  onDateChange
}: GoogleStyleCalendarProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncAvailability } = useAvailabilitySync();
  
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const currentDate = externalCurrentDate || internalCurrentDate;
  const setCurrentDate = onDateChange || setInternalCurrentDate;
  const [internalView, setInternalView] = useState<CalendarView>('week');
  const view = externalView || internalView;
  const setView = onViewChange || setInternalView;
  const [selectedBlocks, setSelectedBlocks] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<{ date: string; startHour: number; endHour: number; startMinute?: number; endMinute?: number } | null>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  
  const [slotModal, setSlotModal] = useState<SlotModalData>({
    isOpen: false,
    mode: 'create',
    startTime: '',
    endTime: '',
    date: '',
    isRecurring: false
  });

  const [appointmentModal, setAppointmentModal] = useState<AppointmentModalData>({
    isOpen: false,
    appointment: null
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
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8 AM position when calendar loads
  useEffect(() => {
    if (calendarScrollRef.current) {
      // Each row is h-8 (32px), and 8 AM is slot index 16 (8 * 2)
      const targetScrollPosition = 16 * 32; // 8 AM position
      calendarScrollRef.current.scrollTop = targetScrollPosition;
    }
  }, [view]);

  // Optimized time slots fetching with better caching
  const { data: timeSlots = [], isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ['/api/time-slots', user?.email],
    queryFn: async () => {
      try {
        // Single authenticated endpoint call
        const response = await fetch('/api/time-slots');
        if (response.ok) {
          return response.json();
        }
        
        // Only fallback for James Rodriguez if auth fails
        if (user?.email === 'james.rodriguez@doktu.com') {
          const fallbackResponse = await fetch('/api/doctors/9/slots');
          if (fallbackResponse.ok) {
            return fallbackResponse.json();
          }
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching time slots:', error);
        return [];
      }
    },
    enabled: !!user?.email, // Only fetch when user is available
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Optimized appointments fetching
  const { data: fetchedAppointments = [] as Appointment[], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments', user?.id],
    enabled: !!user?.id && !isPatientView, // Don't fetch if in patient view
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
  });

  // Use external appointments if in patient view, otherwise use fetched appointments
  const appointments: Appointment[] = isPatientView ? (externalAppointments as Appointment[] || []) : fetchedAppointments;

  // Batch create multiple 30-minute time slots - dramatically faster!
  const createSlotMutation = useMutation({
    mutationFn: async (data: { startTime: string; endTime: string; isRecurring?: boolean; recurringEndDate?: string }) => {
      // Parse the start and end times to create individual 30-minute slots
      const startDateTime = new Date(data.startTime);
      const endDateTime = new Date(data.endTime);
      
      const slots = [];
      let currentTime = new Date(startDateTime);
      
      // Prepare all slots data for batch creation (no API calls yet)
      while (currentTime < endDateTime) {
        const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000); // Add 30 minutes
        
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          isRecurring: data.isRecurring,
          recurringEndDate: data.recurringEndDate
        });
        
        currentTime = new Date(slotEnd);
      }
      
      // Single batch API call instead of sequential calls - HUGE performance boost!
      console.log(`🚀 Batch creating ${slots.length} slots with single API call`);
      const response = await apiRequest('POST', '/api/time-slots/batch', { slots });
      const createdSlots = await response.json();
      
      return createdSlots;
    },
    onSuccess: (slots) => {
      // More targeted cache invalidation - only invalidate time slots
      queryClient.invalidateQueries({ queryKey: ['/api/time-slots'] });
      
      // Sync availability across all booking surfaces
      syncAvailability(user?.id);
      
      toast({ 
        title: "Success!",
        description: `Created ${slots.length} slots instantly`
      });
      setSlotModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error: any) => {
      console.error('Batch slot creation failed:', error);
      toast({ 
        title: "Failed to create availability", 
        description: "Please try again",
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

  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const dates = [];
    const currentDateCopy = new Date(startDate);
    
    while (currentDateCopy <= lastDay || currentDateCopy.getDay() !== 0) {
      dates.push(new Date(currentDateCopy));
      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }
    
    return dates;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt: Appointment) => {
      const localAptTime = new Date(apt.appointmentDate);
      if (isNaN(localAptTime.getTime())) return false;
      const aptDate = format(localAptTime, 'yyyy-MM-dd');
      return aptDate === dateStr && apt.status !== 'cancelled';
    });
  };

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeSlots.filter((slot: TimeSlot) => slot.date === dateStr && slot.isAvailable);
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
    setCurrentSelection({ date, startHour: hour, endHour: hour, startMinute: minute, endMinute: minute + 30 });
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

  const handleAppointmentClick = (appointment: Appointment) => {
    setAppointmentModal({
      isOpen: true,
      appointment
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

    // Check for booked appointment using proper timezone conversion
    const bookedAppointment = appointments.find((apt: Appointment) => {
      // Convert UTC appointment time to local time properly
      const localAptTime = new Date(apt.appointmentDate);
      if (isNaN(localAptTime.getTime())) return false;
      
      const aptDate = format(localAptTime, 'yyyy-MM-dd');
      const aptHour = localAptTime.getHours();
      const aptMinute = localAptTime.getMinutes();
      return aptDate === dateStr && aptHour === hour && aptMinute === minute && apt.status !== 'cancelled';
    });

    if (bookedAppointment) {
      return {
        type: 'appointment',
        content: (
          <div 
            className="bg-blue-600 text-white text-xs p-1 rounded h-full flex flex-col justify-center border-l-4 border-blue-800 cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={() => {
              if (onAppointmentClick) {
                onAppointmentClick(bookedAppointment);
              } else {
                handleAppointmentClick(bookedAppointment);
              }
            }}
            title="Click to view appointment details"
          >
            <div className="font-medium">Booked</div>
            <div className="truncate text-xs">
              {bookedAppointment.patient.firstName || bookedAppointment.patient.email}
            </div>
          </div>
        )
      };
    }

    // Only show slots in doctor view
    if (!isPatientView) {
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
              title={`Available slot: ${timeStr}${existingSlot.isRecurring ? ' (Recurring)' : ''}`}
            >
              <div className="font-medium flex items-center gap-1">
                Available
                {existingSlot.isRecurring && <Repeat className="h-3 w-3" />}
              </div>
            </div>
          )
        };
      }
    }

    // Check if this cell is part of current selection (only in doctor view)
    if (!isPatientView) {
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
        console.log(`🚀 Batch creating ${blocksToCreate.length} availability blocks:`, blocksToCreate);
        
        // If we have multiple blocks, create them as separate time range mutations 
        // Each block will be processed by the batch mutation internally
        if (blocksToCreate.length === 1) {
          const block = blocksToCreate[0];
          const startDateTime = new Date(`${block.date}T${block.startTime}:00.000Z`);
          const endDateTime = new Date(`${block.date}T${block.endTime}:00.000Z`);
          
          await createSlotMutation.mutateAsync({
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            isRecurring: slotModal.isRecurring,
            recurringEndDate: slotModal.recurringEndDate
          });
        } else {
          // For multiple blocks, create them all as individual calls but the mutation handles batching internally
          const promises = blocksToCreate.map(block => {
            const startDateTime = new Date(`${block.date}T${block.startTime}:00.000Z`);
            const endDateTime = new Date(`${block.date}T${block.endTime}:00.000Z`);
            
            return createSlotMutation.mutateAsync({
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              isRecurring: slotModal.isRecurring,
              recurringEndDate: slotModal.recurringEndDate
            });
          });
          
          await Promise.all(promises);
        }
        
        console.log(`✅ Successfully created ${blocksToCreate.length} availability blocks with batch optimization!`);
        
        setSelectedBlocks([]);
        setSlotModal(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        console.error('Error creating blocks:', error);
        toast({
          title: "Error creating availability",
          description: "Please try again",
          variant: "destructive"
        });
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

  // Optimized loading state with skeleton
  if (slotsLoading || appointmentsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2 w-64"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-96"></div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="text-center text-gray-500 text-sm">Loading your calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar & Availability</h2>
          <p className="text-sm sm:text-base text-gray-600">
            <span className="hidden sm:inline">Click and drag to create availability slots</span>
            <span className="sm:hidden">Tap to create slots</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* View Tabs */}
          <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="day" className="text-xs sm:text-sm">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs sm:text-sm">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs sm:text-sm">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {!isPatientView && (
            <Button onClick={addAvailabilityFromTemplate} className="gap-2 h-9 sm:h-10">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Template</span>
              <span className="sm:hidden">Template</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-4">
        {/* Navigation and View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')} className="h-9 px-3">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <span className="text-base sm:text-lg font-medium px-2 sm:px-4 text-center sm:text-left min-w-0 flex-1 sm:flex-none">
              {view === 'week' && format(currentDate, 'MMMM yyyy')}
              {view === 'day' && (
                <>
                  <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
                  <span className="sm:hidden">{format(currentDate, 'EEE, MMM d')}</span>
                </>
              )}
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')} className="h-9 px-3">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentDate(new Date())}
              className="h-9"
            >
              Today
            </Button>
            
            {/* View Toggle */}
            <div className="flex rounded-md shadow-sm" role="group">
              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('day')}
                className="h-9 rounded-none rounded-l-md"
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
                className="h-9 rounded-none border-x-0"
              >
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
                className="h-9 rounded-none rounded-r-md"
              >
                Month
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Calendar Grid */}
      {/* Daily View */}
      {view === 'day' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-2 border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-600">
                Time
              </div>
              <div className="p-2 sm:p-3 text-center border-l">
                <div className="text-xs text-gray-600 uppercase">
                  {format(currentDate, 'EEEE')}
                </div>
                <div className="text-xs sm:text-sm font-medium mt-1">
                  {format(currentDate, 'MMMM d, yyyy')}
                </div>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto" ref={calendarScrollRef}>
              {timeSlots30Min.map((timeSlot, slotIndex) => {
                const cellContent = getCellContent30Min(currentDate, timeSlot.hour, timeSlot.minute);
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                const timeStr = timeSlot.display;
                
                return (
                  <div key={slotIndex} className="grid grid-cols-2 border-b last:border-b-0">
                    <div className="p-1 sm:p-2 text-xs sm:text-sm text-gray-600 bg-gray-50 border-r">
                      {timeSlot.display}
                    </div>
                    <div
                      className={cn(
                        "h-10 sm:h-12 border-l border-gray-200 p-0.5 sm:p-1 transition-colors text-xs",
                        cellContent.type === 'empty' && "hover:bg-blue-50 cursor-pointer touch-manipulation",
                        cellContent.type === 'appointment' && "cursor-default"
                      )}
                      onMouseDown={() => cellContent.type === 'empty' && handleCellMouseDown30Min(dateStr, timeStr)}
                      onMouseEnter={() => handleCellMouseEnter30Min(dateStr, timeStr)}
                      onMouseUp={() => handleCellMouseUp30Min()}
                      onTouchStart={() => cellContent.type === 'empty' && handleCellMouseDown30Min(dateStr, timeStr)}
                      onTouchEnd={() => handleCellMouseUp30Min()}
                    >
                      {cellContent.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {view === 'week' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-600">
                <span className="hidden sm:inline">Time</span>
                <span className="sm:hidden">T</span>
              </div>
              {getWeekDates().map((date, index) => (
                <div key={index} className="p-2 sm:p-3 text-center border-l">
                  <div className="text-xs text-gray-600 uppercase">
                    <span className="hidden sm:inline">{format(date, 'EEE')}</span>
                    <span className="sm:hidden">{format(date, 'E')[0]}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium mt-1">
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto" ref={calendarScrollRef}>
              {timeSlots30Min.map((timeSlot, slotIndex) => (
                <div key={slotIndex} className="grid grid-cols-8 border-b last:border-b-0">
                  <div className="p-1 sm:p-2 text-xs sm:text-sm text-gray-600 bg-gray-50 border-r">
                    <span className="hidden sm:inline">{timeSlot.display}</span>
                    <span className="sm:hidden">{timeSlot.hour.toString().padStart(2, '0')}</span>
                  </div>
                  {getWeekDates().map((date, dayIndex) => {
                    const cellContent = getCellContent30Min(date, timeSlot.hour, timeSlot.minute);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const timeStr = timeSlot.display;
                    
                    return (
                      <div
                        key={`${dayIndex}-${slotIndex}`}
                        className={cn(
                          "h-6 sm:h-8 border-l border-gray-200 p-0.5 sm:p-1 transition-colors text-xs",
                          cellContent.type === 'empty' && "hover:bg-blue-50 cursor-pointer touch-manipulation",
                          cellContent.type === 'appointment' && "cursor-default"
                        )}
                        onMouseDown={() => cellContent.type === 'empty' && handleCellMouseDown30Min(dateStr, timeStr)}
                        onMouseEnter={() => handleCellMouseEnter30Min(dateStr, timeStr)}
                        onMouseUp={() => handleCellMouseUp30Min()}
                        onTouchStart={() => cellContent.type === 'empty' && handleCellMouseDown30Min(dateStr, timeStr)}
                        onTouchEnd={() => handleCellMouseUp30Min()}
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

      {/* Monthly View */}
      {view === 'month' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b bg-gray-50 sticky top-0 z-10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <div key={index} className="p-2 text-center text-xs font-medium text-gray-600 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7">
              {getMonthDates().map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const dayAppointments = getAppointmentsForDate(date);
                const daySlots = getSlotsForDate(date);
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[80px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50",
                      !isCurrentMonth && "bg-gray-50 text-gray-400",
                      isToday && "bg-blue-50"
                    )}
                    onClick={() => {
                      if (onDayClick) {
                        onDayClick(date);
                      } else {
                        setView('day');
                        setCurrentDate(date);
                      }
                    }}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-blue-600"
                    )}>
                      {date.getDate()}
                    </div>
                    
                    {/* Show appointment count */}
                    {dayAppointments.length > 0 && (
                      <div className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 mb-1">
                        {dayAppointments.length} appointment{dayAppointments.length > 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {/* Show available slots count */}
                    {daySlots.length > 0 && (
                      <div className="text-xs bg-green-100 text-green-800 rounded px-1 py-0.5">
                        {daySlots.length} slot{daySlots.length > 1 ? 's' : ''} available
                      </div>
                    )}
                  </div>
                );
              })}
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
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {slotModal.mode === 'create' && (
                <>
                  <span className="hidden sm:inline">{`Create Availability${selectedBlocks.length > 1 ? ` (${selectedBlocks.length} slots)` : ''}`}</span>
                  <span className="sm:hidden">Create Slot</span>
                </>
              )}
              {slotModal.mode === 'edit' && (
                <>
                  <span className="hidden sm:inline">Edit Availability</span>
                  <span className="sm:hidden">Edit Slot</span>
                </>
              )}
              {slotModal.mode === 'delete' && (
                <>
                  <span className="hidden sm:inline">Delete Availability</span>
                  <span className="sm:hidden">Delete Slot</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {slotModal.mode === 'create' && selectedBlocks.length > 1 && (
                <>
                  <span className="hidden sm:inline">{`Configure settings for ${selectedBlocks.length} selected time blocks. Each block will be created as a separate availability slot.`}</span>
                  <span className="sm:hidden">{`${selectedBlocks.length} blocks selected`}</span>
                </>
              )}
              {slotModal.mode === 'create' && selectedBlocks.length <= 1 && (
                <>
                  <span className="hidden sm:inline">Set up a new time slot for patient appointments</span>
                  <span className="sm:hidden">Set up time slot</span>
                </>
              )}
              {slotModal.mode === 'edit' && (
                <>
                  <span className="hidden sm:inline">Modify this availability slot</span>
                  <span className="sm:hidden">Modify slot</span>
                </>
              )}
              {slotModal.mode === 'delete' && (
                <>
                  <span className="hidden sm:inline">Choose how to delete this availability</span>
                  <span className="sm:hidden">Choose delete scope</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {slotModal.mode !== 'delete' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={slotModal.date}
                    onChange={(e) => setSlotModal(prev => ({ ...prev, date: e.target.value }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={slotModal.startTime}
                    onChange={(e) => setSlotModal(prev => ({ ...prev, startTime: e.target.value }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={slotModal.endTime}
                    onChange={(e) => setSlotModal(prev => ({ ...prev, endTime: e.target.value }))}
                    className="h-10"
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

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0">
            <div className="order-2 sm:order-1">
              {slotModal.mode === 'edit' && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSlot}
                  disabled={deleteSlotMutation.isPending}
                  className="w-full sm:w-auto h-10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBlocks([]);
                  setSlotModal(prev => ({ ...prev, isOpen: false }));
                  console.log("Cancel clicked - selection cleared");
                }}
                className="w-full sm:w-auto h-10"
              >
                Cancel
              </Button>
              {slotModal.mode !== 'delete' ? (
                <Button 
                  onClick={handleSaveSlot}
                  disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                  className="w-full sm:w-auto h-10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {slotModal.mode === 'create' ? 'Create' : 'Update'}
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteSlot}
                  disabled={deleteSlotMutation.isPending || !slotModal.deleteScope}
                  className="w-full sm:w-auto h-10"
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
        <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[700px]">
          <SheetHeader>
            <SheetTitle className="text-lg sm:text-xl">Add Weekly Availability</SheetTitle>
            <SheetDescription className="text-sm sm:text-base">
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

      {/* Appointment Action Modal */}
      <Dialog open={appointmentModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setAppointmentModal({ isOpen: false, appointment: null });
        }
      }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Appointment Details</DialogTitle>
          </DialogHeader>
          
          {appointmentModal.appointment && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Patient:</span>
                  <span>
                    {appointmentModal.appointment.patient.firstName} {appointmentModal.appointment.patient.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Date:</span>
                  <span>{format(new Date(appointmentModal.appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Time:</span>
                  <span>{format(new Date(appointmentModal.appointment.appointmentDate), 'h:mm a')}</span>
                </div>
                {appointmentModal.appointment.consultationType === 'video' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Type:</span>
                    <span>Video Consultation</span>
                  </div>
                )}
              </div>

              {/* Check if appointment is live (within 15 minutes before or during) */}
              {(() => {
                const now = new Date();
                const appointmentTime = new Date(appointmentModal.appointment.appointmentDate);
                const fifteenMinutesBefore = new Date(appointmentTime.getTime() - 15 * 60 * 1000);
                const thirtyMinutesAfter = new Date(appointmentTime.getTime() + 30 * 60 * 1000);
                const isLive = now >= fifteenMinutesBefore && now <= thirtyMinutesAfter;
                
                return isLive && appointmentModal.appointment.consultationType === 'video' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      Video consultation is ready to start
                    </p>
                    <Button 
                      variant="default" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        window.location.href = `/appointments/${appointmentModal.appointment?.id}/video`;
                      }}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Video Call
                    </Button>
                  </div>
                ) : null;
              })()}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    window.location.href = `/appointments/${appointmentModal.appointment?.id}`;
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                
                {appointmentModal.appointment.status !== 'cancelled' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/appointments/${appointmentModal.appointment?.id}/reschedule`;
                      }}
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Reschedule Appointment
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this appointment?')) {
                          try {
                            await apiRequest('POST', `/api/appointments/${appointmentModal.appointment?.id}/cancel`);
                            queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                            toast({
                              title: "Appointment cancelled",
                              description: "The appointment has been cancelled successfully."
                            });
                            setAppointmentModal({ isOpen: false, appointment: null });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to cancel appointment. Please try again.",
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}