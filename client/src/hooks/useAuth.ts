import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  profileImageUrl?: string;
  avatar_url?: string;
  role?: string;
  approved?: boolean;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isAuthenticated: !!user && !error,
    isLoading,
  };
}