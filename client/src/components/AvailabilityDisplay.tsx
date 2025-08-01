import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useNextAvailableSlot } from "@/hooks/useNextAvailableSlot";
import { format } from "date-fns";

interface AvailabilityDisplayProps {
  doctorId: string;
}

function formatSlotTime(datetime: string): string {
  try {
    const date = new Date(datetime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const time = format(date, 'HH:mm');
    
    if (isToday) {
      return `Today ${time}`;
    } else if (isTomorrow) {
      return `Tomorrow ${time}`;
    } else {
      return `${format(date, 'MMM d')} ${time}`;
    }
  } catch (error) {
    return datetime;
  }
}

export function AvailabilityDisplay({ doctorId }: AvailabilityDisplayProps) {
  const { nextSlot, hasAvailability, isLoading } = useNextAvailableSlot(doctorId);
  
  if (isLoading) {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
          <Clock className="h-3 w-3 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!hasAvailability || !nextSlot) {
    return (
      <div className="space-y-1 w-full">
        <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
          <Clock className="h-3 w-3" />
          <span>No availability</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
        <Clock className="h-3 w-3" />
        <span>Online now</span>
      </div>
      <div className="text-xs text-gray-700 text-center">
        {formatSlotTime(`${nextSlot.date}T${nextSlot.startTime}`)}
      </div>
    </div>
  );
}