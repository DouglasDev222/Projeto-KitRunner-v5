import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const data = await res.json();
      
      // If the response has a message or error field, use it
      if (data && (data.message || data.error)) {
        const errorMessage = data.message || data.error;
        const error = new Error(errorMessage);
        // Attach the full response data to the error for additional context
        (error as any).responseData = data;
        throw error;
      }
      
      // Otherwise use the whole response as text
      throw new Error(JSON.stringify(data));
    } catch (jsonError) {
      // If it's already an Error from the JSON parsing above, re-throw it
      if (jsonError instanceof Error && jsonError.message !== 'Unexpected end of JSON input') {
        throw jsonError;
      }
      
      // If JSON parsing failed, try to get text from a cloned response
      try {
        const clonedRes = res.clone();
        const text = await clonedRes.text();
        throw new Error(text || res.statusText || `HTTP ${res.status}`);
      } catch (textError) {
        // Final fallback
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    }
  }
}

// Helper function to get auth headers based on request context
function getAuthHeaders(requestUrl?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  try {
    // If it's an admin request, use admin token
    if (requestUrl && requestUrl.includes('/api/admin/')) {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
        return headers;
      }
    }
    
    // For all other requests, use regular user token
    const savedUser = localStorage.getItem('kitrunner_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      
      if (userData && userData.id && userData.cpf && userData.name) {
        // Create base64 encoded token
        const token = btoa(JSON.stringify(userData));
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.warn('Failed to get auth token:', error);
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders(url);
  const headers: Record<string, string> = { ...authHeaders };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
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
    const requestUrl = queryKey[0] as string;
    const authHeaders = getAuthHeaders(requestUrl);
    
    // Build URL properly from queryKey
    let url = queryKey[0] as string;
    
    // If there are additional parameters, add them as query string
    if (queryKey.length > 1 && queryKey[1] && typeof queryKey[1] === 'object') {
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, any>;
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }
    } else if (queryKey.length > 1) {
      // Handle path segments
      url = queryKey.join("/");
    }
    
    const res = await fetch(url, {
      headers: authHeaders,
      credentials: "include",
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
