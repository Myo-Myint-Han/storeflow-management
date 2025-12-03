import { createBrowserClient } from "@supabase/ssr";

// 🚀 OPTIMIZED: Longer timeout for international connections
const createFetchWithTimeout = (timeoutMs: number = 10000) => {
  return async (url: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  };
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      // 🚀 OPTIMIZED: 10 second timeout (better for Thailand -> US latency)
      fetch: createFetchWithTimeout(10000),
    },
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      // 🚀 ADD: Store session in localStorage for faster access
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}
