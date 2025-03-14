import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
  const options: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };
  
  try {
    console.log("Sending request with options:", JSON.stringify(options));
    const res = await fetch(url, options);
    console.log(`Response received: ${res.status} ${res.statusText}`);
    
    if (!res.ok) {
      try {
        const errorText = await res.clone().text();
        console.error(`API Error (${res.status}):`, errorText);
      } catch (err) {
        console.error("Could not read error response body");
      }
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error("API Request failed:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Query request: GET ${queryKey[0]}`);
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`Query response: ${res.status} ${res.statusText}`);
      
      if (res.status === 401) {
        console.log(`Unauthorized request to ${queryKey[0]}, behavior: ${unauthorizedBehavior}`);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      
      if (!res.ok) {
        try {
          const errorText = await res.clone().text();
          console.error(`Query Error (${res.status}):`, errorText);
        } catch (err) {
          console.error("Could not read error response body");
        }
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Query data received for ${queryKey[0]}:`, data);
      return data;
    } catch (error) {
      console.error(`Query failed for ${queryKey[0]}:`, error);
      throw error;
    }
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
