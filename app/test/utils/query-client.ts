import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a fresh QueryClient for each test.
 * - retry: false — fail fast without retry loops
 * - staleTime / gcTime: Infinity — no background refetches or cache evictions during assertions
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
