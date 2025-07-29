import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  try {
    const savedUser = localStorage.getItem('kitrunner_user');
    console.log('🔍 DEBUG: savedUser from localStorage:', savedUser);
    
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      console.log('🔍 DEBUG: parsed userData:', userData);
      
      if (userData && userData.id && userData.cpf && userData.name) {
        // Create base64 encoded token
        const token = btoa(JSON.stringify(userData));
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔍 DEBUG: Created auth token for user:', userData.name, 'ID:', userData.id);
      } else {
        console.warn('🚨 User data missing required fields:', userData);
      }
    } else {
      console.log('🔍 DEBUG: No user found in localStorage');
    }
  } catch (error) {
    console.warn('Failed to get auth token:', error);
  }
  
  console.log('🔍 DEBUG: Final headers:', headers);
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
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
    const authHeaders = getAuthHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
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
