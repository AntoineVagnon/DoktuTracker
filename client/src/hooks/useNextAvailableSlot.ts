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
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  // Calculate next available slot from the fetched time slots
  const getNextAvailable = () => {
    if (!timeSlots || !Array.isArray(timeSlots)) return null;

    const now = new Date();
    const availableSlots = timeSlots
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