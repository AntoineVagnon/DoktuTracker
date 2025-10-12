import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the next available slot for a doctor
 * Used for displaying "Next available" badges on doctor cards
 */
export function useNextAvailableSlot(doctorId: string) {
  const { data: timeSlots, isLoading } = useQuery({
    queryKey: [`/api/doctors/${doctorId}/slots?nextOnly=true`],
    refetchOnWindowFocus: false, // Disable auto-refetch
    staleTime: 15 * 60 * 1000, // Consider data stale after 15 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache longer
    enabled: true, // Re-enable for homepage availability display
  });

  // Calculate next available slot from the fetched time slots
  const getNextAvailable = () => {
    if (!timeSlots || !Array.isArray(timeSlots)) return null;
    
    // Backend now returns only the next available slot with 60-minute buffer applied
    // So we just need to return the first (and only) slot if it exists
    return timeSlots.length > 0 ? timeSlots[0] : null;
  };

  const nextSlot = getNextAvailable();

  return {
    nextSlot,
    hasAvailability: !!nextSlot,
    isLoading,
  };
}