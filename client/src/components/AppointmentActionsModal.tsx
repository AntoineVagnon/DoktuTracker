import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, AlertCircle, X } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { formatAppointmentTime, utcToLocal } from "@/lib/timezoneUtils";
import { useToast } from "@/hooks/use-toast";

interface AppointmentActionsModalProps {
  appointment: any;
  action: "reschedule" | "cancel" | null;
  onClose: () => void;
}

export function AppointmentActionsModal({ appointment, action, onClose }: AppointmentActionsModalProps) {
  const [reason, setReason] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available slots for the doctor (for rescheduling)
  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: [`/api/doctors/${appointment?.doctorId}/slots/available`],
    enabled: action === "reschedule" && !!appointment?.doctorId,
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) {
        throw new Error("No appointment selected");
      }
      if (!selectedSlotId || !reason) {
        throw new Error("Please select a new time slot and provide a reason");
      }
      return apiRequest("PUT", `/api/appointments/${appointment.id}/reschedule`, {
        newSlotId: selectedSlotId,
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been successfully rescheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) {
        throw new Error("No appointment selected");
      }
      if (!reason) {
        throw new Error("Please provide a reason for cancellation");
      }
      return apiRequest("PUT", `/api/appointments/${appointment.id}/cancel`, {
        reason,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Appointment Cancelled",
        description: data.refundEligible 
          ? "Your appointment has been cancelled. You will receive a refund."
          : "Your appointment has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (action === "reschedule") {
      rescheduleMutation.mutate();
    } else if (action === "cancel") {
      cancelMutation.mutate();
    }
  };

  // Early return after all hooks
  if (!appointment || !action) return null;

  // Calculate values after hooks but before JSX
  const appointmentTime = utcToLocal(appointment.appointmentDate);
  const now = new Date();
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursUntilAppointment = Math.floor(timeDiff / (1000 * 60 * 60));

  // Filter slots to only show future ones and exclude the current appointment slot
  const futureSlots = (availableSlots as any[]).filter((slot: any) => {
    const slotDate = new Date(`${slot.date}T${slot.startTime}`);
    // Check if this is the current appointment's slot
    const currentAppointmentLocal = utcToLocal(appointment.appointmentDate);
    const currentDate = currentAppointmentLocal.toISOString().split('T')[0];
    const currentTime = currentAppointmentLocal.toTimeString().slice(0, 8);
    
    const isCurrentSlot = slot.date === currentDate && slot.startTime === currentTime;
    
    return slotDate > now && !isCurrentSlot;
  });

  return (
    <Dialog open={!!action} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {action === "reschedule" ? "Reschedule Appointment" : "Cancel Appointment"}
          </DialogTitle>
          <DialogDescription>
            {action === "reschedule" 
              ? "Select a new time slot for your appointment"
              : "Are you sure you want to cancel this appointment?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current appointment info */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Current appointment:</span>
              {format(appointmentTime, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Time:</span>
              {formatAppointmentTime(appointment.appointmentDate)}
            </div>
          </div>

          {/* Warning for appointments within 60 minutes */}
          {hoursUntilAppointment < 1 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Changes are only allowed at least 1 hour before your consultation.
                This appointment cannot be {action === "reschedule" ? "rescheduled" : "cancelled"}.
              </AlertDescription>
            </Alert>
          )}

          {/* Reschedule count warning */}
          {action === "reschedule" && appointment.rescheduleCount >= 2 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've reached the reschedule limit for this appointment (2 times).
              </AlertDescription>
            </Alert>
          )}

          {/* Available slots for rescheduling */}
          {action === "reschedule" && hoursUntilAppointment >= 1 && appointment.rescheduleCount < 2 && (
            <div className="space-y-2">
              <Label>Select new time slot</Label>
              {slotsLoading ? (
                <div className="text-sm text-gray-500">Loading available slots...</div>
              ) : futureSlots.length === 0 ? (
                <div className="text-sm text-gray-500">No available slots found</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {futureSlots.map((slot: any) => {
                    const slotDate = new Date(`${slot.date}T${slot.startTime}`);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          selectedSlotId === slot.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {format(slotDate, "EEE, MMM d, yyyy")}
                        </div>
                        <div className="text-sm text-gray-600">
                          {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reason field */}
          {hoursUntilAppointment >= 1 && (action !== "reschedule" || appointment.rescheduleCount < 2) && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for {action === "reschedule" ? "rescheduling" : "cancellation"} *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Please provide a reason for ${action === "reschedule" ? "rescheduling" : "cancelling"} your appointment`}
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Refund info for cancellations */}
          {action === "cancel" && appointment.status === "paid" && hoursUntilAppointment >= 1 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will receive a full refund since you're cancelling more than 1 hour before the appointment.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {hoursUntilAppointment >= 1 && (action !== "reschedule" || appointment.rescheduleCount < 2) && (
            <Button 
              onClick={handleSubmit}
              disabled={
                (action === "reschedule" && (!selectedSlotId || !reason)) ||
                (action === "cancel" && !reason) ||
                rescheduleMutation.isPending ||
                cancelMutation.isPending
              }
              variant={action === "cancel" ? "destructive" : "default"}
            >
              {rescheduleMutation.isPending || cancelMutation.isPending ? (
                "Processing..."
              ) : action === "reschedule" ? (
                "Reschedule Appointment"
              ) : (
                "Cancel Appointment"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}