import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to refresh the access token
async function refreshToken(): Promise<boolean> {
  const authData = localStorage.getItem('doktu_auth');
  if (!authData) {
    console.log('No auth data found in localStorage');
    return false;
  }

  try {
    const parsedAuth = JSON.parse(authData);
    const refreshToken = parsedAuth.session?.refresh_token;

    if (!refreshToken) {
      console.log('No refresh token found');
      return false;
    }

    console.log('Attempting to refresh access token...');

    // Use VITE_API_URL for explicit API URL override (e.g., local dev against remote backend)
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = apiUrl ? `${apiUrl}/api/auth/refresh` : '/api/auth/refresh';

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include'
    });

    if (!res.ok) {
      console.error('Token refresh failed:', res.status, res.statusText);
      // Clear invalid auth data
      localStorage.removeItem('doktu_auth');
      return false;
    }

    const data = await res.json();

    // Update localStorage with new tokens
    localStorage.setItem('doktu_auth', JSON.stringify({
      user: data.user,
      session: data.session
    }));

    console.log('Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    localStorage.removeItem('doktu_auth');
    return false;
  }
}

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
  retryCount: number = 0
): Promise<Response> {
  // Use VITE_API_URL for explicit API URL override (e.g., local dev against remote backend)
  // In production, use relative URLs to leverage Vercel proxy (vercel.json rewrites)
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const fullUrl = url.startsWith('/api/') && apiUrl
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

  // If we get a 401 and haven't retried yet, try to refresh the token
  if (res.status === 401 && retryCount === 0) {
    console.log('Got 401, attempting token refresh...');
    const refreshed = await refreshToken();

    if (refreshed) {
      console.log('Token refreshed, retrying request...');
      // Retry the request with the new token (only once)
      return apiRequest(method, url, data, retryCount + 1);
    } else {
      console.log('Token refresh failed, redirecting to login...');
      // Token refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

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
    // Use VITE_API_URL for explicit API URL override (e.g., local dev against remote backend)
    // In production, use relative URLs to leverage Vercel proxy (vercel.json rewrites)
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = url.startsWith('/api/') && apiUrl
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

    // If we get a 401, try to refresh the token
    if (res.status === 401) {
      console.log('Got 401 in query, attempting token refresh...');
      const refreshed = await refreshToken();

      if (refreshed) {
        console.log('Token refreshed, retrying query...');
        // Retry the request with the new token
        const authData = localStorage.getItem('doktu_auth');
        const newToken = authData ? JSON.parse(authData).session?.access_token : null;

        const retryRes = await fetch(fullUrl, {
          credentials: "include",
          headers: {
            ...(newToken ? { "Authorization": `Bearer ${newToken}` } : {}),
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        if (unauthorizedBehavior === "returnNull" && retryRes.status === 401) {
          return null;
        }

        await throwIfResNotOk(retryRes);
        return await retryRes.json();
      } else {
        // Token refresh failed
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

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
