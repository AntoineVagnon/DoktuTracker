import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Hook for synchronizing availability data across all booking surfaces
 * Ensures real-time updates when availability changes
 */
export function useAvailabilitySync() {
  const queryClient = useQueryClient();

  // Invalidate all availability-related queries to trigger refetch
  const syncAvailability = (doctorId?: string) => {
    console.log("🔄 Syncing availability across all surfaces", { doctorId });
    
    // Invalidate time slots queries
    queryClient.invalidateQueries({ queryKey: ["/api/time-slots"] });
    
    // Invalidate doctor-specific queries
    if (doctorId) {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors", doctorId] });
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${doctorId}/time-slots`] });
    }
    
    // Invalidate all doctors list (for next slot badges)
    queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
    
    // Invalidate appointments that might affect availability
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    
    console.log("✅ Availability sync completed");
  };

  // Only sync on window focus to catch external changes (not constant polling)
  useEffect(() => {
    const handleFocus = () => {
      console.log("🔄 Window focused - checking for availability updates");
      syncAvailability();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return { syncAvailability };
}