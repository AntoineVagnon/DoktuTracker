import { useQuery } from "@tanstack/react-query";

/**
 * Optimized hook to get only the next available slot for a doctor
 * Used specifically for homepage display to reduce API load
 */
export function useNextSlotOnly(doctorId: string) {
  const { data: slots, isLoading } = useQuery({
    queryKey: ["/api/next-slot", doctorId],
    queryFn: async () => {
      try {
        console.log(`🔍 Fetching next slot only for doctor ${doctorId}`);
        const response = await fetch(`/api/doctors/${doctorId}/slots?nextOnly=true`);
        if (!response.ok) return [];
        const result = await response.json();
        console.log(`📅 Got next slot result for doctor ${doctorId}:`, result);
        return result;
      } catch (error) {
        console.warn("Failed to fetch next slot for doctor", doctorId);
        return [];
      }
    },
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 30 * 1000, // 30 seconds cache to ensure fresh data
    gcTime: 60 * 1000, // 1 minute garbage collection
  });

  const nextSlot = slots && slots.length > 0 ? slots[0] : null;

  return {
    nextSlot,
    hasAvailability: !!nextSlot,
    isLoading,
  };
}