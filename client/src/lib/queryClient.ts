// client/src/lib/queryClient.ts
// Shared TanStack Query client instance.
// Configured with sensible defaults for a recipe browser PWA.

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes before considering it stale
      staleTime: 2 * 60 * 1_000,
      // Cache data for 10 minutes even when there are no observers
      gcTime: 10 * 60 * 1_000,
      // Retry once on failure (network blips); disable on 4xx errors below
      retry: 1,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
      // Don't refetch on window focus — the SW handles background sync
      refetchOnWindowFocus: false,
    },
  },
});
