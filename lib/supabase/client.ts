import { createBrowserClient } from "@supabase/ssr";

// ⚡ Add global fetch timeout
const createFetchWithTimeout = (timeoutMs: number = 15000) => {
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
      // ⚡ Add custom fetch with timeout
      fetch: createFetchWithTimeout(5000),
    },
    auth: {
      // ⚡ Reduce timeouts
      flowType: "pkce",
      detectSessionInUrl: false, // Faster initial load
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
