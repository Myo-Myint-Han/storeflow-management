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
            // ⚡ VERCEL OPTIMIZATION: Keep data cached for 5 minutes
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            
            // ⚡ Don't refetch unnecessarily
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            
            // ⚡ Retry on failure
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
          },
          mutations: {
            retry: 1,
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
