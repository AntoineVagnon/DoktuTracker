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

  // Auto-sync every 30 seconds to catch external changes
  useEffect(() => {
    const interval = setInterval(() => {
      syncAvailability();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { syncAvailability };
}