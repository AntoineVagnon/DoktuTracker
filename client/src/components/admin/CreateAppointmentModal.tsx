import { useState, useEffect } from 'react';
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
import { Calendar as CalendarIcon, Clock, User, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    prefilledDate ? new Date(prefilledDate) : new Date()
  );
  const [startTime, setStartTime] = useState(prefilledStartTime || '09:00');
  const [endTime, setEndTime] = useState(prefilledEndTime || '10:00');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedPatientId) return;

    setIsSubmitting(true);
    try {
      const appointmentData = {
        doctorId,
        patientId: parseInt(selectedPatientId),
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime,
        endTime,
        reason: reason || 'Admin-created appointment',
        notes,
        status: 'confirmed',
        isAdminCreated: true,
      };

      const response = await apiRequest('POST', '/api/admin/appointments/create', appointmentData);

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      // Reset form
      setSelectedPatientId('');
      setReason('');
      setNotes('');

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
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
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Patient *
            </Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select a patient"} />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient: any) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.firstName} {patient.lastName} ({patient.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Time *
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Time *
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
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
            <Button type="submit" disabled={isSubmitting || !selectedPatientId || !selectedDate}>
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
