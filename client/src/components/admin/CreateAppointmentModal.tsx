import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, FileText, Search, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CreateAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: number;
  doctorName?: string;
  prefilledDate?: string;
  prefilledStartTime?: string;
  prefilledEndTime?: string;
  onSuccess?: () => void;
}

export default function CreateAppointmentModal({
  open,
  onOpenChange,
  doctorId,
  doctorName,
  prefilledDate,
  prefilledStartTime,
  prefilledEndTime,
  onSuccess,
}: CreateAppointmentModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    prefilledDate ? new Date(prefilledDate) : new Date()
  );
  const [startTime, setStartTime] = useState(prefilledStartTime || '09:00');
  const [endTime, setEndTime] = useState(prefilledEndTime || '10:00');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update prefilled values when they change
  useEffect(() => {
    if (prefilledDate) setSelectedDate(new Date(prefilledDate));
    if (prefilledStartTime) setStartTime(prefilledStartTime);
    if (prefilledEndTime) setEndTime(prefilledEndTime);
  }, [prefilledDate, prefilledStartTime, prefilledEndTime]);

  // Fetch all patients for selection
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['/api/admin/patients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/patients');
      return await response.json();
    },
    enabled: open,
  });

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!searchTerm) return patients;

    const lowerSearch = searchTerm.toLowerCase();
    return patients.filter((patient: any) =>
      patient.firstName?.toLowerCase().includes(lowerSearch) ||
      patient.lastName?.toLowerCase().includes(lowerSearch) ||
      patient.email?.toLowerCase().includes(lowerSearch)
    );
  }, [patients, searchTerm]);

  // Calculate appointment duration
  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  }, [startTime, endTime]);

  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Validate times
  const timeError = useMemo(() => {
    if (!startTime || !endTime) return null;
    if (duration <= 0) return 'End time must be after start time';
    if (duration < 15) return 'Appointment must be at least 15 minutes';
    if (duration > 180) return 'Appointment cannot exceed 3 hours';
    return null;
  }, [duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedPatientId) return;

    // Validate time range
    if (timeError) {
      toast({
        title: "Invalid time range",
        description: timeError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a Date object in the user's local timezone
      const localDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}:00`);

      // Convert to ISO string (UTC) for the backend
      const appointmentDateUTC = localDateTime.toISOString();

      const appointmentData = {
        doctorId,
        patientId: parseInt(selectedPatientId),
        appointmentDateUTC, // Send UTC timestamp directly
        reason: reason || 'Admin-created appointment',
        notes,
        status: 'confirmed',
        isAdminCreated: true,
      };

      const response = await apiRequest('POST', '/api/admin/appointments/create', appointmentData);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create appointment');
      }

      // Reset form
      setSelectedPatientId('');
      setSearchTerm('');
      setReason('');
      setNotes('');

      toast({
        title: "Appointment created",
        description: `Successfully created appointment for ${format(selectedDate, 'PPP')} at ${startTime}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Failed to create appointment",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Appointment</DialogTitle>
          {doctorName && (
            <p className="text-sm text-gray-500">For Dr. {doctorName}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="patient" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Patient *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select a patient"} />
              </SelectTrigger>
              <SelectContent>
                {filteredPatients.length === 0 ? (
                  <div className="text-sm text-gray-500 p-2 text-center">
                    {searchTerm ? 'No patients found' : 'No patients available'}
                  </div>
                ) : (
                  filteredPatients.map((patient: any) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.firstName} {patient.lastName} ({patient.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {filteredPatients.length > 0 && (
              <p className="text-xs text-gray-500">
                {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} {searchTerm ? 'found' : 'available'}
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Appointment Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Appointment Time *
              </Label>
              <span className="text-xs text-gray-500">Timezone: {userTimezone}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm text-gray-600">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className={timeError ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm text-gray-600">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className={timeError ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {timeError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{timeError}</span>
              </div>
            ) : duration > 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                Duration: <span className="font-medium">{duration} minutes</span>
              </div>
            ) : null}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reason for Visit
            </Label>
            <Input
              id="reason"
              placeholder="e.g., Follow-up consultation, Emergency visit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedPatientId || !selectedDate || !!timeError}
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
