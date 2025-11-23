"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ⚡ AGGRESSIVE CACHING for Vercel
            staleTime: 5 * 60 * 1000, // 5 minutes - keep data fresh
            gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory

            // ⚡ Retry with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 5000),

            // ⚡ Disable unnecessary refetches
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,

            // ⚡ Network mode optimization
            networkMode: "online",

            // ⚡ Placeholders for instant UI (fixed type)
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            retry: 2,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
