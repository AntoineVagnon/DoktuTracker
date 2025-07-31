import { useQuery } from "@tanstack/react-query";

/**
 * Hook to get the next available slot for a doctor
 * Used for displaying "Next available" badges on doctor cards
 */
export function useNextAvailableSlot(doctorId: string) {
  const { data: timeSlots, isLoading } = useQuery({
    queryKey: ["/api/time-slots", doctorId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/doctors/${doctorId}/slots`);
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.warn("Failed to fetch time slots for doctor", doctorId);
        return [];
      }
    },
    refetchOnWindowFocus: false, // Disable auto-refetch
    staleTime: 15 * 60 * 1000, // Consider data stale after 15 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache longer
    enabled: false, // Disable automatic fetching - only fetch when explicitly needed
  });

  // Calculate next available slot from the fetched time slots
  const getNextAvailable = () => {
    if (!timeSlots || !Array.isArray(timeSlots)) return null;

    const now = new Date();
    
    // Remove duplicate slots by date+startTime, keeping the most restrictive availability
    const uniqueSlots = timeSlots.reduce((acc: any[], current: any) => {
      const key = `${current.date}_${current.startTime}`;
      const existingIndex = acc.findIndex(slot => `${slot.date}_${slot.startTime}` === key);
      
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // Keep the slot that is NOT available (more restrictive) if one exists
        if (!current.isAvailable && acc[existingIndex].isAvailable) {
          acc[existingIndex] = current;
        }
      }
      return acc;
    }, []);

    const availableSlots = uniqueSlots
      .filter((slot: any) => slot.isAvailable && new Date(`${slot.date}T${slot.startTime}`) > now)
      .sort((a: any, b: any) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

    return availableSlots.length > 0 ? availableSlots[0] : null;
  };

  const nextSlot = getNextAvailable();

  return {
    nextSlot,
    hasAvailability: !!nextSlot,
    isLoading,
  };
}