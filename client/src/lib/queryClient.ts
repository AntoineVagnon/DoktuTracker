import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const errorBody = await res.text();
      if (errorBody) {
        // Try to parse as JSON first
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error || errorJson.message || errorBody;
        } catch {
          // If not JSON, use the text directly
          errorMessage = errorBody;
        }
      }
    } catch {
      // If we can't read the body, use status text
    }
    throw new Error(errorMessage || `HTTP ${res.status} error`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use VITE_API_URL if the url starts with /api/
  const apiUrl = import.meta.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';
  const fullUrl = url.startsWith('/api/')
    ? `${apiUrl}${url}`
    : url;

  // Get auth token from localStorage
  const authData = localStorage.getItem('doktu_auth');
  const token = authData ? JSON.parse(authData).session?.access_token : null;

  const res = await fetch(fullUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // Use VITE_API_URL if the url starts with /api/
    const apiUrl = import.meta.env.VITE_API_URL || 'https://web-production-b2ce.up.railway.app';
    const fullUrl = url.startsWith('/api/')
      ? `${apiUrl}${url}`
      : url;

    // Get auth token from localStorage
    const authData = localStorage.getItem('doktu_auth');
    const token = authData ? JSON.parse(authData).session?.access_token : null;

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
