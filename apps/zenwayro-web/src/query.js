import { QueryClient } from 'grainlet/query';
import { shouldRetryFailedQuery } from './api.js';

/** Match TanStack defaults used by the Next.js app — not 0 (0 GC + stale amplifies remount churn). */
const DEFAULT_STALE_MS = 30 * 1000;
const DEFAULT_GC_MS = 5 * 60 * 1000;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_MS,
        gcTime: DEFAULT_GC_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetryFailedQuery,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
