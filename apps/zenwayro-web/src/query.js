import { QueryClient } from 'grainlet/query';
import { shouldRetryFailedQuery } from './api.js';

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        retry: shouldRetryFailedQuery,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
